import { NextRequest, NextResponse } from 'next/server';

interface AutocompletePrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  description: string;
  lat?: number;
  lng?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { query, latitude = 17.4475, longitude = 78.6534 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Call Google Places API (New)
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: query.trim(),
        includedRegionCodes: ['in'],
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: 25000.0, // 25 km around Ghatkesar corridor
          },
        },
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errData.error?.message || 'Places API error' },
        { status: res.status }
      );
    }

    const data = await res.json();
    const suggestions = data.suggestions || [];

    // Map predictions
    const predictions: AutocompletePrediction[] = [];

    for (const item of suggestions.slice(0, 8)) {
      const p = item.placePrediction;
      if (p) {
        predictions.push({
          placeId: p.placeId,
          primaryText: p.structuredFormat?.mainText?.text || p.text?.text || '',
          secondaryText: p.structuredFormat?.secondaryText?.text || '',
          description: p.text?.text || '',
        });
      }
    }

    return NextResponse.json({ success: true, predictions });
  } catch (err: any) {
    console.error('Places autocomplete API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
