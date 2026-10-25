import { NextResponse } from 'next/server';
import { EmailService } from '@/services/email.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, ...params } = body;

    if (type === 'order_confirmation') {
      const result = await EmailService.sendOrderConfirmation(params);
      return NextResponse.json(result);
    }

    if (type === 'account_confirmation') {
      const result = await EmailService.sendAccountConfirmation(params);
      return NextResponse.json(result);
    }

    if (type === 'waitlist') {
      const result = await EmailService.sendWaitlistConfirmation(params);
      return NextResponse.json(result);
    }

    if (type === 'password_reset') {
      const result = await EmailService.sendPasswordResetEmail(params);
      return NextResponse.json(result);
    }

    if (type === 'login_alert') {
      const result = await EmailService.sendLoginNotification(params);
      return NextResponse.json(result);
    }

    if (type === 'stay_activated') {
      const result = await EmailService.sendStayActivatedEmail(params);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid email type specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Email dispatch failed' }, { status: 500 });
  }
}
