import { NextResponse } from 'next/server';
import { LocationCheckSchema } from '@/schemas';
import { DeliveryService } from '@/services/delivery.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = LocationCheckSchema.parse(body);

    let result;
    if (validated.latitude !== undefined && validated.longitude !== undefined) {
      result = await DeliveryService.checkAvailability(validated.latitude, validated.longitude);
    } else if (validated.pincode) {
      result = await DeliveryService.checkAvailabilityByPincode(validated.pincode);
    } else {
      return NextResponse.json(
        { available: false, error: 'Provide valid coordinates or PIN code' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/delivery/check error:', err);
    return NextResponse.json(
      { available: false, error: err.message || 'Invalid input coordinates' },
      { status: 400 }
    );
  }
}
