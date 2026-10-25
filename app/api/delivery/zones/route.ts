import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('id, name, slug, delivery_day, delivery_promise, polygon')
      .eq('active', true);

    if (error) {
      console.error('Error fetching public active delivery zones:', error);
      return NextResponse.json({ success: false, zones: [] }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      zones: zones || [],
    });
  } catch (err: any) {
    console.error('GET /api/delivery/zones error:', err);
    return NextResponse.json({ success: false, zones: [] }, { status: 500 });
  }
}
