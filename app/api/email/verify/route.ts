import { NextResponse } from 'next/server';
import { isResendConfigured } from '@/lib/resend';

export async function GET() {
  const configured = isResendConfigured();
  const apiKey = process.env.RESEND_API_KEY || '';

  const maskedKey = apiKey.length > 8
    ? `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`
    : 'Not configured';

  return NextResponse.json({
    active: configured,
    keyMasked: maskedKey,
    status: configured ? 'Resend API Key active and ready' : 'Resend API Key missing or placeholder in .env.local',
  });
}
