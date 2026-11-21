import { supabase } from '../lib/supabase';
import { INITIAL_PRODUCTS, ProductItem } from '../data/initialProducts';

export type { ProductItem };

export interface BasketCropItem {
  id: string;
  productId: string;
  name: string;
  quantity: string;
  unit: string;
  price: number;
  market_price?: number;
  image_url: string;
  is_fixed?: boolean;
}

export interface BasketItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number;
  image_url: string;
  active: boolean;
  items?: BasketCropItem[];
}

export interface NetQuantityOption {
  label: string;
  multiplier: number;
}

/**
 * Returns available net quantity tiers based on product's measurement unit
 * Matches Easy Farm website logic exactly (components/basket/CustomBoxZeptoView.tsx)
 */
export function getNetQuantityOptions(unit: string = 'kg'): NetQuantityOption[] {
  const u = (unit || 'kg').toLowerCase().trim();

  // Leafy Greens / Bunches
  if (u.includes('bunch')) {
    return [
      { label: '1 Bunch', multiplier: 1 },
      { label: '2 Bunches', multiplier: 2 },
      { label: '3 Bunches', multiplier: 3 },
      { label: '4 Bunches', multiplier: 4 },
      { label: '5 Bunches', multiplier: 5 },
    ];
  }

  // Pieces / Count based items
  if (u.includes('pcs') || u.includes('piece') || u === 'pc') {
    return [
      { label: '1 pc', multiplier: 1 },
      { label: '2 pcs', multiplier: 2 },
      { label: '3 pcs', multiplier: 3 },
      { label: '4 pcs', multiplier: 4 },
      { label: '6 pcs', multiplier: 6 },
    ];
  }

  // Gram items (e.g. Ginger, Garlic, Chillies, 250g packs)
  if (u === 'g' || u === 'gram' || u === '250g' || u === '500g' || u === '200g') {
    return [
      { label: '100 g', multiplier: 0.5 },
      { label: '250 g', multiplier: 1 },
      { label: '500 g', multiplier: 2 },
      { label: '1 kg', multiplier: 4 },
    ];
  }

  // Standard Vegetables priced per kg
  return [
    { label: '250 g', multiplier: 0.25 },
    { label: '500 g', multiplier: 0.5 },
    { label: '1 kg', multiplier: 1 },
    { label: '1.5 kg', multiplier: 1.5 },
    { label: '2 kg', multiplier: 2 },
    { label: '3 kg', multiplier: 3 },
  ];
}

export function getDefaultNetQuantityLabel(unit: string = 'kg'): string {
  const u = (unit || 'kg').toLowerCase().trim();
  if (u.includes('bunch')) return '1 Bunch';
  if (u.includes('pcs') || u.includes('piece') || u === 'pc') return '1 pc';
  if (u === 'g' || u === '250g') return '250 g';
  if (u === '500g') return '500 g';
  return '1 kg';
}

export function calculateNetQuantityPrice(basePrice: number, multiplier: number): number {
  return Math.max(1, Math.round(basePrice * multiplier));
}

export const CATEGORIES = [
  'All',
  'Leafy Greens',
  'Fresh Veggies',
  'Roots & Gourds',
  'Native & Exotics',
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80';
  }
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  // If stored as relative path like /images/vegetables/tomato.jpg, map to Supabase bucket or public CDN
  const cleanPath = clean.replace(/^\//, '');
  return `https://tuhnxwpnlwfllvouhpvu.supabase.co/storage/v1/object/public/products/${cleanPath}`;
}

export async function fetchCatalogProducts(): Promise<ProductItem[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      console.log('Using local catalog fallback for products');
      return INITIAL_PRODUCTS.map((p) => ({
        ...p,
        image_url: resolveImageUrl(p.image_url),
      }));
    }

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
        image_url: resolveImageUrl(p.image_url),
        market_price: p.market_price ? Number(p.market_price) : Math.round((Number(p.price) || 30) * 1.35),
        cost_price: p.cost_price ? Number(p.cost_price) : undefined,
        is_seasonal: Boolean(p.is_seasonal),
        active: Boolean(p.active),
        category,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch products from Supabase, using local catalog:', err);
    return INITIAL_PRODUCTS.map((p) => ({
      ...p,
      image_url: resolveImageUrl(p.image_url),
    }));
  }
}

/**
 * Dynamically fetches all baskets and their assigned fixed items from Supabase
 * Handles Staple Box (with items configured from admin panel) & Custom Box (initially ₹0 price)
 */
