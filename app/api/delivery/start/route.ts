import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDeliveryOtp, hashDeliveryOtp, getDeliveryOtpExpiry } from '@/lib/delivery-otp';
import { sendDeliveryOTP } from '@/lib/msg91';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';

export async function POST(req: NextRequest) {
  // 1. Rate limiting check (max 30 requests/minute per IP)
  const rateLimit = checkRateLimit(req, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  // 2. Server-side Admin Authorization Verification
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return (
      auth.response ||
      NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Admin delivery authorization required.' },
        { status: 403 }
      )
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawOrderId = body.order_id || body.orderId;

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 3. Fetch order with customer details
    // Support either full UUID or 'ORD-XXXXXX'
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        total,
        delivery_date,
        delivery_otp_hash,
        otp_verified,
        otp_created_at,
        profiles(id, full_name, phone, email),
        customer_addresses(full_address, apartment, locality)
      `);

    if (rawOrderId.startsWith('ORD-')) {
      // Find matching UUID prefix
      const prefix = rawOrderId.replace('ORD-', '').toLowerCase();
      const { data: allOrders } = await supabase.from('orders').select('id');
      const matched = allOrders?.find((o) => o.id.slice(0, 6).toLowerCase() === prefix);
      if (matched) {
        query = query.eq('id', matched.id);
      } else {
        query = query.eq('id', rawOrderId);
      }
    } else {
      query = query.eq('id', rawOrderId);
    }

    const { data: order, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: `Order ${rawOrderId} not found.` },
        { status: 404 }
      );
    }

    // 4. Validate allowed order status
    if (order.status === 'delivered') {
      return NextResponse.json(
        { success: false, error: 'ALREADY_DELIVERED', message: 'This order is already marked as delivered.' },
        { status: 400 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'ORDER_CANCELLED', message: 'Cannot deliver a cancelled order.' },
        { status: 400 }
      );
    }

    // 5. Verify customer mobile number
    const customerPhone = (order.profiles as any)?.phone || '';

    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_CUSTOMER_PHONE',
          message: 'Customer does not have a registered mobile number for OTP dispatch.',
        },
        { status: 400 }
      );
    }

    // 6. Generate cryptographically secure 4-digit OTP (1000 - 9999)
    const plainOtp = generateDeliveryOtp();

    // 7. Hash OTP using secure HMAC-SHA256 (Never store plaintext)
    const otpHash = hashDeliveryOtp(plainOtp);
    const otpExpiresAt = getDeliveryOtpExpiry();
    const adminName = auth.profile?.full_name || auth.user?.email || 'Founder / Admin';

    // 8. Atomic database update
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'out_for_delivery',
        delivery_otp_hash: otpHash,
        otp_created_at: new Date().toISOString(),
        otp_expires_at: otpExpiresAt,
        otp_verified: false,
        otp_attempts: 0,
        delivery_person_type: 'FOUNDER',
        delivery_person_name: adminName,
        delivery_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error('[StartDelivery] DB update failed:', updateErr);
      return NextResponse.json(
        { success: false, error: 'DB_UPDATE_FAILED', message: updateErr.message },
        { status: 500 }
      );
    }

    // 9. Dispatch OTP to customer mobile via MSG91
    const smsResult = await sendDeliveryOTP({
      mobile: customerPhone,
      otp: plainOtp,
      orderId: `EF-${order.id.slice(0, 6).toUpperCase()}`,
    });

    // 10. Record immutable audit logs (WITHOUT plaintext OTP or hash)
    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName,
      action: 'DELIVERY_STARTED',
      orderId: order.id,
      details: {
        customer_name: (order.profiles as any)?.full_name,
        masked_phone: customerPhone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2'),
        status: 'out_for_delivery',
        delivery_person: 'FOUNDER',
      },
    });

    if (smsResult.success) {
      await recordDeliveryAuditLog({
        adminId: auth.user?.id,
        adminName,
        action: 'DELIVERY_OTP_SENT',
        orderId: order.id,
        details: {
          gateway: 'MSG91',
          simulated: smsResult.simulated || false,
        },
      });
    } else {
      await recordDeliveryAuditLog({
        adminId: auth.user?.id,
        adminName,
        action: 'DELIVERY_OTP_FAILED',
        orderId: order.id,
        details: {
          gateway_error: smsResult.error,
        },
      });
    }

    // 11. Return response (Plaintext OTP is NEVER returned to client)
    return NextResponse.json({
      success: true,
      message: 'Delivery started and 4-digit OTP dispatched to customer.',
      order_id: order.id,
      status: 'out_for_delivery',
      expires_at: otpExpiresAt,
      sms_simulated: smsResult.simulated || false,
    });
  } catch (err: any) {
    console.error('[StartDelivery] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
