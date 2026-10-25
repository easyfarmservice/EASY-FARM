import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';

const ZonePayloadSchema = z.object({
  name: z.string().min(2, 'Zone name is required'),
  slug: z.string().min(2, 'Slug is required'),
  city: z.string().default('Hyderabad'),
  state: z.string().default('Telangana'),
  active: z.boolean().default(true),
  delivery_day: z.string().default('Sunday'),
  order_cutoff_day: z.string().default('Thursday'),
  order_cutoff_time: z.string().default('23:59:50'),
  delivery_promise: z.string().default('Sunday by 6 PM'),
  delivery_fee: z.number().nonnegative().default(0),
  minimum_order: z.number().nonnegative().default(250),
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))).min(1, 'Polygon must contain coordinates ring'),
  }),
});

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const supabase = createAdminClient();
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('id, name, slug, city, state, country, polygon, active, delivery_day, order_cutoff_day, order_cutoff_time, delivery_promise, delivery_fee, minimum_order, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching delivery zones:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ zones: zones || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const parsed = ZonePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid delivery zone data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const zoneData = parsed.data;

    // Ensure polygon coordinates ring is closed
    const ring = zoneData.polygon.coordinates[0];
    if (ring && ring.length >= 3) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
    }

    const { data: created, error } = await supabase
      .from('delivery_zones')
      .insert({
        name: zoneData.name,
        slug: zoneData.slug,
        city: zoneData.city,
        state: zoneData.state,
        country: 'India',
        polygon: zoneData.polygon,
        active: zoneData.active,
        delivery_day: zoneData.delivery_day,
        order_cutoff_day: zoneData.order_cutoff_day,
        order_cutoff_time: zoneData.order_cutoff_time,
        delivery_promise: zoneData.delivery_promise,
        delivery_fee: zoneData.delivery_fee,
        minimum_order: zoneData.minimum_order,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery zone:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, zone: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create zone' }, { status: 500 });
  }
}
