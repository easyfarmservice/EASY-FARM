import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDeliveryOtp, hashDeliveryOtp, getDeliveryOtpExpiry } from '@/lib/delivery-otp';
import { sendDeliveryOTP } from '@/lib/msg91';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';
import { EmailService } from '@/services/email.service';

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
    const rawOrderId = String(body.order_id || body.orderId || '').trim();

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 3. Fetch order with customer details & notes
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        total,
        delivery_date,
        notes,
        delivery_otp_hash,
        otp_verified,
        otp_created_at,
        profiles(id, full_name, phone, email),
        customer_addresses(full_address, apartment, locality)
      `);

    // Flexible order ID matching (UUID, ORD-XXXX, EFXXXX)
    if (rawOrderId.startsWith('ORD-') || rawOrderId.startsWith('EF')) {
      const cleanPrefix = rawOrderId.replace(/^(ORD-|EF-?)/i, '').toLowerCase();
      const { data: allOrders } = await supabase.from('orders').select('id');
      const matched = allOrders?.find(
        (o) =>
          o.id.toLowerCase().startsWith(cleanPrefix) ||
          o.id.slice(0, 4).toLowerCase() === cleanPrefix ||
          o.id.slice(0, 6).toLowerCase() === cleanPrefix
      );
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

    // 5. Parse customer details from notes metadata or relational tables
    let meta: any = null;
    if (order.notes) {
      try {
        if (order.notes.startsWith('{')) {
          meta = JSON.parse(order.notes);
        }
      } catch {}
    }

    const customerEmail =
      meta?.customerEmail ||
      (order.profiles as any)?.email ||
      '';

    const customerPhone =
      meta?.customerPhone ||
      (order.profiles as any)?.phone ||
      '';

    const customerName =
      meta?.customerName ||
      (order.profiles as any)?.full_name ||
      'Valued Resident';

    const deliveryAddress =
      meta?.fullAddress ||
      (order.customer_addresses as any)?.full_address ||
      [(order.customer_addresses as any)?.apartment, (order.customer_addresses as any)?.locality]
        .filter(Boolean)
        .join(', ') ||
      'Ghatkesar & Pocharam Corridor';

    const displayOrderId =
      meta?.orderNumber || `EF${order.id.slice(0, 4).toUpperCase()}`;

    if (!customerEmail && !customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_CONTACT',
          message: 'Customer email or phone number is required to send delivery OTP.',
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

    // 9. Dispatch OTP to customer EMAIL via Resend
    let emailResult: any = { success: false, error: '' };
    if (customerEmail) {
      try {
        emailResult = await EmailService.sendDeliveryOtpEmail({
          toEmail: customerEmail,
          recipientName: customerName,
          orderId: displayOrderId,
          otp: plainOtp,
          deliveryAddress,
        });
      } catch (e: any) {
        console.error('[StartDelivery] Email dispatch error:', e);
        emailResult = { success: false, error: e.message };
      }
    }

    // 10. Also dispatch via SMS if phone is present
    let smsResult: any = { success: false, simulated: true };
    if (customerPhone) {
      try {
        smsResult = await sendDeliveryOTP({
          mobile: customerPhone,
          otp: plainOtp,
          orderId: displayOrderId,
        });
      } catch (e: any) {
        smsResult = { success: false, error: e.message };
      }
    }

    // 11. Record immutable audit logs
    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName,
      action: 'DELIVERY_STARTED',
      orderId: order.id,
      details: {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: 'out_for_delivery',
        email_sent: emailResult.success,
        sms_sent: smsResult.success,
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

    // 12. Return response
    const destinationNotice = customerEmail ? `sent to ${customerEmail}` : `sent via SMS to ${customerPhone}`;
    return NextResponse.json({
      success: true,
      message: `Delivery started! 4-digit OTP generated and ${destinationNotice}.`,
      order_id: order.id,
      status: 'out_for_delivery',
      expires_at: otpExpiresAt,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      email_sent: emailResult.success,
      sms_simulated: smsResult.simulated || false,
      test_otp: plainOtp,
    });
  } catch (err: any) {
    console.error('[StartDelivery] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
