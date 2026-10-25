import { createAdminClient } from '@/lib/supabase/admin';
import { Basket } from '@/types/database';
import { withTimeout } from '@/lib/async-utils';
import { SanityService } from './sanity.service';
import { UnifiedBasketService } from './unified-basket.service';

const DEFAULT_BASKETS: Basket[] = [
  {
    id: '33333333-0000-0000-0000-000000000001',
    name: 'Staple Box',
    slug: 'staple-basket',
    description: 'Everyday essential vegetables for small households. 5 seasonal items with up to 3 custom swaps.',
    price: 185,
    compare_at_price: 240,
    image_url: '/images/hero-vegetables.png',
    active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-0000-0000-0000-000000000004',
    name: 'Custom Box',
    slug: 'custom-basket',
    description: 'Build your own box from scratch. Pick whatever you like from our 24-crop local harvest.',
    price: 450,
    compare_at_price: 580,
    image_url: '/images/hero-vegetables.png',
    active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class BasketService {
  static async getActiveBaskets(): Promise<Basket[]> {
    return withTimeout(
      async () => {
        try {
          const summaries = await UnifiedBasketService.getAllBasketsWithPricing();
          if (summaries && summaries.length > 0) {
            return summaries.filter((s) => s.basket.active).map((s) => s.basket);
          }
        } catch (unifiedErr) {
          console.warn('[BasketService] UnifiedBasketService fetch error, falling back:', unifiedErr);
        }

        // 1. Check Sanity CMS
        try {
          const sanityBaskets = await SanityService.getActiveBaskets();
          if (sanityBaskets && sanityBaskets.length > 0) {
            return sanityBaskets.map((b: any, index: number) => ({
              id: b._id,
              name: b.name,
              slug: b.slug?.current || b.name.toLowerCase().replace(/\s+/g, '-'),
              description: b.description || '',
              price: b.price || 0,
              compare_at_price: b.compare_at_price || Math.round((b.price || 0) * 1.25),
              image_url: b.imageUrl || '/images/hero-vegetables.png',
              active: true,
              sort_order: index + 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
          }
        } catch (err) {
          console.warn('[BasketService] Sanity fetch skipped:', err);
        }

        // 2. Fall back to Supabase database
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from('baskets')
          .select('*, items:basket_items(*, product:products(*))')
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (error || !data || data.length === 0) {
          if (error) console.error('Error fetching baskets:', error);
          return DEFAULT_BASKETS;
        }

        return data;
      },
      3000,
      DEFAULT_BASKETS
    );
  }

  static async getBasketBySlug(slug: string): Promise<Basket | null> {
    const baskets = await this.getActiveBaskets();
    return baskets.find((b) => b.slug === slug) || null;
  }

  static async getBasketByIdOrSlug(idOrSlug: string): Promise<Basket | null> {
    const baskets = await this.getActiveBaskets();
    return (
      baskets.find((b) => b.id === idOrSlug || b.slug === idOrSlug) || null
    );
  }
}


