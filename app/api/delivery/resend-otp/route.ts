import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateDeliveryOtp,
  hashDeliveryOtp,
  getDeliveryOtpExpiry,
  resolveOrderCustomer,
} from '@/lib/delivery-otp';
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
        customer_id,
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

    // 4. Validate order status: allow confirmed, ready_for_delivery, packed, out_for_delivery
    if (order.status === 'delivered') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: 'This order is already marked as delivered.',
        },
        { status: 400 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: 'Cannot send OTP for a cancelled order.',
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

    // 6. Extract customer details via robust resolver (notes, profiles, and auth.users)
    let meta: any = null;
    if (order.notes) {
      try {
        if (order.notes.startsWith('{')) meta = JSON.parse(order.notes);
      } catch { }
    }

    const customer = await resolveOrderCustomer(supabase, order, meta);
    const customerEmail = (customer.customerEmail || String(body.email || body.customer_email || '')).trim().toLowerCase();
    const customerPhone = customer.customerPhone;
    const customerName = customer.customerName;
    const deliveryAddress = customer.fullAddress;
    const displayOrderId = customer.orderNumber;

    if (!customerEmail && !customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_REGISTERED_CONTACT',
          message: `Order #${rawOrderId} has no registered customer email or phone number.`,
        },
        { status: 400 }
      );
    }

    // 7. Generate new secure 4-digit OTP & Hash
    const newOtp = generateDeliveryOtp();
    const newHash = hashDeliveryOtp(newOtp);
    const newExpiresAt = getDeliveryOtpExpiry();

    // 8. Overwrite hash in database, reset attempts to 0, save resolved customer details
    meta = {
      ...(meta || {}),
      deliveryOtp: newOtp,
      customerEmail: customerEmail || meta?.customerEmail,
      customerName: customerName || meta?.customerName,
      customerPhone: customerPhone || meta?.customerPhone,
    };
    const newStatus = order.status === 'out_for_delivery' ? order.status : 'out_for_delivery';
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        delivery_assigned_at: (order as any).delivery_assigned_at || new Date().toISOString(),
        delivery_otp_hash: newHash,
        otp_created_at: new Date().toISOString(),
        otp_expires_at: newExpiresAt,
        otp_verified: false,
        otp_attempts: 0,
        notes: JSON.stringify(meta),
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

    // 9. Dispatch new OTP to Email (strictly for this single customer)
    let emailResult: any = { success: false, error: '' };
    if (customerEmail) {
      try {
        console.log(`[ResendOTP] Resending 4-digit OTP strictly for Order ${order.id} to recipient: ${customerEmail}`);
        emailResult = await EmailService.sendDeliveryOtpEmail({
          toEmail: customerEmail,
          recipientName: customerName,
          orderId: displayOrderId,
          otp: newOtp,
          deliveryAddress,
        });
      } catch (e: any) {
        console.error('[ResendOTP] Email error:', e);
        emailResult = { success: false, error: e.message };
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
      } catch (e: any) {
        smsResult = { success: false, error: e.message };
      }
    }

    // 11. Record audit logs
    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName: auth.profile?.full_name || auth.user?.email || 'Admin',
      action: 'DELIVERY_OTP_SENT',
      orderId: order.id,
      details: {
        action: 'RESEND_OTP',
        channel: customerEmail ? 'EMAIL' : 'SMS',
        recipient: customerEmail || customerPhone,
        email_sent: Boolean(emailResult.success),
        email_error: emailResult.success ? null : (emailResult.error || null),
        sms_sent: Boolean(smsResult.success),
      },
    });

    const isSuccess = Boolean(emailResult.success || smsResult.success);
    const destinationNotice = emailResult.success
      ? `sent to customer registered email (${customerEmail})`
      : customerEmail
      ? `generated (Email dispatch notice: ${emailResult.error || 'Check sender configuration'})`
      : `sent via SMS`;

    return NextResponse.json({
      success: isSuccess,
      message: `Fresh 4-digit Handover OTP generated and ${destinationNotice}.`,
      order_id: order.id,
      customer_email: customerEmail,
      email_sent: Boolean(emailResult.success),
      email_error: emailResult.success ? null : (emailResult.error || 'Email dispatch failed'),
      delivery_otp: newOtp,
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
