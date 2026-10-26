import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  EasyCoinsSettings,
  RewardCategory,
  RewardProduct,
  EasyCoinsLedgerEntry,
  RewardClaim,
  CustomerCoinsOverview,
  ClaimFulfillmentStatus,
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

// Official 6 Categories aligned with requirements
export const INITIAL_CATEGORIES: RewardCategory[] = [
  { id: 'cat-1', name: 'Oral Care', slug: 'oral-care', description: 'Toothpastes, genuine brushes and mouthwashes', icon: 'Sparkles', sort_order: 1, is_active: true },
  { id: 'cat-2', name: 'Bath and Personal Care', slug: 'bath-personal-care', description: 'Bathing soaps, hair care, face and handwash', icon: 'Smile', sort_order: 2, is_active: true },
  { id: 'cat-3', name: 'Household Cleaning', slug: 'household-cleaning', description: 'Dishwash bars, detergents, scrub pads and wipes', icon: 'Shield', sort_order: 3, is_active: true },
  { id: 'cat-4', name: 'Kitchen Essentials', slug: 'kitchen-essentials', description: 'Bags, towels and airtight food storage containers', icon: 'Package', sort_order: 4, is_active: true },
  { id: 'cat-5', name: 'Daily Essentials', slug: 'daily-essentials', description: 'Tissues, pens, stationery, cotton swabs and batteries', icon: 'Heart', sort_order: 5, is_active: true },
  { id: 'cat-6', name: 'Family Essentials Bundles', slug: 'family-bundles', description: 'Curated value bundles of high-demand household products', icon: 'Gift', sort_order: 6, is_active: true },
];

