import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { placeId } = await req.json();

    if (!placeId) {
      return NextResponse.json({ success: false, error: 'Missing placeId' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: err.error?.message || 'Place details error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      placeId: data.id,
      name: data.displayName?.text || '',
      formattedAddress: data.formattedAddress || '',
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      addressComponents: data.addressComponents || [],
    });
  } catch (err: any) {
    console.error('Place details API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
