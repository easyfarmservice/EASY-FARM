import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PricingService } from '@/services/pricing.service';
import { revalidatePath } from 'next/cache';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const BasketSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be a positive number'),
  imageUrl: z.string().optional(),
  active: z.boolean().optional(),
  oldPrice: z.number().optional(),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateCheck = checkRateLimit(req, 30, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Admin authorization guard
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = BasketSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid basket payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { id, name, slug, description, price, imageUrl, active, oldPrice } = parseResult.data;
    const numericPrice = Number(price);
    const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const supabase = createAdminClient();

    let updated: any = null;

    if (id && !id.startsWith('b-')) {
      const { data } = await supabase
        .from('baskets')
        .update({
          name,
          slug: generatedSlug,
          description: description || '',
          price: numericPrice,
          image_url: imageUrl || '/images/hero-vegetables.png',
          active: active !== undefined ? active : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      updated = data;
    }

    if (!updated) {
      const { data } = await supabase
        .from('baskets')
        .upsert(
          {
            id: id && !id.startsWith('b-') ? id : undefined,
            name,
            slug: generatedSlug,
            description: description || '',
            price: numericPrice,
            image_url: imageUrl || '/images/hero-vegetables.png',
            active: active !== undefined ? active : true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        )
        .select()
        .maybeSingle();

      updated = data;
    }

    if (oldPrice !== undefined && Number(oldPrice) !== numericPrice) {
      await PricingService.logPriceChange({
        entityType: 'basket',
        entityId: updated?.id || generatedSlug,
        entityName: name,
        oldPrice: Number(oldPrice),
        newPrice: numericPrice,
        changedBy: auth.user.email || 'Admin',
      });
    }

    await PricingService.logAudit({
      adminName: auth.user.email || 'Admin',
      action: id ? 'Updated Basket' : 'Created Basket',
      entityType: 'basket',
      entityId: updated?.id || generatedSlug,
      details: { name, price: numericPrice, active },
    });

    try {
      revalidatePath('/');
      revalidatePath('/baskets');
      if (generatedSlug) revalidatePath(`/baskets/${generatedSlug}`);
    } catch (e) {
      console.warn('Revalidation notice:', e);
    }

    return NextResponse.json({
      success: true,
      basket: updated,
      message: `Basket '${name}' saved successfully`,
    });
  } catch (err: any) {
    console.error('Error saving basket via API:', err);
    return NextResponse.json({ error: 'Failed to save basket' }, { status: 500 });
  }
}