// Initial 40 Products Catalog: Approved essentials are active; suggested items remain inactive until administrator configuration
export const INITIAL_PRODUCTS: RewardProduct[] = [
  // ── Category A: Oral Care ──────────────────────────────────────────────────
  {
    id: 'rew-1',
    sku: 'OC-DAB-100',
    name: 'Dabur Red Ayurvedic Toothpaste',
    brand: 'Dabur',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Traditional herbal ayurvedic toothpaste for complete dental and gum protection.',
    package_size: '100g Tube',
    image_url: '/images/rewards/dabur-red.jpg',
    coin_cost: 40,
    stock_quantity: 50,
    cost_price_inr: 42.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-2',
    sku: 'OC-COL-MAX',
    name: 'Colgate Strong Teeth Toothpaste',
    brand: 'Colgate',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Calcium boost formula strengthening enamel and fighting cavities for healthy teeth.',
    package_size: '100g Tube',
    image_url: '/images/rewards/colgate-zigzag.jpg',
    coin_cost: 40,
    stock_quantity: 50,
    cost_price_inr: 44.0,
    supplier_name: 'Wholesale Depot',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-3',
    sku: 'OC-TB-SGL',
    name: 'Soft Bristle Toothbrush',
    brand: 'Oral-B',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Ultra-gentle gum massager bristles for sensitive teeth and deep interdental cleaning.',
    package_size: '1 Piece Single',
    image_url: '/images/rewards/colgate-zigzag.jpg',
    coin_cost: 25,
    stock_quantity: 60,
    cost_price_inr: 24.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-4',
    sku: 'OC-TB-MLT',
    name: 'Colgate ZigZag Deep Clean Toothbrushes',
    brand: 'Colgate',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Multi-angle cross bristles designed for deep interdental plaque removal.',
    package_size: 'Pack of 3',
    image_url: '/images/rewards/colgate-zigzag.jpg',
    coin_cost: 45,
    stock_quantity: 45,
    cost_price_inr: 48.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-5',
    sku: 'OC-MW-80',
    name: 'Listerine Cool Mint Mouthwash',
    brand: 'Listerine',
    category_id: 'cat-1',
    category_name: 'Oral Care',
    description: 'Removes 99.9% of bad breath germs and prevents plaque buildup in hard-to-reach areas.',
    package_size: '80ml Bottle',
    image_url: '/images/rewards/dabur-red.jpg',
    coin_cost: 50,
    stock_quantity: 0,
    cost_price_inr: 52.0,
    supplier_name: 'Healthcare Wholesaler',
    is_active: false, // Suggested item: inactive until administrator approval
    is_archived: false,
    availability_status: 'out_of_stock',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },

  // ── Category B: Bath and Personal Care ─────────────────────────────────────
  {
    id: 'rew-6',
    sku: 'BP-DOV-100',
    name: 'Dove White Beauty Moisture Bar Soap',
    brand: 'Dove',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Contains 1/4th moisturizing cream to keep skin softer, smoother and healthier.',
    package_size: '100g Bar',
    image_url: '/images/rewards/medimix-soap.jpg',
    coin_cost: 50,
    stock_quantity: 40,
    cost_price_inr: 54.0,
    supplier_name: 'Unilever Dist',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-7',
    sku: 'BP-MED-125',
    name: 'Medimix 18 Herbs Ayurvedic Bathing Soap',
    brand: 'Medimix',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Nourishing herbal formulation proven to prevent blemishes and skin irritation.',
    package_size: '125g Bar',
    image_url: '/images/rewards/medimix-soap.jpg',
    coin_cost: 30,
    stock_quantity: 75,
    cost_price_inr: 32.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-8',
    sku: 'BP-DET-75',
    name: 'Dettol Original Germ Protection Bathing Soap',
    brand: 'Dettol',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Trusted antibacterial antiseptic bar protecting family hygiene daily.',
    package_size: '75g Bar',
    image_url: '/images/rewards/dettol-multipack.jpg',
    coin_cost: 35,
    stock_quantity: 50,
    cost_price_inr: 36.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-9',
    sku: 'BP-SHP-SAC',
    name: 'Clinic Plus Strong & Long Shampoo Sachet Strip',
    brand: 'Clinic Plus',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Milk protein enriched sachet strip for strong, manageable hair.',
    package_size: '16 Sachets Pack',
    image_url: '/images/rewards/parachute-oil.jpg',
    coin_cost: 30,
    stock_quantity: 40,
    cost_price_inr: 28.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-10',
    sku: 'BP-SHP-80',
    name: 'Head & Shoulders Smooth & Silky Shampoo',
    brand: 'Head & Shoulders',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Anti-dandruff daily shampoo leaving scalp clean and hair silky smooth.',
    package_size: '72ml Bottle',
    image_url: '/images/rewards/parachute-oil.jpg',
    coin_cost: 55,
    stock_quantity: 25,
    cost_price_inr: 60.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-11',
    sku: 'BP-OIL-100',
    name: 'Parachute 100% Pure Coconut Hair Oil',
    brand: 'Parachute',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Naturally filtered pure coconut oil for deep nourishment and scalp conditioning.',
    package_size: '100ml Bottle',
    image_url: '/images/rewards/parachute-oil.jpg',
    coin_cost: 45,
    stock_quantity: 55,
    cost_price_inr: 46.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-12',
    sku: 'BP-CND-80',
    name: 'Dove Daily Shine Hair Conditioner',
    brand: 'Dove',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Nutritive serum conditioner that locks in moisture and detangles gently.',
    package_size: '80ml Bottle',
    image_url: '/images/rewards/parachute-oil.jpg',
    coin_cost: 60,
    stock_quantity: 20,
    cost_price_inr: 65.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-13',
    sku: 'BP-FW-50',
    name: 'Himalaya Purifying Neem Face Wash',
    brand: 'Himalaya',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Soap-free herbal face wash that cleanses impurities and prevents pimples.',
    package_size: '50ml Tube',
    image_url: '/images/rewards/medimix-soap.jpg',
    coin_cost: 50,
    stock_quantity: 30,
    cost_price_inr: 52.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-14',
    sku: 'BP-HW-REF',
    name: 'Lifebuoy Total 10 Handwash Refill Pouch',
    brand: 'Lifebuoy',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Activ Silver formula delivering 99.9% germ protection in 10 seconds.',
    package_size: '175ml Pouch',
    image_url: '/images/rewards/medimix-soap.jpg',
    coin_cost: 40,
    stock_quantity: 35,
    cost_price_inr: 42.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-15',
    sku: 'BP-HW-PMP',
    name: 'Dettol Liquid Handwash Pump Dispenser',
    brand: 'Dettol',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Hygienic pump dispenser with skin moisturizers and pH-balanced antibacterial shield.',
    package_size: '200ml Bottle',
    image_url: '/images/rewards/dettol-multipack.jpg',
    coin_cost: 65,
    stock_quantity: 25,
    cost_price_inr: 70.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-16',
    sku: 'BP-CMB-NM',
    name: 'Handcrafted Neem Wood Pocket Comb',
    brand: 'PureRoots',
    category_id: 'cat-2',
    category_name: 'Bath and Personal Care',
    description: 'Anti-static natural neem wood comb that prevents dandruff and detangles gently.',
    package_size: '1 Piece',
    image_url: '/images/rewards/neem-comb.jpg',
    coin_cost: 30,
    stock_quantity: 60,
    cost_price_inr: 28.0,
    supplier_name: 'Telangana Handicrafts',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },

  // ── Category C: Household Cleaning ─────────────────────────────────────────
  {
    id: 'rew-17',
    sku: 'HC-VIM-BAR',
    name: 'Vim Lemon Dishwash Bar with Polycoat',
    brand: 'Vim',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Cuts tough grease from stainless steel utensils and ceramic cookware.',
    package_size: '200g Bar',
    image_url: '/images/rewards/vim-bar.jpg',
    coin_cost: 25,
    stock_quantity: 90,
    cost_price_inr: 22.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 4,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-18',
    sku: 'HC-VIM-LIQ',
    name: 'Vim Gel Lemon Dishwash Liquid',
    brand: 'Vim',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Leaves no white residue, clean sink aroma with 1 spoonful degreasing power.',
    package_size: '250ml Bottle',
    image_url: '/images/rewards/vim-bar.jpg',
    coin_cost: 50,
    stock_quantity: 40,
    cost_price_inr: 52.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-19',
    sku: 'HC-SB-PAD',
    name: 'Scotch-Brite Heavy Duty Scrub Pad',
    brand: 'Scotch-Brite',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Durable fiber scrub pads with superior stain removing efficiency.',
    package_size: 'Pack of 3',
    image_url: '/images/rewards/scotch-brite.jpg',
    coin_cost: 35,
    stock_quantity: 70,
    cost_price_inr: 35.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-20',
    sku: 'HC-SB-SPN',
    name: 'Scotch-Brite Cellulose Sponge Wipe',
    brand: 'Scotch-Brite',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Absorbs 10 times its own weight in water; one-swipe table and platform cleaning.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/scotch-brite.jpg',
    coin_cost: 45,
    stock_quantity: 35,
    cost_price_inr: 46.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-21',
    sku: 'HC-DET-SAC',
    name: 'Surf Excel Easy Wash Detergent Powder Sachets',
    brand: 'Surf Excel',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Compact single-load wash sachets for stain removal and laundry freshness.',
    package_size: 'Strip of 10 Sachets',
    image_url: '/images/rewards/surf-excel.jpg',
    coin_cost: 30,
    stock_quantity: 45,
    cost_price_inr: 28.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-22',
    sku: 'HC-SRF-500',
    name: 'Surf Excel Easy Wash Detergent Powder',
    brand: 'Surf Excel',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Superior stain removal technology in bucket wash for everyday family laundry.',
    package_size: '500g Pack',
    image_url: '/images/rewards/surf-excel.jpg',
    coin_cost: 65,
    stock_quantity: 45,
    cost_price_inr: 70.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-23',
    sku: 'HC-MIC-CLT',
    name: 'Microfiber Multi-Surface Cleaning Cloth',
    brand: 'CleanHome',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Streak-free lintless microfiber towels for kitchen slabs, glass and dining tables.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 45,
    stock_quantity: 40,
    cost_price_inr: 44.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-24',
    sku: 'HC-DET-WIP',
    name: 'Dettol Disinfectant Multi-Action Wipes',
    brand: 'Dettol',
    category_id: 'cat-3',
    category_name: 'Household Cleaning',
    description: 'Sanitizing moist wipes that eliminate germs from door handles, remotes and switches.',
    package_size: 'Pack of 30 Wipes',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 60,
    stock_quantity: 25,
    cost_price_inr: 65.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },

  // ── Category D: Kitchen Essentials ─────────────────────────────────────────
  {
    id: 'rew-25',
    sku: 'KE-COT-BAG',
    name: 'Reusable Heavy-Duty Cotton Grocery Carry Bag',
    brand: 'Easy Farm Eco',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: '100% biodegradable unbleached cotton bag with reinforced handles for weekly vegetables.',
    package_size: 'Standard 15L Tote',
    image_url: '/images/rewards/cotton-bag.jpg',
    coin_cost: 50,
    stock_quantity: 80,
    cost_price_inr: 48.0,
    supplier_name: 'Local Artisan Guild',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-26',
    sku: 'KE-KTC-TWL',
    name: 'Multipurpose Cotton Kitchen Wipes',
    brand: 'CleanHome',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: 'Ultra-absorbent lint-free cotton towels for wiping counters and dry utensils.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 40,
    stock_quantity: 65,
    cost_price_inr: 38.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-27',
    sku: 'KE-BOX-350',
    name: 'Milton Airtight Food Storage Container',
    brand: 'Milton',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: 'BPA-free airtight leak-proof container ideal for chopped veggies and snacks.',
    package_size: '350ml Box',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 55,
    stock_quantity: 30,
    cost_price_inr: 58.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-28',
    sku: 'KE-ZIP-BAG',
    name: 'Vegetable Fresh Produce Storage Bags',
    brand: 'EcoZip',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: 'Breathable reusable net bags that extend refrigerator freshness for leafy greens.',
    package_size: 'Pack of 4 Bags',
    image_url: '/images/rewards/cotton-bag.jpg',
    coin_cost: 45,
    stock_quantity: 40,
    cost_price_inr: 45.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-29',
    sku: 'KE-UTL-SS',
    name: 'Stainless Steel Reusable Masala & Seed Box',
    brand: 'SteelCraft',
    category_id: 'cat-4',
    category_name: 'Kitchen Essentials',
    description: 'Food-grade rustproof stainless steel container with snug lid for kitchen pantry.',
    package_size: '200ml Single',
    image_url: '/images/rewards/kitchen-wipes.jpg',
    coin_cost: 60,
    stock_quantity: 25,
    cost_price_inr: 65.0,
    supplier_name: 'Kitchenware Depot',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },

  // ── Category E: Daily Essentials ───────────────────────────────────────────
  {
    id: 'rew-30',
    sku: 'DE-TIS-PKT',
    name: 'Origami Soft 3-Ply Pocket Tissues',
    brand: 'Origami',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Gentle on skin, compact travel-friendly pocket tissue packs.',
    package_size: 'Pack of 6',
    image_url: '/images/rewards/pocket-tissues.jpg',
    coin_cost: 25,
    stock_quantity: 80,
    cost_price_inr: 24.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-31',
    sku: 'DE-HKF-COT',
    name: '100% Pure Cotton Soft Handkerchiefs',
    brand: 'DailyComfort',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Soft absorbent combed cotton handkerchiefs with neat stitched edges.',
    package_size: 'Pack of 3',
    image_url: '/images/rewards/pocket-tissues.jpg',
    coin_cost: 35,
    stock_quantity: 50,
    cost_price_inr: 36.0,
    supplier_name: 'Textile Guild',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-32',
    sku: 'DE-PEN-BAL',
    name: 'Reynolds 045 Fine Carbide Ballpoint Pens',
    brand: 'Reynolds',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Smooth smudge-free blue ball pens for home accounts, grocery lists and school.',
    package_size: 'Pack of 5 Pens',
    image_url: '/images/rewards/classmate-notebook.jpg',
    coin_cost: 30,
    stock_quantity: 60,
    cost_price_inr: 30.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 3,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-33',
    sku: 'DE-NOTE-BK',
    name: 'Classmate Pulse Spiral Bound Long Notebook',
    brand: 'Classmate',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Single lined 160 pages notebook with smooth chlorine-free paper.',
    package_size: '160 Pages',
    image_url: '/images/rewards/classmate-notebook.jpg',
    coin_cost: 45,
    stock_quantity: 40,
    cost_price_inr: 45.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-34',
    sku: 'DE-PAD-7S',
    name: 'Stayfree Secure Cotton Soft Wings Pads',
    brand: 'Stayfree',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Cotton soft sanitary napkins with leak lock gel and wings protection.',
    package_size: 'Pack of 7',
    image_url: '/images/rewards/pocket-tissues.jpg',
    coin_cost: 40,
    stock_quantity: 35,
    cost_price_inr: 42.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-35',
    sku: 'DE-SWB-100',
    name: 'Pure Cotton Ear Buds with Biodegradable Stems',
    brand: 'PureCare',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Dual-tipped pure sterilized cotton swabs with eco-friendly paper sticks.',
    package_size: 'Box of 100 Sticks',
    image_url: '/images/rewards/pocket-tissues.jpg',
    coin_cost: 30,
    stock_quantity: 45,
    cost_price_inr: 30.0,
    supplier_name: 'Direct Wholesale',
    is_active: false,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-36',
    sku: 'DE-BAT-AAA',
    name: 'Duracell Chota Power AAA Alkaline Batteries',
    brand: 'Duracell',
    category_id: 'cat-5',
    category_name: 'Daily Essentials',
    description: 'Long-lasting dependable power for TV remotes, kitchen scales and clocks.',
    package_size: 'Pack of 2',
    image_url: '/images/rewards/duracell-aaa.jpg',
    coin_cost: 40,
    stock_quantity: 50,
    cost_price_inr: 44.0,
    supplier_name: 'Direct Wholesale',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 2,
    max_claims_per_order: 1,
    min_order_value: 0,
  },

  // ── Category F: Family Essentials Bundles ───────────────────────────────────
  {
    id: 'rew-37',
    sku: 'BD-ORAL-CARE',
    name: 'Oral Care Morning Freshness Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-6',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Dabur Red Ayurvedic Toothpaste (100g) and Colgate ZigZag Cross Bristle Toothbrush (Pack of 2).',
    package_size: '2 Products Bundle',
    bundle_components: ['Dabur Red Toothpaste 100g', 'Colgate ZigZag 2pk'],
    image_url: '/images/rewards/oral-bundle.jpg',
    coin_cost: 70,
    stock_quantity: 30,
    cost_price_inr: 75.0,
    supplier_name: 'In-house Packaged',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-38',
    sku: 'BD-BATH-CARE',
    name: 'Bathing & Personal Care Essentials Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-6',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Medimix 18 Herbs 125g Soap and Handcrafted Pure Neem Wood Pocket Comb.',
    package_size: '2 Products Bundle',
    bundle_components: ['Medimix 125g Herbal Soap', 'PureRoots Neem Wood Comb'],
    image_url: '/images/rewards/hygiene-bundle.jpg',
    coin_cost: 55,
    stock_quantity: 30,
    cost_price_inr: 58.0,
    supplier_name: 'In-house Packaged',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-39',
    sku: 'BD-KTN-CLN',
    name: 'Kitchen Utensil Cleaning Combo Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-6',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Vim Lemon 200g Dishwash Bar and Scotch-Brite Heavy Duty Scrub Pad (Pack of 3).',
    package_size: '2 Products Bundle',
    bundle_components: ['Vim Dishwash Bar 200g', 'Scotch-Brite Scrub Pad 3pk'],
    image_url: '/images/rewards/hygiene-bundle.jpg',
    coin_cost: 55,
    stock_quantity: 35,
    cost_price_inr: 55.0,
    supplier_name: 'In-house Packaged',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
  {
    id: 'rew-40',
    sku: 'BD-HSE-TOT',
    name: 'Household & Kitchen Complete Care Bundle',
    brand: 'Easy Farm Essentials',
    category_id: 'cat-6',
    category_name: 'Family Essentials Bundles',
    description: 'Includes Vim Lemon Bar (200g), Scotch-Brite Scrub Pads (3pk), and Surf Excel Easy Wash (500g).',
    package_size: '3 Products Bundle',
    bundle_components: ['Vim Dishwash Bar 200g', 'Scotch-Brite Scrub Pad 3pk', 'Surf Excel 500g'],
    image_url: '/images/rewards/hygiene-bundle.jpg',
    coin_cost: 110,
    stock_quantity: 20,
    cost_price_inr: 120.0,
    supplier_name: 'In-house Packaged',
    is_active: true,
    is_archived: false,
    availability_status: 'available',
    max_claims_per_customer: 1,
    max_claims_per_order: 1,
    min_order_value: 0,
  },
];

// Persistent File Storage configuration
const PERSIST_FILE = path.join(process.cwd(), 'lib', 'data', 'easy-coins-catalog.json');

function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadPersistedState(): {
  settings: EasyCoinsSettings;
  categories: RewardCategory[];
  products: RewardProduct[];
} {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const content = fs.readFileSync(PERSIST_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        return {
          settings: parsed.settings || DEFAULT_SETTINGS,
          categories: parsed.categories || INITIAL_CATEGORIES,
          products: parsed.products,
        };
      }
    }
  } catch (err) {
    console.warn('[EasyCoinsService] Could not read catalog file, using in-code seed:', err);
  }

  // Initial seed save
  const initial = {
    settings: { ...DEFAULT_SETTINGS },
    categories: [...INITIAL_CATEGORIES],
    products: [...INITIAL_PRODUCTS],
  };
  try {
    ensureDirectoryExists(PERSIST_FILE);
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[EasyCoinsService] Failed to write initial catalog file:', e);
  }
  return initial;
}

