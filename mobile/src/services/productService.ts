import { supabase } from '../lib/supabase';
import { INITIAL_PRODUCTS, ProductItem } from '../data/initialProducts';

export const CATEGORIES = [
  'All',
  'Leafy Greens',
  'Fresh Veggies',
  'Roots & Gourds',
  'Native & Exotics',
] as const;

export type CategoryType = typeof CATEGORIES[number];

export async function fetchCatalogProducts(): Promise<ProductItem[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      console.log('Using initial master produce catalogue fallback');
      return INITIAL_PRODUCTS;
    }

    // Merge and enrich with categories
    return data.map((p: any) => {
      const n = (p.name || '').toLowerCase();
      let category = 'Fresh Veggies';
      if (
        n.includes('spinach') ||
        n.includes('palak') ||
        n.includes('methi') ||
        n.includes('coriander') ||
        n.includes('mint') ||
        n.includes('pudina') ||
        n.includes('thotakura') ||
        n.includes('gongura') ||
        n.includes('curry') ||
        n.includes('amaranth') ||
        n.includes('sorrel') ||
        n.includes('greens') ||
        n.includes('bachali') ||
        n.includes('leaves')
      ) {
        category = 'Leafy Greens';
      } else if (
        n.includes('potato') ||
        n.includes('onion') ||
        n.includes('carrot') ||
        n.includes('beet') ||
        n.includes('gourd') ||
        n.includes('sorakaya') ||
        n.includes('potla') ||
        n.includes('beera') ||
        n.includes('radish') ||
        n.includes('mullangi') ||
        n.includes('yam') ||
        n.includes('chamagadda')
      ) {
        category = 'Roots & Gourds';
      } else if (
        n.includes('corn') ||
        n.includes('broccoli') ||
        n.includes('mushroom') ||
        n.includes('capsicum') ||
        n.includes('zucchini')
      ) {
        category = 'Native & Exotics';
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        description: p.description || '',
        price: Number(p.price) || 30,
        unit: p.unit || 'kg',
        image_url: p.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
        market_price: p.market_price ? Number(p.market_price) : undefined,
        cost_price: p.cost_price ? Number(p.cost_price) : undefined,
        is_seasonal: Boolean(p.is_seasonal),
        active: Boolean(p.active),
        category,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch products from Supabase, using local catalog:', err);
    return INITIAL_PRODUCTS;
  }
}
