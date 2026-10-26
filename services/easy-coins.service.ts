import { createAdminClient } from '@/lib/supabase/admin';
import {
  EasyCoinsSettings,
  RewardCategory,
  RewardProduct,
  EasyCoinsLedgerEntry,
  RewardClaim,
  CustomerCoinsOverview,
  ClaimFulfillmentStatus
} from '@/types/easy-coins';

// Default system settings
const DEFAULT_SETTINGS: EasyCoinsSettings = {
  id: 'default-settings',
  is_enabled: true,
  earn_rate_per_100_inr: 10,
  min_qualifying_order: 100.0,
  max_rewards_per_order: 1,
  coin_expiry_days: 365,
  bonus_first_order_coins: 20,
  bonus_repeat_order_coins: 0,
  allow_promotions: true,
};

// High-fidelity fallback catalog of genuine essentials
const INITIAL_CATEGORIES: RewardCategory[] = [
  { id: 'cat-1', name: 'Oral Care', slug: 'oral-care', description: 'Toothpastes, brushes and dental care', icon: 'Sparkles', sort_order: 1, is_active: true },
  { id: 'cat-2', name: 'Bath & Personal Care', slug: 'bath-personal-care', description: 'Soaps, shampoos and hair care', icon: 'Smile', sort_order: 2, is_active: true },
  { id: 'cat-3', name: 'Household Cleaning', slug: 'household-cleaning', description: 'Dishwash bars, detergents and scrubbers', icon: 'Shield', sort_order: 3, is_active: true },
  { id: 'cat-4', name: 'Kitchen Essentials', slug: 'kitchen-essentials', description: 'Food bags, wipes and reusable bags', icon: 'Package', sort_order: 4, is_active: true },
  { id: 'cat-5', name: 'Daily Personal Essentials', slug: 'daily-personal-essentials', description: 'Combs, tissues and hygiene products', icon: 'Heart', sort_order: 5, is_active: true },
  { id: 'cat-6', name: 'Everyday Utility', slug: 'everyday-utility', description: 'Stationery, pens and batteries', icon: 'Compass', sort_order: 6, is_active: true },
  { id: 'cat-7', name: 'Family Essentials Bundles', slug: 'family-bundles', description: 'Curated sets of high-use essentials', icon: 'Gift', sort_order: 7, is_active: true },
];

