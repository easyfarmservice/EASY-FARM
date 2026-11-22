import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyDeliveryOtpHash, resolveOrderCustomer } from '@/lib/delivery-otp';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';
import { EmailService } from '@/services/email.service';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function POST(req: NextRequest) {
  // 1. Rate limiting check (max 30 verify attempts per minute)
  const rateLimit = checkRateLimit(req, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many verification attempts. Please wait.' },
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
    const submittedOtp = String(body.otp || '').trim();
    const explicitEmail = String(body.email || body.customer_email || body.customerEmail || '').trim().toLowerCase();

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    if (!submittedOtp || submittedOtp.length !== 4) {
      return NextResponse.json(
        { success: false, error: 'INVALID_FORMAT', message: 'Please enter a valid 4-digit numeric OTP.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 3. Fetch order
    let query = supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        status,
        notes,
        delivery_otp_hash,
        otp_created_at,
        otp_expires_at,
        otp_verified,
        otp_attempts,
        delivered_at,
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

    // 4. Confirm order status is OUT_FOR_DELIVERY
    if (order.status !== 'out_for_delivery') {
      if (order.status === 'delivered') {
        return NextResponse.json(
          { success: false, error: 'ALREADY_DELIVERED', message: 'This order has already been verified and delivered.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: `Cannot verify OTP. Order status is currently "${order.status}". Delivery must be started first.`,
        },
        { status: 400 }
      );
    }

    // 5. Confirm otp_verified is false
    if (order.otp_verified) {
      return NextResponse.json(
        { success: false, error: 'OTP_ALREADY_USED', message: 'This OTP has already been verified.' },
        { status: 400 }
      );
    }

    // 6. Confirm OTP hash exists
    if (!order.delivery_otp_hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_OTP_GENERATED',
          message: 'No delivery OTP was generated for this order. Please click "Start Delivery".',
        },
        { status: 400 }
      );
    }

    // 7. Check max attempts (maximum 5 attempts)
    const currentAttempts = order.otp_attempts || 0;
    if (currentAttempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Maximum OTP attempts (5) exceeded. For security, please click "Resend OTP" to issue a new code.',
        },
        { status: 400 }
      );
    }

    // 8. Confirm OTP validity (OTP remains active and valid until verified by delivery partner at doorstep)
    const now = Date.now();
    if (order.otp_expires_at) {
      const expiresAt = new Date(order.otp_expires_at).getTime();
      const maxExpiry = Math.max(expiresAt, new Date(order.otp_created_at || now).getTime() + 48 * 60 * 60 * 1000);
      if (now > maxExpiry) {
        await recordDeliveryAuditLog({
          adminId: auth.user?.id,
          adminName: auth.profile?.full_name || auth.user?.email,
          action: 'DELIVERY_OTP_EXPIRED',
          orderId: order.id,
          details: { expired_at: order.otp_expires_at },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'OTP_EXPIRED',
            message: 'The delivery OTP has expired. Please click "Resend OTP" to generate a fresh code.',
          },
          { status: 400 }
        );
      }
    }

    // 9. Constant-time verification of submitted OTP against stored hash or stored meta OTP
    let meta: any = null;
    if (order.notes) {
      try {
        if (order.notes.startsWith('{')) meta = JSON.parse(order.notes);
      } catch {}
    }

    const cleanSubmittedOtp = String(submittedOtp || '').replace(/\D/g, '').trim();
    const isHashValid = verifyDeliveryOtpHash(cleanSubmittedOtp, order.delivery_otp_hash);
    const isMetaValid = Boolean(meta?.deliveryOtp && String(meta.deliveryOtp).replace(/\D/g, '').trim() === cleanSubmittedOtp);
    const isValid = isHashValid || isMetaValid;

    if (!isValid) {
      const newAttempts = currentAttempts + 1;

      // Update attempt count in database
      await supabase
        .from('orders')
        .update({
          otp_attempts: newAttempts,
          otp_last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Record failed verification in audit logs
      await recordDeliveryAuditLog({
        adminId: auth.user?.id,
        adminName: auth.profile?.full_name || auth.user?.email,
        action: 'DELIVERY_OTP_VERIFICATION_FAILED',
        orderId: order.id,
        details: {
          attempt_number: newAttempts,
          remaining_attempts: Math.max(0, 5 - newAttempts),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_OTP',
          message:
            newAttempts >= 5
              ? 'Incorrect OTP. Maximum attempts reached. Please click "Resend OTP".'
              : `Incorrect OTP. You have ${5 - newAttempts} attempt(s) remaining.`,
          attemptsRemaining: Math.max(0, 5 - newAttempts),
        },
        { status: 400 }
      );
    }

    // 10. Correct OTP! Execute ATOMIC update
    // Update ONLY IF status = 'out_for_delivery' AND otp_verified = false (prevents double verification)
    const deliveredAt = new Date().toISOString();
    const adminName = auth.profile?.full_name || auth.user?.email || 'Founder / Admin';

    const { data: updatedRows, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        otp_verified: true,
        delivered_at: deliveredAt,
        updated_at: deliveredAt,
      })
      .eq('id', order.id)
      .eq('status', 'out_for_delivery')
      .eq('otp_verified', false)
      .select('id');

    if (updateErr) {
      console.error('[VerifyOTP] Atomic DB update failed:', updateErr);
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: updateErr.message },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONCURRENT_UPDATE',
          message: 'Order was already verified or status changed by another session.',
        },
        { status: 409 }
      );
    }

    // 11. Record immutable audit log for DELIVERY_VERIFIED
    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName,
      action: 'DELIVERY_VERIFIED',
      orderId: order.id,
      details: {
        customer_name: (order.profiles as any)?.full_name,
        delivered_at: deliveredAt,
        delivery_person: 'FOUNDER',
      },
    });

    // 11.1. Award Weekly Streak stamp & check milestone unlocks
    try {
      await WeeklyStreakService.processDeliveredOrder(order.id);
    } catch (streakErr) {
      console.error('[VerifyOTP] Error awarding weekly streak stamp:', streakErr);
    }

    // 12. Dispatch "Order Delivered" confirmation email strictly to customer registered email via Resend
    if (!meta && order.notes) {
      try {
        if (order.notes.startsWith('{')) meta = JSON.parse(order.notes);
      } catch {}
    }

    const customer = await resolveOrderCustomer(supabase, order, meta);

    const isValidEmail = (e?: string | null): boolean => {
      if (!e || typeof e !== 'string') return false;
      const clean = e.trim().toLowerCase();
      return clean.includes('@') && clean.length > 5 && !clean.endsWith('@guest.easyfarm.in');
    };

    const customerEmail =
      (isValidEmail(explicitEmail) ? explicitEmail : '') ||
      (isValidEmail(customer.customerEmail) ? customer.customerEmail : '') ||
      (isValidEmail(meta?.customerEmail) ? meta.customerEmail : '') ||
      (isValidEmail(meta?.email) ? meta.email : '') ||
      '';

    const customerName = customer.customerName || meta?.customerName || 'Valued Resident';
    const displayOrderId = customer.orderNumber || meta?.orderNumber || `EF${order.id.slice(0, 4).toUpperCase()}`;
    const deliveryAddress = customer.fullAddress || meta?.fullAddress || 'Ghatkesar & Pocharam, Hyderabad';

    // Persist verified customer email into order notes if missing so future reads are permanent
    if (customerEmail && (!meta?.customerEmail || meta.customerEmail !== customerEmail)) {
      meta = { ...(meta || {}), customerEmail };
      try {
        await supabase.from('orders').update({ notes: JSON.stringify(meta) }).eq('id', order.id);
      } catch (persistErr) {
        console.warn('[VerifyOTP] Note persistence notice:', persistErr);
      }
    }

    let deliveryEmailSent = false;
    let deliveryEmailError = null;

    if (customerEmail) {
      try {
        console.log(`[VerifyOTP] Dispatching delivery completed confirmation email to: ${customerEmail} for order: ${displayOrderId}`);
        const emailRes = await EmailService.sendOrderDeliveredEmail({
          toEmail: customerEmail,
          recipientName: customerName,
          orderId: displayOrderId,
          deliveryAddress,
          deliveredAt: new Date(deliveredAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
        deliveryEmailSent = Boolean(emailRes.success);
        if (!emailRes.success) {
          deliveryEmailError = (emailRes as any).error || (emailRes as any).reason || 'Email dispatch failed';
          console.warn('[VerifyOTP] Delivery email failed:', deliveryEmailError);
        }
      } catch (emailErr: any) {
        deliveryEmailError = emailErr.message;
        console.error('[VerifyOTP] Error sending delivery confirmation email:', emailErr);
      }
    } else {
      console.warn(`[VerifyOTP] No registered customer email found for order ${order.id}. Skipping completion email.`);
    }

    if (customerEmail) {
      await recordDeliveryAuditLog({
        adminId: auth.user?.id,
        adminName,
        action: deliveryEmailSent ? 'DELIVERY_COMPLETED_EMAIL_SENT' : 'DELIVERY_COMPLETED_EMAIL_FAILED',
        orderId: order.id,
        details: {
          recipient: customerEmail,
          email_sent: deliveryEmailSent,
          error: deliveryEmailError,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: deliveryEmailSent
        ? `Delivery verified successfully and confirmation receipt emailed to ${customerEmail}.`
        : customerEmail
        ? `Delivery verified in database. Email notice: ${deliveryEmailError || 'Dispatch failed'}`
        : 'Delivery verified successfully in database.',
      order_id: order.id,
      delivered_at: deliveredAt,
      status: 'delivered',
      delivery_email_sent: deliveryEmailSent,
      delivery_email_error: deliveryEmailError,
      customer_email: customerEmail,
    });
  } catch (err: any) {
    console.error('[VerifyOTP] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
