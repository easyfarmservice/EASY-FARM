import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PricingService } from '@/services/pricing.service';
import { revalidatePath } from 'next/cache';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const PricingUpdateSchema = z.object({
  basketId: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  price: z.number().positive('Price must be a positive number'),
  oldPrice: z.number().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Check Rate Limiting
  const rateCheck = checkRateLimit(req, 30, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  // 2. Independently Verify Admin Authorization
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = PricingUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { basketId, slug, name, price, oldPrice } = parseResult.data;
    const numericPrice = Number(price);
    const supabase = createAdminClient();

    // Map legacy b-01, b-02, b-03 to real DB slugs/UUIDs
    let targetSlug = slug;
    if (!targetSlug) {
      if (basketId === 'b-01' || name?.includes('Staple')) targetSlug = 'staple-box';
      if (basketId === 'b-02' || name?.includes('Green')) targetSlug = 'green-box';
      if (basketId === 'b-03' || name?.includes('Premium')) targetSlug = 'premium-box';
    }

    // 1. Try to update by ID
    let updated: any = null;
    if (basketId && !basketId.startsWith('b-')) {
      const { data } = await supabase
        .from('baskets')
        .update({
          price: numericPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', basketId)
        .select()
        .maybeSingle();

      updated = data;
    }

    // 2. If not updated by ID, update by slug
    if (!updated && targetSlug) {
      const { data } = await supabase
        .from('baskets')
        .update({
          price: numericPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('slug', targetSlug)
        .select()
        .maybeSingle();

      updated = data;
    }

    // 3. Fallback upsert if record doesn't exist
    if (!updated) {
      const { data } = await supabase
        .from('baskets')
        .upsert(
          {
            name: name || 'Weekly Basket',
            slug: targetSlug || 'weekly-basket',
            price: numericPrice,
            description: 'Curated weekly vegetable basket',
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        )
        .select()
        .maybeSingle();

      updated = data;
    }

    // Log price change to audit table
    await PricingService.logPriceChange({
      entityType: 'basket',
      entityId: updated?.id || basketId || targetSlug,
      entityName: name || updated?.name || 'Basket',
      oldPrice: Number(oldPrice || 0),
      newPrice: numericPrice,
      changedBy: auth.user.email || 'Admin',
    });

    // Audit Log
    await PricingService.logAudit({
      adminName: auth.user.email || 'Admin',
      action: 'Updated Basket Price',
      entityType: 'basket',
      entityId: updated?.id || targetSlug,
      details: { oldPrice, newPrice: numericPrice },
    });

    // Revalidate customer-facing pages
    try {
      revalidatePath('/');
      revalidatePath('/baskets');
      if (targetSlug) revalidatePath(`/baskets/${targetSlug}`);
      if (updated?.id) revalidatePath(`/baskets/${updated.id}`);
    } catch (e) {
      console.warn('Revalidation notice:', e);
    }

    return NextResponse.json({
      success: true,
      basket: updated,
      message: `Price for ${name || 'basket'} updated to ₹${numericPrice}`,
    });
  } catch (err: any) {
    console.error('Error updating basket price via API:', err);
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
  }
}
