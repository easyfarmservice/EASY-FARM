import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDeliveryOtp, hashDeliveryOtp, getDeliveryOtpExpiry } from '@/lib/delivery-otp';
import { sendDeliveryOTP } from '@/lib/msg91';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';

// In-memory cooldown tracker to prevent rapid-fire SMS spam per order (30s cooldown)
const resendCooldowns = new Map<string, number>();

export async function POST(req: NextRequest) {
  // 1. IP rate limit check
  const rateLimit = checkRateLimit(req, 20, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  // 2. Admin Authorization check
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

    // 3. Fetch order
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        delivery_otp_hash,
        otp_created_at,
        otp_verified,
        profiles(id, full_name, phone)
      `);

    if (rawOrderId.startsWith('ORD-')) {
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

    // 4. Validate order status must be out_for_delivery
    if (order.status !== 'out_for_delivery') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Cannot resend OTP. Order status is "${order.status}". Resend is only available when Out for Delivery.`,
        },
        { status: 400 }
      );
    }

    // 5. Cooldown check: 30 seconds cooldown between resend attempts for the same order
    const lastSentTime = resendCooldowns.get(order.id) || 0;
    const now = Date.now();
    const elapsed = now - lastSentTime;
    const COOLDOWN_MS = 30 * 1000;

    if (elapsed < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'COOLDOWN_ACTIVE',
          message: `Please wait ${remainingSec} second(s) before requesting another OTP SMS.`,
          retryAfter: remainingSec,
        },
        { status: 429 }
      );
    }

    // 6. Verify customer phone
    const customerPhone = (order.profiles as any)?.phone || '';

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: 'MISSING_CUSTOMER_PHONE', message: 'Customer phone number not available.' },
        { status: 400 }
      );
    }

    // 7. Generate new secure 4-digit OTP & Hash
    const newOtp = generateDeliveryOtp();
    const newHash = hashDeliveryOtp(newOtp);
    const newExpiresAt = getDeliveryOtpExpiry();
    const adminName = auth.profile?.full_name || auth.user?.email || 'Founder / Admin';

    // 8. Overwrite hash in database, reset attempts to 0, reset timestamps
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        delivery_otp_hash: newHash,
        otp_created_at: new Date().toISOString(),
        otp_expires_at: newExpiresAt,
        otp_verified: false,
        otp_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: updateErr.message },
        { status: 500 }
      );
    }

    // Record cooldown timestamp
    resendCooldowns.set(order.id, Date.now());

    // 9. Dispatch new OTP to MSG91
    const smsResult = await sendDeliveryOTP({
      mobile: customerPhone,
      otp: newOtp,
      orderId: `EF-${order.id.slice(0, 6).toUpperCase()}`,
    });

    // 10. Record audit log DELIVERY_OTP_RESENT (WITHOUT plaintext OTP or hash)
    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName,
      action: 'DELIVERY_OTP_RESENT',
      orderId: order.id,
      details: {
        customer_name: (order.profiles as any)?.full_name,
        masked_phone: customerPhone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2'),
        gateway: 'MSG91',
        simulated: smsResult.simulated || false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'New delivery OTP generated and sent to customer.',
      order_id: order.id,
      expires_at: newExpiresAt,
      sms_simulated: smsResult.simulated || false,
    });
  } catch (err: any) {
    console.error('[ResendOTP] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
