import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';

const UpdateZoneSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  active: z.boolean().optional(),
  delivery_day: z.string().optional(),
  order_cutoff_day: z.string().optional(),
  order_cutoff_time: z.string().optional(),
  delivery_promise: z.string().optional(),
  delivery_fee: z.number().nonnegative().optional(),
  minimum_order: z.number().nonnegative().optional(),
  polygon: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateZoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid zone update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = { ...parsed.data, updated_at: new Date().toISOString() };

    // If polygon updated, ensure closing vertex
    if (updates.polygon?.coordinates?.[0]) {
      const ring = updates.polygon.coordinates[0];
      if (ring.length >= 3) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([...first]);
        }
      }
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from('delivery_zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery zone:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, zone: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update zone' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Check if zone has associated orders
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_zone_id', id);

    if (count && count > 0) {
      // Soft-delete / deactivate to preserve historical integrity
      await supabase
        .from('delivery_zones')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Zone has historical orders and was deactivated rather than deleted.',
      });
    }

    const { error } = await supabase
      .from('delivery_zones')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Delivery zone removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete zone' }, { status: 500 });
  }
}