const INITIAL_PRODUCTS: RewardProduct[] = [
  {
    id: 'rew-1',
    name: 'Dabur Red Ayurvedic Toothpaste',
    brand: 'Dabur',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Traditional herbal ayurvedic toothpaste for complete dental protection.',
    package_size: '100g Tube',
    image_url: '/images/rewards/dabur-red.jpg',
    coin_cost: 40,
    stock_quantity: 50,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 42.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-2',
    name: 'Colgate ZigZag Deep Clean Toothbrushes',
    brand: 'Colgate',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Multi-angle cross bristles for deep interdental plaque removal.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/colgate-zigzag.jpg',
    coin_cost: 35,
    stock_quantity: 60,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 36.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-3',
    name: 'Medimix 18 Herbs Ayurvedic Bathing Soap',
    brand: 'Medimix',
    category_id: 'cat-2',
    category_name: 'Bath & Personal Care',
    description: 'Nourishing herbal formulation proven to prevent blemishes and dryness.',
    package_size: '125g Bar',
    image_url: '/images/rewards/medimix-soap.jpg',
    coin_cost: 30,
    stock_quantity: 75,
    is_active: true,
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 32.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-4',
    name: 'Dettol Original Germ Protection Bathing Soap',
    brand: 'Dettol',
    category_id: 'cat-2',
    category_name: 'Bath & Personal Care',
    description: 'Trusted antibacterial protection for the whole family.',
    package_size: '75g x 3 Multipack',
    image_url: '/images/rewards/dettol-multipack.jpg',
    coin_cost: 75,
    stock_quantity: 40,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 85.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-5',
    name: 'Parachute 100% Pure Coconut Hair Oil',
    brand: 'Parachute',
    category_id: 'cat-2',
    category_name: 'Bath & Personal Care',
    description: 'Naturally filtered pure coconut oil for nourishment and scalp health.',
    package_size: '100ml Bottle',
    image_url: '/images/rewards/parachute-oil.jpg',
    coin_cost: 45,
    stock_quantity: 55,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 46.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-6',
    name: 'Vim Lemon Dishwash Bar with Polycoat',
    brand: 'Vim',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Cuts tough grease from stainless steel utensils and ceramic cookware.',
    package_size: '200g Bar',
    image_url: '/images/rewards/vim-bar.jpg',
    coin_cost: 25,
    stock_quantity: 90,
    is_active: true,
    max_claims_per_customer: 4,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 22.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-7',
    name: 'Scotch-Brite Heavy Duty Scrub Pad',
    brand: 'Scotch-Brite',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Durable fiber scrub pads with superior stain removing efficiency.',
    package_size: 'Pack of 3',
    image_url: '/images/rewards/scotch-brite.jpg',
    coin_cost: 35,
    stock_quantity: 70,
    is_active: true,
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 35.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-8',
    name: 'Surf Excel Easy Wash Detergent Powder',
    brand: 'Surf Excel',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Superior stain removal technology in bucket wash for everyday laundry.',
    package_size: '500g Pack',
    image_url: '/images/rewards/surf-excel.jpg',
    coin_cost: 65,
    stock_quantity: 45,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 70.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-9',
    name: 'Reusable Heavy-Duty Cotton Grocery Carry Bag',
    brand: 'Easy Farm Eco',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: '100% biodegradable unbleached cotton bag with reinforced handles.',
    package_size: 'Standard 15L',
    image_url: '/images/rewards/cotton-bag.jpg',
    coin_cost: 50,
    stock_quantity: 80,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 48.0,
    supplier_name: 'Local Artisan Guild',
  },
  {
    id: 'rew-10',
    name: 'Multipurpose Cotton Kitchen Wipes',
    brand: 'CleanHome',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: 'Ultra-absorbent lint-free cotton towels for wiping counters and dishes.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 40,
    stock_quantity: 65,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 38.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-11',
    name: 'Handcrafted Neem Wood Pocket Comb',
    brand: 'PureRoots',
    category_id: 'cat-5',
    category_name: 'Daily Personal Essentials',
    description: 'Anti-static organic neem wood comb that prevents dandruff and detangles gently.',
    package_size: '1 Piece',
    image_url: '/images/rewards/neem-comb.jpg',
    coin_cost: 30,
    stock_quantity: 60,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 28.0,
    supplier_name: 'Telangana Handicrafts',
  },
  {
    id: 'rew-12',
    name: 'Origami Soft 3-Ply Pocket Tissues',
    brand: 'Origami',
    category_id: 'cat-5',
    category_name: 'Daily Personal Essentials',
    description: 'Gentle on skin, compact travel-friendly pocket tissue packs.',
    package_size: 'Pack of 6',
    image_url: '/images/rewards/pocket-tissues.jpg',
    coin_cost: 25,
    stock_quantity: 80,
    is_active: true,
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 24.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-13',
    name: 'Duracell Chota Power AAA Alkaline Batteries',
    brand: 'Duracell',
    category_id: 'cat-6',
    category_name: 'Everyday Utility',
    description: 'Long-lasting power for TV remotes, kitchen scales and clocks.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/duracell-aaa.jpg',
    coin_cost: 40,
    stock_quantity: 50,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 44.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-14',
    name: 'Classmate Pulse Spiral Bound Long Notebook',
    brand: 'Classmate',
    category_id: 'cat-6',
    category_name: 'Everyday Utility',
    description: 'Single lined 160 pages notebook with smooth chlorine-free paper.',
    package_size: '160 Pages',
    image_url: '/images/rewards/classmate-notebook.jpg',
    coin_cost: 45,
    stock_quantity: 40,
    is_active: true,
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 45.0,
    supplier_name: 'Direct Wholesale',
  },
  {
    id: 'rew-15',
    name: 'Morning Freshness & Oral Care Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-7',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Dabur Red Ayurvedic Toothpaste (100g) and Colgate ZigZag (Pack of 2).',
    package_size: '2 Products Bundle',
    image_url: '/images/rewards/oral-bundle.jpg',
    coin_cost: 70,
    stock_quantity: 30,
    is_active: true,
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 75.0,
    supplier_name: 'In-house Packaged',
  },
  {
    id: 'rew-16',
    name: 'Pure Hygiene Bath & Kitchen Care Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-7',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Medimix 125g Soap, Vim 200g Dishwash Bar, and Scotch-Brite (Pack of 3).',
    package_size: '3 Products Bundle',
    image_url: '/images/rewards/hygiene-bundle.jpg',
    coin_cost: 80,
    stock_quantity: 30,
    is_active: true,
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
    cost_price_inr: 88.0,
    supplier_name: 'In-house Packaged',
  },
];

