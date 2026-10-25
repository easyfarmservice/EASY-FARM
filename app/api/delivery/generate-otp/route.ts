import { NextRequest } from 'next/server';
import { POST as startDelivery } from '../start/route';

/**
 * Section 15: POST /api/delivery/generate-otp
 * Dedicated alias endpoint for generating OTP and marking order out for delivery.
 */
export async function POST(req: NextRequest) {
  return startDelivery(req);
}
