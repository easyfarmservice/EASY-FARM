import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error('[Razorpay Verify] Missing RAZORPAY_KEY_SECRET');
      return NextResponse.json(
        { success: false, error: 'Razorpay secret key not configured on server' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = body.razorpay_order_id || body.order_id;
    const paymentId = body.razorpay_payment_id || body.payment_id;
    const signature = body.razorpay_signature || body.signature;

    // Validate missing fields
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: order_id, payment_id, and signature are required',
        },
        { status: 400 }
      );
    }

    // Generate expected HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const expectedSignature = hmac.digest('hex');

    // Constant-time string comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    const isValid =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isValid) {
      console.warn('[Razorpay Verify] Signature mismatch for order:', orderId);
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: Invalid signature',
        },
        { status: 400 }
      );
    }

    const appOrderId = body.app_order_id || body.appOrderId;

    // Update order and payment records in database
    try {
      const supabaseAdmin = createAdminClient();

      // 1. Look up payment by Razorpay order ID
      const { data: payRow } = await supabaseAdmin
        .from('payments')
        .select('id, order_id')
        .eq('provider_order_id', orderId)
        .maybeSingle();

      let targetDbOrderId = payRow?.order_id || null;

      // Update payments record to captured
      if (payRow?.id) {
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'captured',
            provider_payment_id: paymentId,
            signature,
            method: 'razorpay',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payRow.id);
      }

      // If targetDbOrderId not found, check orders by notes
      if (!targetDbOrderId && appOrderId) {
        const { data: ordByNotes } = await supabaseAdmin
          .from('orders')
          .select('id, notes')
          .ilike('notes', `%${appOrderId}%`)
          .maybeSingle();
        if (ordByNotes?.id) targetDbOrderId = ordByNotes.id;
      }

      // 2. Mark order as confirmed in database with exact server-side confirmation timestamp
      const confirmedAt = new Date().toISOString();
      const targetQuery = targetDbOrderId
        ? supabaseAdmin.from('orders').select('id, notes').eq('id', targetDbOrderId).maybeSingle()
        : supabaseAdmin.from('orders').select('id, notes').ilike('notes', `%${orderId}%`).maybeSingle();

      const { data: ordRecord } = await targetQuery;
      let orderNotes: any = {};
      if (ordRecord?.notes) {
        try {
          if (ordRecord.notes.startsWith('{')) orderNotes = JSON.parse(ordRecord.notes);
          else orderNotes = { originalNotes: ordRecord.notes };
        } catch {
          orderNotes = { originalNotes: ordRecord.notes };
        }
      }
      orderNotes.timeline = {
        ...(orderNotes.timeline || {}),
        confirmed_at: confirmedAt,
      };

      if (ordRecord?.id) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'confirmed',
            updated_at: confirmedAt,
            notes: JSON.stringify(orderNotes),
          })
          .eq('id', ordRecord.id);
      }
    } catch (dbErr) {
      console.warn('[Razorpay Verify] Order status update warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (err: any) {
    console.error('[Razorpay Verify Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error verifying payment signature' },
      { status: 500 }
    );
  }
}
