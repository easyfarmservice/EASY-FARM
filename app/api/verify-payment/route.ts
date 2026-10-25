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

    // Optional: Update matching order record in database if found
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'confirmed',
          notes: `Paid via Razorpay. Payment ID: ${paymentId}`,
        })
        .or(`id.eq.${orderId},notes.ilike.%${orderId}%`);
    } catch (dbErr) {
      // Non-blocking database update
      console.warn('[Razorpay Verify] Optional DB order update notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
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
