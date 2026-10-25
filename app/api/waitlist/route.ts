import { NextResponse } from 'next/server';
import { WaitlistSchema } from '@/schemas';
import { WaitlistService } from '@/services/waitlist.service';
import { EmailService } from '@/services/email.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = WaitlistSchema.parse(body);

    const result = await WaitlistService.addEntry(validated);

    // Send welcome email via Resend API
    try {
      await EmailService.sendWaitlistConfirmation({
        toEmail: validated.email,
        name: validated.name,
        locality: validated.locality || validated.pincode,
      });
    } catch (emailErr) {
      console.error('Waitlist confirmation email failed:', emailErr);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit waitlist' },
      { status: 400 }
    );
  }
}