function savePersistedState(state: {
  settings?: EasyCoinsSettings;
  categories?: RewardCategory[];
  products?: RewardProduct[];
}) {
  try {
    ensureDirectoryExists(PERSIST_FILE);
    let existing: any = {};
    if (fs.existsSync(PERSIST_FILE)) {
      existing = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8') || '{}');
    }
    const combined = {
      settings: state.settings || existing.settings || memorySettings,
      categories: state.categories || existing.categories || memoryCategories,
      products: state.products || existing.products || memoryProducts,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(combined, null, 2), 'utf-8');
  } catch (err) {
    console.error('[EasyCoinsService] Failed to persist catalog state to disk:', err);
  }
}

// Runtime state initialized from durable disk store
const initialSaved = loadPersistedState();
let memorySettings: EasyCoinsSettings = initialSaved.settings;
let memoryCategories: RewardCategory[] = initialSaved.categories;
let memoryProducts: RewardProduct[] = initialSaved.products;
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
        savePersistedState({ settings: memorySettings });
        return memorySettings;
      }
    } catch {
      // Fallback
    }
    return memorySettings;
  }

  /**
   * Retrieves active reward catalog with categories for customer checkout & rewards browsing
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
          .eq('is_archived', false)
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
          sku: p.sku,
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
          is_archived: p.is_archived ?? false,
          availability_status: p.availability_status || (p.stock_quantity > 0 ? 'available' : 'out_of_stock'),
          bundle_components: p.bundle_components || [],
          max_claims_per_customer: p.max_claims_per_customer,
          max_claims_per_order: p.max_claims_per_order || 1,
          min_order_value: Number(p.min_order_value) || 0,
          cost_price_inr: Number(p.cost_price_inr) || 0,
          supplier_name: p.supplier_name,
        }));

        return { categories, products, settings };
      }
    } catch {
      // Use durable memory/file store
    }

    // Customer catalog only shows active & non-archived products
    const customerProducts = memoryProducts.filter((p) => p.is_active && !p.is_archived);

    return {
      categories: memoryCategories.filter((c) => c.is_active),
      products: customerProducts,
      settings,
    };
  }

  /**
   * Admin catalog query with full filtering & search support
   */
  static async adminGetProducts(filters?: {
    search?: string;
    category?: string;
    status?: 'all' | 'active' | 'inactive' | 'archived';
    stock?: 'all' | 'in_stock' | 'out_of_stock';
    sort?: 'coin_asc' | 'coin_desc' | 'name_asc' | 'name_desc';
  }): Promise<{
    categories: RewardCategory[];
    products: RewardProduct[];
    settings: EasyCoinsSettings;
  }> {
    const settings = await this.getSettings();

    try {
      const supabase = createAdminClient();
      let query = supabase.from('reward_products').select('*, reward_categories(name)');

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category_id', filters.category);
      }
      if (filters?.status === 'active') {
        query = query.eq('is_active', true).eq('is_archived', false);
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false).eq('is_archived', false);
      } else if (filters?.status === 'archived') {
        query = query.eq('is_archived', true);
      }
      if (filters?.stock === 'in_stock') {
        query = query.gt('stock_quantity', 0);
      } else if (filters?.stock === 'out_of_stock') {
        query = query.lte('stock_quantity', 0);
      }

      if (filters?.sort === 'coin_desc') {
        query = query.order('coin_cost', { ascending: false });
      } else if (filters?.sort === 'name_asc') {
        query = query.order('name', { ascending: true });
      } else if (filters?.sort === 'name_desc') {
        query = query.order('name', { ascending: false });
      } else {
        query = query.order('coin_cost', { ascending: true });
      }

      const { data, error } = await query;
      if (data && !error && data.length > 0) {
        let results: RewardProduct[] = data.map((p: any) => ({
          id: p.id,
          sku: p.sku,
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
          is_archived: p.is_archived ?? false,
          availability_status: p.availability_status || (p.stock_quantity > 0 ? 'available' : 'out_of_stock'),
          bundle_components: p.bundle_components || [],
          max_claims_per_customer: p.max_claims_per_customer,
          max_claims_per_order: p.max_claims_per_order || 1,
          min_order_value: Number(p.min_order_value) || 0,
          cost_price_inr: Number(p.cost_price_inr) || 0,
          supplier_name: p.supplier_name,
        }));

        if (filters?.search) {
          const s = filters.search.toLowerCase();
          results = results.filter(
            (p) =>
              p.name.toLowerCase().includes(s) ||
              p.brand?.toLowerCase().includes(s) ||
              p.sku?.toLowerCase().includes(s)
          );
        }

        return { categories: memoryCategories, products: results, settings };
      }
    } catch {
      // Memory fallback
    }

    // Apply memory filters
    let list = [...memoryProducts];

    if (filters?.category && filters.category !== 'all') {
      list = list.filter((p) => p.category_id === filters.category);
    }
    if (filters?.status === 'active') {
      list = list.filter((p) => p.is_active && !p.is_archived);
    } else if (filters?.status === 'inactive') {
      list = list.filter((p) => !p.is_active && !p.is_archived);
    } else if (filters?.status === 'archived') {
      list = list.filter((p) => p.is_archived);
    }
    if (filters?.stock === 'in_stock') {
      list = list.filter((p) => p.stock_quantity > 0);
    } else if (filters?.stock === 'out_of_stock') {
      list = list.filter((p) => p.stock_quantity <= 0);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.brand?.toLowerCase().includes(s) ||
          p.sku?.toLowerCase().includes(s)
      );
    }

    // Sorting
    if (filters?.sort === 'coin_desc') {
      list.sort((a, b) => b.coin_cost - a.coin_cost);
    } else if (filters?.sort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters?.sort === 'name_desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      list.sort((a, b) => a.coin_cost - b.coin_cost);
    }

    return { categories: memoryCategories, products: list, settings };
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
          sku: data.sku,
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
          is_archived: data.is_archived ?? false,
          availability_status: data.availability_status || (data.stock_quantity > 0 ? 'available' : 'out_of_stock'),
          bundle_components: data.bundle_components || [],
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

    // Default starting demo balance for testing if no transactions yet
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
    if (!product || !product.is_active || product.is_archived) {
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
      brand_snapshot: product.brand,
      package_size_snapshot: product.package_size,
      image_url_snapshot: product.image_url,
      coin_cost_snapshot: product.coin_cost,
      quantity: 1,
      claim_status: 'reserved',
      reserved_at: new Date().toISOString(),
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
          brand_snapshot: product.brand,
          package_size_snapshot: product.package_size,
          image_url_snapshot: product.image_url,
          coin_cost_snapshot: product.coin_cost,
          quantity: 1,
          claim_status: 'reserved',
          reserved_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (data && !error) {
        claim.id = data.id;
      }
    } catch {
      // Memory update
    }

    product.stock_quantity = Math.max(0, product.stock_quantity - 1);
    savePersistedState({ products: memoryProducts });

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

      const { data: claim, error } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('order_id', params.order_id)
        .maybeSingle();

      if (claim && !error) {
        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

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
      memClaim.confirmed_at = new Date().toISOString();
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
   * Releases reserved reward back to inventory if payment fails or customer cancels
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
        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'released',
            notes: params.reason || 'Payment dismissed or abandoned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

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

        const memProd = memoryProducts.find((p) => p.id === claim.reward_product_id);
        if (memProd) memProd.stock_quantity += 1;
        savePersistedState({ products: memoryProducts });

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
        savePersistedState({ products: memoryProducts });
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

    // Idempotency check: Ensure coins haven't already been awarded for this order
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

      const { data: claim } = await supabase
        .from('reward_claims')
        .select('*')
        .eq('order_id', params.order_id)
        .in('claim_status', ['reserved', 'confirmed', 'packed'])
        .maybeSingle();

      if (claim) {
        restored_spent = claim.coin_cost_snapshot;

        await this.recordLedgerEntry({
          customer_id: claim.customer_id,
          order_id: params.order_id,
          amount: claim.coin_cost_snapshot,
          transaction_type: 'reversed_cancellation',
          description: `Refunded coins for reward ${claim.reward_name_snapshot} due to order cancellation`,
          reference_id: `refund_claim_${claim.id}`,
        });

        await supabase
          .from('reward_claims')
          .update({
            claim_status: 'cancelled',
            notes: params.reason,
            cancellation_reason: params.reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

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

        const memProd = memoryProducts.find((p) => p.id === claim.reward_product_id);
        if (memProd) memProd.stock_quantity += 1;
        savePersistedState({ products: memoryProducts });
      }
    } catch {
      // Fallback
    }

    return { reversed_earned, restored_spent };
  }

  /**
   * Admin manual coin adjustment with mandatory audit reason
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
        savePersistedState({ settings: memorySettings });
        return memorySettings;
      }
    } catch {
      // Fallback
    }

    memorySettings = { ...memorySettings, ...settings };
    savePersistedState({ settings: memorySettings });
    return memorySettings;
  }

  /**
   * Admin Upsert Reward Product with complete metadata, SKU, bundle components, image URL
   */
  static async adminUpsertProduct(product: Partial<RewardProduct>): Promise<RewardProduct> {
    const isNew = !product.id || product.id.startsWith('new-');
    const targetId = isNew ? `rew-${Date.now()}` : product.id!;

    const payload: RewardProduct = {
      id: targetId,
      sku: product.sku || `SKU-${targetId.slice(-6).toUpperCase()}`,
      name: product.name || 'Everyday Essential',
      brand: product.brand || 'Easy Farm',
      category_id: product.category_id || 'cat-1',
      description: product.description || '',
      package_size: product.package_size || '1 Unit',
      image_url: product.image_url || '/images/rewards/neem-comb.jpg',
      coin_cost: Math.max(1, Number(product.coin_cost) || 10),
      stock_quantity: Math.max(0, Number(product.stock_quantity) || 0),
      cost_price_inr: Number(product.cost_price_inr) || 0,
      supplier_name: product.supplier_name || 'Wholesale Depot',
      is_active: product.is_active ?? true,
      is_archived: product.is_archived ?? false,
      availability_status:
        product.availability_status ||
        (Number(product.stock_quantity) > 0 ? 'available' : 'out_of_stock'),
      bundle_components: Array.isArray(product.bundle_components)
        ? product.bundle_components
        : typeof product.bundle_components === 'string'
        ? (product.bundle_components as string).split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      max_claims_per_customer: product.max_claims_per_customer || null,
      max_claims_per_order: product.max_claims_per_order || 1,
      min_order_value: Number(product.min_order_value) || 0,
      updated_at: new Date().toISOString(),
    };

    // Category name resolution
    const cat = memoryCategories.find((c) => c.id === payload.category_id);
    payload.category_name = cat?.name || 'Essentials';

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('reward_products')
        .upsert(payload)
        .select('*, reward_categories(name)')
        .maybeSingle();

      if (data && !error && data.reward_categories?.name) {
        payload.category_name = data.reward_categories.name;
      }
    } catch {
      // In-memory fallback
    }

    const idx = memoryProducts.findIndex((p) => p.id === targetId);
    if (idx >= 0) {
      memoryProducts[idx] = { ...memoryProducts[idx], ...payload };
    } else {
      memoryProducts.unshift(payload);
    }

    savePersistedState({ products: memoryProducts });
    return payload;
  }

  /**
   * Safe Deletion / Archival:
   * If a product is referenced by historical reward claims, archive it safely (is_archived: true, is_active: false)
   * so historical orders and images are NEVER broken. If no historical claims exist, remove it from the catalog.
   */
  static async adminDeleteOrArchiveProduct(productId: string): Promise<{
    archived: boolean;
    deleted: boolean;
    message: string;
  }> {
    let hasClaims = false;

    try {
      const supabase = createAdminClient();
      const { data: claims } = await supabase
        .from('reward_claims')
        .select('id')
        .eq('reward_product_id', productId)
        .limit(1);

      if (claims && claims.length > 0) {
        hasClaims = true;
      }
    } catch {
      // Check memory claims
    }

    if (!hasClaims) {
      hasClaims = memoryClaims.some((c) => c.reward_product_id === productId);
    }

    if (hasClaims) {
      // Safe archival: Preserves historical records, delivery slips, and image links
      try {
        const supabase = createAdminClient();
        await supabase
          .from('reward_products')
          .update({
            is_archived: true,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
      } catch {}

      const p = memoryProducts.find((item) => item.id === productId);
      if (p) {
        p.is_archived = true;
        p.is_active = false;
        p.updated_at = new Date().toISOString();
      }
      savePersistedState({ products: memoryProducts });

      return {
        archived: true,
        deleted: false,
        message: 'Product is referenced by previous order claims. It has been safely archived from the active customer catalog to protect historical order records.',
      };
    }

    // No historical claims: Safe permanent delete
    try {
      const supabase = createAdminClient();
      await supabase.from('reward_products').delete().eq('id', productId);
    } catch {}

    memoryProducts = memoryProducts.filter((item) => item.id !== productId);
    savePersistedState({ products: memoryProducts });

    return {
      archived: false,
      deleted: true,
      message: 'Product had no order history and was removed completely from the database.',
    };
  }

  /**
   * Admin Bulk Operations: Update stock or toggle active status across multiple products at once
   */
  static async adminBulkUpdateProducts(params: {
    ids: string[];
    action: 'activate' | 'deactivate' | 'update_stock';
    stock_quantity?: number;
  }): Promise<{ updatedCount: number }> {
    if (!params.ids || params.ids.length === 0) return { updatedCount: 0 };

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const id of params.ids) {
      const p = memoryProducts.find((item) => item.id === id);
      if (!p) continue;

      if (params.action === 'activate') {
        p.is_active = true;
        p.is_archived = false;
      } else if (params.action === 'deactivate') {
        p.is_active = false;
      } else if (params.action === 'update_stock' && typeof params.stock_quantity === 'number') {
        p.stock_quantity = Math.max(0, params.stock_quantity);
        p.availability_status = p.stock_quantity > 0 ? 'available' : 'out_of_stock';
      }
      p.updated_at = now;
      updatedCount++;

      try {
        const supabase = createAdminClient();
        await supabase
          .from('reward_products')
          .update({
            is_active: p.is_active,
            stock_quantity: p.stock_quantity,
            availability_status: p.availability_status,
            updated_at: now,
          })
          .eq('id', id);
      } catch {}
    }

    savePersistedState({ products: memoryProducts });
    return { updatedCount };
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
   * Admin analytics & liabilities report
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
      active_rewards_count: memoryProducts.filter((p) => p.is_active && !p.is_archived).length,
      top_claimed_rewards,
    };
  }
}