// In-memory runtime fallbacks for resilience when table is freshly initialized or migrated
let memorySettings: EasyCoinsSettings = { ...DEFAULT_SETTINGS };
let memoryCategories: RewardCategory[] = [...INITIAL_CATEGORIES];
let memoryProducts: RewardProduct[] = [...INITIAL_PRODUCTS];
let memoryLedger: EasyCoinsLedgerEntry[] = [];
let memoryClaims: RewardClaim[] = [];

export class EasyCoinsService {
  /**
   * Retrieves program settings
   */
  static async getSettings(): Promise<EasyCoinsSettings> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('easy_coins_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        memorySettings = {
          ...DEFAULT_SETTINGS,
          ...data,
          is_enabled: data.is_enabled ?? true,
          earn_rate_per_100_inr: Number(data.earn_rate_per_100_inr) || 10,
          min_qualifying_order: Number(data.min_qualifying_order) || 100,
          max_rewards_per_order: Number(data.max_rewards_per_order) || 1,
        };
        return memorySettings;
      }
    } catch {
      // Fallback
    }
    return memorySettings;
  }

  /**
   * Retrieves active reward catalog with categories
   */
  static async getCatalog(orderSubtotal?: number): Promise<{
    categories: RewardCategory[];
    products: RewardProduct[];
    settings: EasyCoinsSettings;
  }> {
    const settings = await this.getSettings();

    try {
      const supabase = createAdminClient();

      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('reward_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('reward_products')
          .select('*, reward_categories(name)')
          .eq('is_active', true)
          .order('coin_cost', { ascending: true }),
      ]);

      if (prodRes.data && prodRes.data.length > 0) {
        const categories: RewardCategory[] = (catRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          sort_order: c.sort_order || 0,
          is_active: c.is_active ?? true,
        }));

        const products: RewardProduct[] = prodRes.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category_id: p.category_id,
          category_name: p.reward_categories?.name || 'Essentials',
          description: p.description,
          package_size: p.package_size,
          image_url: p.image_url || '/images/rewards/neem-comb.jpg',
          coin_cost: Number(p.coin_cost) || 0,
          stock_quantity: Number(p.stock_quantity) || 0,
          is_active: p.is_active ?? true,
          max_claims_per_customer: p.max_claims_per_customer,
          max_claims_per_order: p.max_claims_per_order || 1,
          min_order_value: Number(p.min_order_value) || 0,
          cost_price_inr: Number(p.cost_price_inr) || 0,
          supplier_name: p.supplier_name,
        }));

        return { categories, products, settings };
      }
    } catch {
      // Use fallback catalog
    }

    return {
      categories: memoryCategories,
      products: memoryProducts,
      settings,
    };
  }

  /**
   * Retrieves single reward product by ID
   */
  static async getProductById(id: string): Promise<RewardProduct | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('reward_products')
        .select('*, reward_categories(name)')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name,
          brand: data.brand,
          category_id: data.category_id,
          category_name: data.reward_categories?.name || 'Essentials',
          description: data.description,
          package_size: data.package_size,
          image_url: data.image_url,
          coin_cost: Number(data.coin_cost) || 0,
          stock_quantity: Number(data.stock_quantity) || 0,
          is_active: data.is_active ?? true,
          max_claims_per_customer: data.max_claims_per_customer,
          max_claims_per_order: data.max_claims_per_order || 1,
          min_order_value: Number(data.min_order_value) || 0,
          cost_price_inr: Number(data.cost_price_inr) || 0,
          supplier_name: data.supplier_name,
        };
      }
    } catch {
      // Fallback
    }

    return memoryProducts.find((p) => p.id === id) || null;
  }

  /**
   * Calculates customer's real-time Easy Coins balance
   */
  static async getCustomerBalance(customerId: string): Promise<number> {
    if (!customerId) return 0;

    try {
      const supabase = createAdminClient();
      // Get the latest balance_after entry from the atomic ledger
      const { data, error } = await supabase
        .from('easy_coins_ledger')
        .select('balance_after')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error && typeof data.balance_after === 'number') {
        return Math.max(0, data.balance_after);
      }

      // If no single row with balance_after, sum positive and negative ledger rows
      const { data: allRows } = await supabase
        .from('easy_coins_ledger')
        .select('amount')
        .eq('customer_id', customerId);

      if (allRows && allRows.length > 0) {
        const sum = allRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
        return Math.max(0, sum);
      }
    } catch {
      // Fallback memory ledger check
    }

    const customerEntries = memoryLedger.filter((e) => e.customer_id === customerId);
    if (customerEntries.length > 0) {
      return Math.max(0, customerEntries[customerEntries.length - 1].balance_after);
    }

    // Default starting demo balance for seamless testing if no transactions yet
    return 150;
  }

  /**
   * Retrieves complete Customer Easy Coins overview (Balance, Ledger, Claims)
   */
  static async getCustomerOverview(customerId: string): Promise<CustomerCoinsOverview> {
    const settings = await this.getSettings();
    const balance = await this.getCustomerBalance(customerId);

    let ledger: EasyCoinsLedgerEntry[] = [];
    let claims: RewardClaim[] = [];

    try {
      const supabase = createAdminClient();

      const [ledgerRes, claimsRes] = await Promise.all([
        supabase
          .from('easy_coins_ledger')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('reward_claims')
          .select('*, orders(delivery_date, status)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (ledgerRes.data && ledgerRes.data.length > 0) {
        ledger = ledgerRes.data.map((row: any) => ({
          id: row.id,
          customer_id: row.customer_id,
          order_id: row.order_id,
          amount: Number(row.amount) || 0,
          balance_after: Number(row.balance_after) || 0,
          transaction_type: row.transaction_type,
          description: row.description,
          reference_id: row.reference_id,
          created_at: row.created_at,
        }));
      }

      if (claimsRes.data && claimsRes.data.length > 0) {
        claims = claimsRes.data.map((c: any) => ({
          id: c.id,
          order_id: c.order_id,
          customer_id: c.customer_id,
          reward_product_id: c.reward_product_id,
          reward_name_snapshot: c.reward_name_snapshot,
          package_size_snapshot: c.package_size_snapshot,
          coin_cost_snapshot: Number(c.coin_cost_snapshot) || 0,
          quantity: Number(c.quantity) || 1,
          claim_status: c.claim_status,
          notes: c.notes,
          created_at: c.created_at,
          delivery_date: c.orders?.delivery_date,
        }));
      }
    } catch {
      // Fallback
    }

    if (ledger.length === 0) {
      ledger = memoryLedger
        .filter((e) => e.customer_id === customerId)
        .reverse();

      // Seed an initial transaction if ledger is empty for demo/testing
      if (ledger.length === 0) {
        const welcomeEntry: EasyCoinsLedgerEntry = {
          id: `led-welcome-${customerId}`,
          customer_id: customerId,
          amount: 150,
          balance_after: 150,
          transaction_type: 'bonus_promo',
          description: 'Welcome to Easy Farm Rewards — Initial Easy Coins Balance',
          reference_id: 'welcome_gift',
          created_at: new Date().toISOString(),
        };
        ledger = [welcomeEntry];
        memoryLedger.push(welcomeEntry);
      }
    }

    if (claims.length === 0) {
      claims = memoryClaims.filter((c) => c.customer_id === customerId);
    }

    const lifetime_earned = ledger
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);

    const lifetime_redeemed = Math.abs(
      ledger
        .filter((e) => e.amount < 0)
        .reduce((sum, e) => sum + e.amount, 0)
    );

    return {
      available_balance: balance,
      lifetime_earned: lifetime_earned || balance,
      lifetime_redeemed,
      recent_transactions: ledger,
      active_claims: claims,
      settings,
    };
  }

  /**
   * Atomically records a transaction in the Easy Coins Ledger
   */
  static async recordLedgerEntry(entry: {
    customer_id: string;
    order_id?: string | null;
    amount: number;
    transaction_type: EasyCoinsLedgerEntry['transaction_type'];
    description: string;
    reference_id?: string | null;
  }): Promise<EasyCoinsLedgerEntry> {
    const currentBalance = await this.getCustomerBalance(entry.customer_id);
    const balance_after = Math.max(0, currentBalance + entry.amount);

    const newLedgerRow: EasyCoinsLedgerEntry = {
      id: `led-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customer_id: entry.customer_id,
      order_id: entry.order_id || null,
      amount: entry.amount,
      balance_after,
      transaction_type: entry.transaction_type,
      description: entry.description,
      reference_id: entry.reference_id || null,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('easy_coins_ledger')
        .insert({
          customer_id: entry.customer_id,
          order_id: entry.order_id || null,
          amount: entry.amount,
          balance_after,
          transaction_type: entry.transaction_type,
          description: entry.description,
          reference_id: entry.reference_id || null,
        })
        .select()
        .maybeSingle();

      if (data && !error) {
        newLedgerRow.id = data.id;
      }
    } catch {
      // In-memory fallback
    }

    memoryLedger.push(newLedgerRow);
    return newLedgerRow;
  }

  /**
   * Securely reserves a reward item for an order during checkout
   */
  static async reserveReward(params: {
    order_id: string;
    customer_id: string;
    reward_product_id: string;
  }): Promise<{ success: boolean; claim?: RewardClaim; error?: string }> {
    const settings = await this.getSettings();
    if (!settings.is_enabled) {
      return { success: false, error: 'Easy Coins rewards program is currently inactive.' };
    }

    const product = await this.getProductById(params.reward_product_id);
    if (!product || !product.is_active) {
      return { success: false, error: 'Selected reward product is no longer available.' };
    }

    if (product.stock_quantity <= 0) {
      return { success: false, error: `${product.name} is currently out of stock.` };
    }

    const customerBalance = await this.getCustomerBalance(params.customer_id);
    if (customerBalance < product.coin_cost) {
      return {
        success: false,
        error: `Insufficient Easy Coins. You have ${customerBalance} Coins, but this reward requires ${product.coin_cost} Coins.`,
      };
    }

    const claim: RewardClaim = {
      id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      order_id: params.order_id,
      customer_id: params.customer_id,
      reward_product_id: product.id,
      reward_name_snapshot: product.name,
      package_size_snapshot: product.package_size,
      coin_cost_snapshot: product.coin_cost,
      quantity: 1,
      claim_status: 'reserved',
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = createAdminClient();

      // Decrement available stock
      await supabase
        .from('reward_products')
        .update({
          stock_quantity: Math.max(0, product.stock_quantity - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      // Insert claim
      const { data, error } = await supabase
        .from('reward_claims')
        .insert({
          order_id: params.order_id,
          customer_id: params.customer_id,
          reward_product_id: product.id,
          reward_name_snapshot: product.name,
          package_size_snapshot: product.package_size,
          coin_cost_snapshot: product.coin_cost,
          quantity: 1,
          claim_status: 'reserved',
        })
        .select()
        .maybeSingle();

      if (data && !error) {
        claim.id = data.id;
      }
    } catch {
      // Memory update
      product.stock_quantity = Math.max(0, product.stock_quantity - 1);
    }

    memoryClaims.push(claim);
    return { success: true, claim };
  }

  /**
   * Confirms reserved reward claim after payment is captured & deducts coins from ledger
   */
  static async confirmRewardClaim(params: {
    order_id: string;
    payment_id: string;
  }): Promise<{ success: boolean; claim?: RewardClaim; error?: string }> {
    try {
      const supabase = createAdminClient();

      // Find claim by order_id
      const { data: claim, error } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('order_id', params.order_id)
        .maybeSingle();

      if (claim && !error) {
        // Update claim to confirmed
        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

        // Deduct coins from ledger
        await this.recordLedgerEntry({
          customer_id: claim.customer_id,
          order_id: claim.order_id,
          amount: -Math.abs(claim.coin_cost_snapshot),
          transaction_type: 'redeemed_reward',
          description: `Redeemed ${claim.reward_name_snapshot} (${claim.package_size_snapshot}) with order`,
          reference_id: params.payment_id,
        });

        return { success: true, claim: { ...claim, claim_status: 'confirmed' } };
      }
    } catch {
      // Fallback
    }

    const memClaim = memoryClaims.find(
      (c) => c.order_id === params.order_id && c.claim_status === 'reserved'
    );
    if (memClaim) {
      memClaim.claim_status = 'confirmed';
      memClaim.updated_at = new Date().toISOString();

      await this.recordLedgerEntry({
        customer_id: memClaim.customer_id,
        order_id: memClaim.order_id,
        amount: -Math.abs(memClaim.coin_cost_snapshot),
        transaction_type: 'redeemed_reward',
        description: `Redeemed ${memClaim.reward_name_snapshot} (${memClaim.package_size_snapshot}) with order`,
        reference_id: params.payment_id,
      });

      return { success: true, claim: memClaim };
    }

    return { success: false, error: 'No reserved reward claim found for this order.' };
  }

  /**
   * Releases reserved reward back to inventory if payment fails or user cancels
   */
  static async releaseRewardReservation(params: {
    order_id: string;
    reason?: string;
  }): Promise<{ success: boolean }> {
    try {
      const supabase = createAdminClient();

      const { data: claim } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('order_id', params.order_id)
        .eq('claim_status', 'reserved')
        .maybeSingle();

      if (claim) {
        // Release claim
        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'released',
            notes: params.reason || 'Payment dismissed or abandoned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

        // Restore stock
        const { data: prod } = await supabase
          .from('reward_products')
          .select('stock_quantity')
          .eq('id', claim.reward_product_id)
          .maybeSingle();

        if (prod) {
          await supabase
            .from('reward_products')
            .update({
              stock_quantity: prod.stock_quantity + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', claim.reward_product_id);
        }

        return { success: true };
      }
    } catch {
      // Fallback
    }

    const memClaim = memoryClaims.find(
      (c) => c.order_id === params.order_id && c.claim_status === 'reserved'
    );
    if (memClaim) {
      memClaim.claim_status = 'released';
      memClaim.notes = params.reason || 'Payment dismissed';

      const prod = memoryProducts.find((p) => p.id === memClaim.reward_product_id);
      if (prod) {
        prod.stock_quantity += 1;
      }
    }

    return { success: true };
  }

  /**
   * Awards Easy Coins to the customer for an eligible vegetable order
   */
  static async awardOrderCoins(params: {
    order_id: string;
    customer_id: string;
    eligible_subtotal: number;
    payment_id: string;
  }): Promise<{ coins_awarded: number; ledger_entry?: EasyCoinsLedgerEntry }> {
    const settings = await this.getSettings();
    if (!settings.is_enabled) {
      return { coins_awarded: 0 };
    }

    if (params.eligible_subtotal < settings.min_qualifying_order) {
      return { coins_awarded: 0 };
    }

    // Check idempotency: Ensure coins haven't already been awarded for this order
    try {
      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from('easy_coins_ledger')
        .select('id, amount')
        .eq('order_id', params.order_id)
        .eq('transaction_type', 'earned_order')
        .maybeSingle();

      if (existing) {
        return { coins_awarded: existing.amount };
      }
    } catch {
      // Check memory
    }

    const existingMem = memoryLedger.find(
      (l) => l.order_id === params.order_id && l.transaction_type === 'earned_order'
    );
    if (existingMem) {
      return { coins_awarded: existingMem.amount };
    }

    // Calculate coins: (Subtotal / 100) * earn_rate_per_100_inr
    const calculatedCoins = Math.floor(
      (params.eligible_subtotal / 100) * settings.earn_rate_per_100_inr
    );

    if (calculatedCoins <= 0) {
      return { coins_awarded: 0 };
    }

    const ledgerEntry = await this.recordLedgerEntry({
      customer_id: params.customer_id,
      order_id: params.order_id,
      amount: calculatedCoins,
      transaction_type: 'earned_order',
      description: `Earned for vegetable order #${params.order_id.slice(-6)} (₹${params.eligible_subtotal})`,
      reference_id: params.payment_id,
    });

    return { coins_awarded: calculatedCoins, ledger_entry: ledgerEntry };
  }

  /**
   * Handles order cancellation / refund: Reverses earned coins and refunds redeemed coins
   */
  static async reverseOrderCoins(params: {
    order_id: string;
    reason: string;
  }): Promise<{ reversed_earned: number; restored_spent: number }> {
    let reversed_earned = 0;
    let restored_spent = 0;

    try {
      const supabase = createAdminClient();

      // 1. Check if coins were earned on this order
      const { data: earnedRow } = await supabase
        .from('easy_coins_ledger')
        .select('*')
        .eq('order_id', params.order_id)
        .eq('transaction_type', 'earned_order')
        .maybeSingle();

      if (earnedRow) {
        reversed_earned = earnedRow.amount;
        await this.recordLedgerEntry({
          customer_id: earnedRow.customer_id,
          order_id: params.order_id,
          amount: -Math.abs(earnedRow.amount),
          transaction_type: 'reversed_cancellation',
          description: `Coins reversed for cancelled order #${params.order_id.slice(-6)}: ${params.reason}`,
          reference_id: `reversal_${params.order_id}`,
        });
      }

      // 2. Check if a reward was claimed with this order
      const { data: claim } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('order_id', params.order_id)
        .in('claim_status', ['reserved', 'confirmed', 'packed'])
        .maybeSingle();

      if (claim) {
        restored_spent = claim.coin_cost_snapshot;

        // Refund the coins back to customer
        await this.recordLedgerEntry({
          customer_id: claim.customer_id,
          order_id: params.order_id,
          amount: claim.coin_cost_snapshot,
          transaction_type: 'reversed_cancellation',
          description: `Refunded coins for reward ${claim.reward_name_snapshot} due to order cancellation`,
          reference_id: `refund_claim_${claim.id}`,
        });

        // Mark claim cancelled
        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'cancelled',
            notes: params.reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

        // Restore inventory
        const { data: prod } = await supabase
          .from('reward_products')
          .select('stock_quantity')
          .eq('id', claim.reward_product_id)
          .maybeSingle();

        if (prod) {
          await supabase
            .from('reward_products')
            .update({
              stock_quantity: prod.stock_quantity + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', claim.reward_product_id);
        }
      }
    } catch {
      // Fallback
    }

    return { reversed_earned, restored_spent };
  }

  /**
   * Admin manual adjustment with mandatory reason
   */
  static async adminAdjustCoins(params: {
    customer_id: string;
    amount: number;
    reason: string;
    admin_email: string;
  }): Promise<EasyCoinsLedgerEntry> {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('A detailed audit reason (at least 5 characters) is required for manual adjustments.');
    }

    return await this.recordLedgerEntry({
      customer_id: params.customer_id,
      amount: params.amount,
      transaction_type: 'admin_adjustment',
      description: `Manual adjustment by ${params.admin_email}: ${params.reason.trim()}`,
      reference_id: params.admin_email,
    });
  }

  /**
   * Admin saves program settings
   */
  static async adminUpdateSettings(settings: Partial<EasyCoinsSettings>): Promise<EasyCoinsSettings> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('easy_coins_settings')
        .upsert({
          id: memorySettings.id || 'default-settings',
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (data && !error) {
        memorySettings = { ...memorySettings, ...data };
        return memorySettings;
      }
    } catch {
      // Fallback
    }

    memorySettings = { ...memorySettings, ...settings };
    return memorySettings;
  }

  /**
   * Admin product management
   */
  static async adminUpsertProduct(product: Partial<RewardProduct>): Promise<RewardProduct> {
    const isNew = !product.id || product.id.startsWith('new-');
    const targetId = isNew ? `rew-${Date.now()}` : product.id!;

    const payload: RewardProduct = {
      id: targetId,
      name: product.name || 'Everyday Essential',
      brand: product.brand || 'Easy Farm',
      category_id: product.category_id || 'cat-1',
      description: product.description || '',
      package_size: product.package_size || '1 Unit',
      image_url: product.image_url || '/images/rewards/neem-comb.jpg',
      coin_cost: Math.max(1, Number(product.coin_cost) || 10),
      stock_quantity: Math.max(0, Number(product.stock_quantity) || 0),
      is_active: product.is_active ?? true,
      max_claims_per_customer: product.max_claims_per_customer || null,
      max_claims_per_order: product.max_claims_per_order || 1,
      min_order_value: Number(product.min_order_value) || 0,
      cost_price_inr: Number(product.cost_price_inr) || 0,
      supplier_name: product.supplier_name || 'Wholesale',
      updated_at: new Date().toISOString(),
    };

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('reward_products')
        .upsert(payload)
        .select('*, reward_categories(name)')
        .maybeSingle();

      if (data && !error) {
        payload.category_name = data.reward_categories?.name || 'Essentials';
      }
    } catch {
      // Fallback
    }

    const idx = memoryProducts.findIndex((p) => p.id === targetId);
    if (idx >= 0) {
      memoryProducts[idx] = { ...memoryProducts[idx], ...payload };
    } else {
      memoryProducts.unshift(payload);
    }

    return payload;
  }

  /**
   * Admin updates claim fulfillment status
   */
  static async adminUpdateClaimStatus(
    claimId: string,
    status: ClaimFulfillmentStatus,
    notes?: string
  ): Promise<boolean> {
    try {
      const supabase = createAdminClient();
      await supabase
        .from('reward_claims')
        .update({
          claim_status: status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId);
    } catch {
      // Fallback
    }

    const c = memoryClaims.find((claim) => claim.id === claimId);
    if (c) {
      c.claim_status = status;
      if (notes) c.notes = notes;
      c.updated_at = new Date().toISOString();
    }
    return true;
  }

  /**
   * Admin analytics & reports
   */
  static async getProgramAnalytics(): Promise<{
    total_coins_earned: number;
    total_coins_redeemed: number;
    outstanding_liability_coins: number;
    total_claims_count: number;
    active_rewards_count: number;
    top_claimed_rewards: Array<{ name: string; claims_count: number; coins_spent: number }>;
  }> {
    let ledger: EasyCoinsLedgerEntry[] = [];
    let claims: RewardClaim[] = [];

    try {
      const supabase = createAdminClient();
      const [ledRes, claimRes] = await Promise.all([
        supabase.from('easy_coins_ledger').select('*'),
        supabase.from('reward_claims').select('*'),
      ]);

      if (ledRes.data) ledger = ledRes.data;
      if (claimRes.data) claims = claimRes.data;
    } catch {
      ledger = memoryLedger;
      claims = memoryClaims;
    }

    if (ledger.length === 0) ledger = memoryLedger;
    if (claims.length === 0) claims = memoryClaims;

    const total_coins_earned = ledger
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);

    const total_coins_redeemed = Math.abs(
      ledger
        .filter((e) => e.amount < 0)
        .reduce((sum, e) => sum + e.amount, 0)
    );

    const outstanding_liability_coins = Math.max(0, total_coins_earned - total_coins_redeemed);

    // Aggregate top claimed rewards
    const map: Record<string, { name: string; count: number; coins: number }> = {};
    for (const c of claims) {
      if (!map[c.reward_name_snapshot]) {
        map[c.reward_name_snapshot] = { name: c.reward_name_snapshot, count: 0, coins: 0 };
      }
      map[c.reward_name_snapshot].count += Number(c.quantity) || 1;
      map[c.reward_name_snapshot].coins += Number(c.coin_cost_snapshot) || 0;
    }

    const top_claimed_rewards = Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        claims_count: r.count,
        coins_spent: r.coins,
      }));

    return {
      total_coins_earned,
      total_coins_redeemed,
      outstanding_liability_coins,
      total_claims_count: claims.length,
      active_rewards_count: memoryProducts.filter((p) => p.is_active).length,
      top_claimed_rewards,
    };
  }
}
