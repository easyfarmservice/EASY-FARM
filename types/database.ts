export type UserRole = 'customer' | 'admin' | 'farmer' | 'delivery_manager';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'customer_unavailable'
  | 'rescheduled'
  | 'cancelled'
  | 'failed';

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  photo_url?: string;
  description?: string;
  upi_identifier?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  price: number;
  unit: string;
  image_url?: string;
  active: boolean;
  cost_price?: number;
  cost_unit?: string;
  market_price?: number;
  market_source?: string;
  market_updated_at?: string;
  is_seasonal?: boolean;
  is_swap_eligible?: boolean;
  eligible_baskets?: string[];
  created_at: string;
  updated_at: string;
}

export interface BasketItem {
  id: string;
  basket_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit: string;
  item_price?: number;
  compare_at_price?: number;
  unit_cost_price?: number;
  market_price_ref?: number;
  sort_order?: number;
  is_default?: boolean;
  is_fixed?: boolean;
  is_optional?: boolean;
}

export interface Basket {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number;   // Added in migration 006
  base_price?: number;         // Cost price reference
  cost_price?: number;
  calculated_price?: number;
  pricing_mode?: 'automatic' | 'manual';
  packing_cost?: number;
  target_margin_pct?: number;
  market_reference_price?: number;
  is_customizable?: boolean;
  max_swaps?: number;
  items_count?: number;
  image_url?: string;
  active: boolean;
  is_available?: boolean;
  is_featured?: boolean;
  stock?: number;
  max_orders?: number;
  min_order_qty?: number;
  max_order_qty?: number;
  sort_order: number;
  items?: BasketItem[];
  created_at: string;
  updated_at: string;
}

export interface WeeklyBasket {
  id: string;
  basket_id: string;
  basket?: Basket;
  delivery_week: string; // ISO date YYYY-MM-DD representing Sunday/delivery date
  status: 'draft' | 'published' | 'archived';
  cutoff_datetime: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  items?: WeeklyBasketItem[];
}

export interface WeeklyBasketItem {
  id: string;
  weekly_basket_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  market_price?: number;
  is_default: boolean;
  sort_order: number;
}

export interface CustomerBasketCustomization {
  id: string;
  customer_id: string;
  basket_id: string;
  delivery_week: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    price: number;
    is_swapped?: boolean;
    replaced_product_id?: string;
  }>;
  swaps_used: number;
  status: 'saved' | 'confirmed' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface ProductSubstitution {
  id: string;
  original_product_id: string;
  replacement_product_id: string;
  affected_week?: string;
  basket_id?: string;
  reason: string;
  admin_id?: string;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  polygon?: any;
  active: boolean;
  delivery_day: string;
  order_cutoff_day: string;
  order_cutoff_time: string;
  delivery_promise: string;
  delivery_fee: number;
  minimum_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryArea {
  id: string;
  zone_id: string;
  name: string;
  slug: string;
  pincodes: string[];
  active: boolean;
  created_at: string;
}

export interface DeliveryLocation {
  id: string;
  area_id: string;
  building_name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  full_address: string;
  apartment?: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  delivery_zone_id?: string;
  delivery_area_id?: string;
  delivery_location_id?: string;
  is_default: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  basket_id?: string;
  basket_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  basket?: Basket;
}

export interface Order {
  id: string;
  customer_id: string;
  address_id?: string;
  delivery_zone_id?: string;
  delivery_area_id?: string;
  delivery_location_id?: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_date: string;
  order_window_start?: string;
  order_window_end?: string;
  notes?: string;
  delivery_otp_hash?: string;
  otp_created_at?: string;
  otp_expires_at?: string;
  otp_verified?: boolean;
  otp_attempts?: number;
  otp_last_attempt_at?: string;
  delivered_at?: string;
  delivery_person_type?: 'FOUNDER' | 'DELIVERY_PARTNER';
  delivery_person_name?: string;
  delivery_assigned_at?: string;
  failure_reason?: string;
  rescheduled_date?: string;
  reschedule_reason?: string;
  items?: OrderItem[];
  address?: CustomerAddress;
  customer?: Profile;
  payment?: Payment;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_order_id?: string;
  provider_payment_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  product?: Product;
  available_quantity: number;
  reserved_quantity: number;
  unit: string;
  low_stock_threshold: number;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  phone: string;
  email: string;
  pincode: string;
  locality: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface FarmerPayment {
  id: string;
  farmer_id: string;
  farmer?: Farmer;
  produce: string;
  quantity: number;
  unit: string;
  rate: number;
  benchmark_rate: number;
  farmer_rate: number;
  payment_amount: number;
  payment_reference: string;
  payment_date: string;
  order_id?: string;
  created_at: string;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  content: string;
  rating: number;
  location: string;
  verified: boolean;
  is_demo: boolean;
  active: boolean;
  created_at: string;
}

export interface DeliveryCheckResult {
  available: boolean;
  zone_id?: string;
  zone_name?: string;
  area_id?: string;
  area_name?: string;
  delivery_fee: number;
  minimum_order: number;
  delivery_day?: string;
  delivery_promise?: string;
  message?: string;
}
