import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('[Razorpay Create Order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
      return NextResponse.json(
        { error: 'Razorpay credentials not configured on server' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { amount, currency = 'INR', receipt } = body;

    const numericAmount = Number(amount);

    // Validate minimum amount: 100 paise (₹1)
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount must be at least 100 paise (₹1).' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const orderOptions = {
      amount: Math.round(numericAmount),
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      id: order.id, // compatibility alias
    });
  } catch (err: any) {
    console.error('[Razorpay Create Order Error]:', err);
    const status = err.statusCode || err.status || 500;
    return NextResponse.json(
      { error: err.error?.description || err.message || 'Razorpay order creation failed' },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
