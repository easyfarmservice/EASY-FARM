import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDeliveryOtp, hashDeliveryOtp, getDeliveryOtpExpiry } from '@/lib/delivery-otp';
import { sendDeliveryOTP } from '@/lib/msg91';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';
import { EmailService } from '@/services/email.service';

// In-memory cooldown tracker to prevent rapid-fire SMS/Email spam per order (15s cooldown)
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
    const rawOrderId = String(body.order_id || body.orderId || '').trim();

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 3. Fetch order with notes and customer details
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        notes,
        delivery_otp_hash,
        otp_created_at,
        otp_verified,
        profiles(id, full_name, phone, email),
        customer_addresses(full_address, apartment, locality)
      `);

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

    // 5. Cooldown check: 15 seconds cooldown between resend attempts
    const lastSentTime = resendCooldowns.get(order.id) || 0;
    const now = Date.now();
    const elapsed = now - lastSentTime;
    const COOLDOWN_MS = 15 * 1000;

    if (elapsed < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'COOLDOWN_ACTIVE',
          message: `Please wait ${remainingSec} second(s) before requesting another OTP.`,
          retryAfter: remainingSec,
        },
        { status: 429 }
      );
    }

    // 6. Extract customer details
    let meta: any = null;
    if (order.notes) {
      try {
        if (order.notes.startsWith('{')) meta = JSON.parse(order.notes);
      } catch {}
    }

    const customerEmail = meta?.customerEmail || (order.profiles as any)?.email || '';
    const customerPhone = meta?.customerPhone || (order.profiles as any)?.phone || '';
    const customerName = meta?.customerName || (order.profiles as any)?.full_name || 'Resident';
    const deliveryAddress =
      meta?.fullAddress ||
      (order.customer_addresses as any)?.full_address ||
      [(order.customer_addresses as any)?.apartment, (order.customer_addresses as any)?.locality]
        .filter(Boolean)
        .join(', ') ||
      'Ghatkesar & Pocharam Corridor';

    const displayOrderId = meta?.orderNumber || `EF${order.id.slice(0, 4).toUpperCase()}`;

    // 7. Generate new secure 4-digit OTP & Hash
    const newOtp = generateDeliveryOtp();
    const newHash = hashDeliveryOtp(newOtp);
    const newExpiresAt = getDeliveryOtpExpiry();

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

    resendCooldowns.set(order.id, Date.now());

    // 9. Dispatch new OTP to Email
    let emailSent = false;
    if (customerEmail) {
      try {
        const emailRes = await EmailService.sendDeliveryOtpEmail({
          toEmail: customerEmail,
          recipientName: customerName,
          orderId: displayOrderId,
          otp: newOtp,
          deliveryAddress,
        });
        emailSent = emailRes.success;
      } catch (e) {
        console.error('[ResendOTP] Email error:', e);
      }
    }

    // 10. Dispatch new OTP to SMS if mobile exists
    let smsResult: any = { success: false, simulated: true };
    if (customerPhone) {
      try {
        smsResult = await sendDeliveryOTP({
          mobile: customerPhone,
          otp: newOtp,
          orderId: displayOrderId,
        });
      } catch (e) {}
    }

    const destinationNotice = customerEmail ? `sent to ${customerEmail}` : `sent via SMS`;
    return NextResponse.json({
      success: true,
      message: `Fresh 4-digit OTP generated and ${destinationNotice}.`,
      order_id: order.id,
      customer_email: customerEmail,
      email_sent: emailSent,
      expires_at: newExpiresAt,
      sms_simulated: smsResult.simulated || false,
      test_otp: newOtp,
    });
  } catch (err: any) {
    console.error('[ResendOTP] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