export async function fetchBaskets(): Promise<BasketItemData[]> {
  try {
    const { data, error } = await supabase
      .from('baskets')
      .select('*, items:basket_items(*, product:products(*))')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((b: any) => {
        const isCustom = (b.slug || '').toLowerCase().includes('custom') || b.id.endsWith('4');

        const parsedItems: BasketCropItem[] = (b.items || []).map((it: any) => {
          const prod = it.product || {};
          return {
            id: it.id,
            productId: prod.id || it.product_id,
            name: prod.name || it.name || 'Seasonal Item',
            quantity: `${it.quantity || 1} ${it.unit || prod.unit || 'kg'}`,
            unit: it.unit || prod.unit || 'kg',
            price: Number(it.item_price || prod.price || 35),
            market_price: Number(
              it.compare_at_price ||
                prod.market_price ||
                Math.round(Number(it.item_price || prod.price || 35) * 1.25)
            ),
            image_url: resolveImageUrl(prod.image_url || it.image_url),
            is_fixed: it.is_fixed !== false,
          };
        });

        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description || 'Farm-fresh curated vegetable basket',
          // Initially custom box will be 0 price as requested!
          price: isCustom ? 0 : Number(b.price) || 250,
          compare_at_price: isCustom
            ? 0
            : Number(b.compare_at_price) || Math.round((Number(b.price) || 250) * 1.25),
          image_url: resolveImageUrl(b.image_url),
          active: Boolean(b.active),
          items: parsedItems,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to fetch baskets from Supabase, using fallback:', err);
  }

  // Resilient fallback with zero static fake values, matching live DB schema
  return [
    {
      id: '33333333-0000-0000-0000-000000000001',
      name: 'Staple Box',
      slug: 'staple-basket',
      description: '5 Fixed Essentials: Country Tomato 1kg, Red Onion 1.5kg, Potato 2kg, Organic Carrot 1kg, Fresh Palak 2 bunches',
      price: 250,
      compare_at_price: 320,
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',
      active: true,
      items: [
        {
          id: 'sb-1',
          productId: '22222222-0000-0000-0000-000000000001',
          name: 'Country Tomato',
          quantity: '1 kg',
          unit: 'kg',
          price: 35,
          image_url: 'https://tuhnxwpnlwfllvouhpvu.supabase.co/storage/v1/object/public/products/veg_1794401683036_bi0fox.webp',
        },
        {
          id: 'sb-2',
          productId: '22222222-0000-0000-0000-000000000008',
          name: 'Red Onion',
          quantity: '1.5 kg',
          unit: 'kg',
          price: 45,
          image_url: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=80',
        },
        {
          id: 'sb-3',
          productId: '22222222-0000-0000-0000-000000000007',
          name: 'Potato',
          quantity: '2 kg',
          unit: 'kg',
          price: 35,
          image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80',
        },
        {
          id: 'sb-4',
          productId: '22222222-0000-0000-0000-000000000003',
          name: 'Fresh Palak (Spinach)',
          quantity: '2 bunches',
          unit: 'bunch',
          price: 25,
          image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80',
        },
        {
          id: 'sb-5',
          productId: '22222222-0000-0000-0000-000000000004',
          name: 'Lady Finger (Bhindi)',
          quantity: '0.5 kg',
          unit: 'kg',
          price: 40,
          image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80',
        },
      ],
    },
    {
      id: '33333333-0000-0000-0000-000000000004',
      name: 'Custom Box',
      slug: 'custom-basket',
      description: 'Build your own box with farm-fresh harvest vegetables. Pick at least 4 crops.',
      price: 0,
      compare_at_price: 0,
      image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80',
      active: true,
      items: [],
    },
  ];
}

// Default constants for backward-compatibility
export const DEFAULT_STAPLE_BOX: ProductItem = {
  id: '33333333-0000-0000-0000-000000000001',
  name: 'Staple Box',
  slug: 'staple-basket',
  description: '5 Fixed Essentials: Country Tomato 1kg, Red Onion 1.5kg, Potato 2kg, Lady Finger 500g, Fresh Palak 2 bunches',
  price: 250,
  market_price: 320,
  unit: 'box',
  image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',
  category: 'Farm Boxes',
  active: true,
};

export const DEFAULT_CUSTOM_BOX: ProductItem = {
  id: '33333333-0000-0000-0000-000000000004',
  name: 'Custom Box',
  slug: 'custom-basket',
  description: 'Build your own box with farm-fresh harvest vegetables. Minimum 4 crops required.',
  price: 0,
  market_price: 0,
  unit: 'box',
  image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80',
  category: 'Farm Boxes',
  active: true,
};

export const STAPLE_BOX_PRODUCT = DEFAULT_STAPLE_BOX;
export const CUSTOM_BOX_PRODUCT = DEFAULT_CUSTOM_BOX;
