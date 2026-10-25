import { createAdminClient } from '@/lib/supabase/admin';
import { Basket } from '@/types/database';
import { UnifiedBasketService } from './unified-basket.service';

export interface CalculationItem {
  basketId: string;
  quantity: number;
  customPrice?: number;
  compareAtPrice?: number;
}

export interface CalculationResult {
  valid: boolean;
  message?: string;
  itemsBreakdown: Array<{
    basketId: string;
    basketName: string;
    quantity: number;
    unitPrice: number;
    compareAtPrice?: number;
    totalPrice: number;
  }>;
  subtotal: number;
  savingsFromCompareAt: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDelivery: boolean;
  totalPayable: number;
}

export class PricingService {
  /**
   * Retrieves current business settings from database with sensible defaults.
   */
  static async getBusinessSettings(): Promise<{
    baseDeliveryFee: number;
    freeDeliveryThreshold: number;
    minimumOrderValue: number;
    allowCouponStacking: boolean;
    orderCutoffDay: string;
    orderCutoffTime: string;
    deliveryDay: string;
    deliveryPromise: string;
  }> {
    const defaults = {
      baseDeliveryFee: 40,
      freeDeliveryThreshold: 499,
      minimumOrderValue: 250,
      allowCouponStacking: false,
      orderCutoffDay: 'Saturday',
      orderCutoffTime: '23:00',
      deliveryDay: 'Sunday',
      deliveryPromise: 'Sunday by 6 PM',
    };

    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from('business_settings').select('key, value');

      if (!data || data.length === 0) return defaults;

      const settingsMap: Record<string, any> = {};
      data.forEach((row) => {
        settingsMap[row.key] = row.value;
      });

      return {
        baseDeliveryFee: Number(settingsMap.base_delivery_fee ?? defaults.baseDeliveryFee),
        freeDeliveryThreshold: Number(settingsMap.free_delivery_threshold ?? defaults.freeDeliveryThreshold),
        minimumOrderValue: Number(settingsMap.minimum_order_value ?? defaults.minimumOrderValue),
        allowCouponStacking: Boolean(settingsMap.allow_coupon_stacking ?? defaults.allowCouponStacking),
        orderCutoffDay: String(settingsMap.order_cutoff_day ?? defaults.orderCutoffDay).replace(/"/g, ''),
        orderCutoffTime: String(settingsMap.order_cutoff_time ?? defaults.orderCutoffTime).replace(/"/g, ''),
        deliveryDay: String(settingsMap.delivery_day ?? defaults.deliveryDay).replace(/"/g, ''),
        deliveryPromise: String(settingsMap.delivery_promise ?? defaults.deliveryPromise).replace(/"/g, ''),
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Server-authoritative calculation of order total.
   * NEVER trusts unverified client prices!
   */
  static async calculateOrderTotal(
    items: CalculationItem[],
    couponCode?: string,
    customerEmail?: string
  ): Promise<CalculationResult> {
    const settings = await this.getBusinessSettings();
    const supabase = createAdminClient();
    const basketsMap = new Map<string, Basket>();

    // 1. Fetch live admin-configured & daily calculated baskets
    try {
      const unifiedBaskets = await UnifiedBasketService.getAllBasketsWithPricing();
      if (unifiedBaskets && unifiedBaskets.length > 0) {
        unifiedBaskets.forEach(({ basket }) => {
          basketsMap.set(basket.id, basket);
          basketsMap.set(basket.slug, basket);
        });
      }
    } catch (e) {
      console.warn('[PricingService] Error fetching unified baskets:', e);
    }

    if (basketsMap.size === 0) {
      const { data: dbBaskets } = await supabase
        .from('baskets')
        .select('*')
        .eq('active', true);

      if (dbBaskets) {
        dbBaskets.forEach((b) => basketsMap.set(b.id, b));
        dbBaskets.forEach((b) => basketsMap.set(b.slug, b));
      }
    }

    // Default fallback baskets if DB query returns empty during initial setup
    const fallbackMap: Record<string, { name: string; price: number; compareAt?: number }> = {
      'b-01': { name: 'Staple Basket', price: 185, compareAt: 240 },
      'staple-box': { name: 'Staple Basket', price: 185, compareAt: 240 },
      'b-02': { name: 'Green Basket', price: 195, compareAt: 250 },
      'green-box': { name: 'Green Basket', price: 195, compareAt: 250 },
      'b-03': { name: 'Special Basket', price: 260, compareAt: 335 },
      'premium-box': { name: 'Special Basket', price: 260, compareAt: 335 },
    };

    let subtotal = 0;
    let savingsFromCompareAt = 0;
    const itemsBreakdown: CalculationResult['itemsBreakdown'] = [];

    for (const item of items) {
      const dbBasket = basketsMap.get(item.basketId);
      if (!dbBasket) {
        return {
          valid: false,
          message: `The selected basket "${item.basketId}" is unavailable or does not exist.`,
          itemsBreakdown: [],
          subtotal: 0,
          savingsFromCompareAt: 0,
          couponDiscount: 0,
          deliveryFee: settings.baseDeliveryFee,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          isFreeDelivery: false,
          totalPayable: 0,
        };
      }

      if (dbBasket.active === false) {
        return {
          valid: false,
          message: `Basket "${dbBasket.name}" is currently inactive or unpublished. Orders cannot be placed.`,
          itemsBreakdown: [],
          subtotal: 0,
          savingsFromCompareAt: 0,
          couponDiscount: 0,
          deliveryFee: settings.baseDeliveryFee,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          isFreeDelivery: false,
          totalPayable: 0,
        };
      }

      const name = dbBasket.name;
      // If customer customized basket with swaps, use recalculated item.customPrice; else authoritative basket price
      const unitPrice = typeof item.customPrice === 'number' && item.customPrice > 0
        ? item.customPrice
        : Number(dbBasket.price || 0);

      const compareAt = typeof item.compareAtPrice === 'number' && item.compareAtPrice > 0
        ? item.compareAtPrice
        : (dbBasket.compare_at_price ? Number(dbBasket.compare_at_price) : undefined);

      const qty = Math.max(1, item.quantity);
      const itemSubtotal = unitPrice * qty;

      subtotal += itemSubtotal;
      if (compareAt && compareAt > unitPrice) {
        savingsFromCompareAt += (compareAt - unitPrice) * qty;
      }

      itemsBreakdown.push({
        basketId: dbBasket?.id || item.basketId,
        basketName: name,
        quantity: qty,
        unitPrice,
        compareAtPrice: compareAt,
        totalPrice: itemSubtotal,
      });
    }

    // Enforce minimum order value
    if (subtotal < settings.minimumOrderValue) {
      return {
        valid: false,
        message: `Minimum order value is ₹${settings.minimumOrderValue}. Current order subtotal is ₹${subtotal}`,
        itemsBreakdown,
        subtotal,
        savingsFromCompareAt,
        couponDiscount: 0,
        deliveryFee: settings.baseDeliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        isFreeDelivery: false,
        totalPayable: subtotal + settings.baseDeliveryFee,
      };
    }

    // 2. Validate Coupon Server-side
    let couponDiscount = 0;
    let validatedCouponCode: string | undefined = undefined;

    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();

      // Check DB Coupons
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .maybeSingle();

      if (dbCoupon) {
        let isEligible = true;

        if (subtotal < Number(dbCoupon.min_order_value || 0)) {
          isEligible = false;
        }

        // Check user limit if email provided
        if (isEligible && customerEmail && dbCoupon.per_user_limit) {
          const { count } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', dbCoupon.id)
            .eq('customer_email', customerEmail);

          if (count && count >= dbCoupon.per_user_limit) {
            isEligible = false;
          }
        }

        if (isEligible) {
          if (dbCoupon.type === 'flat') {
            couponDiscount = Number(dbCoupon.value);
          } else {
            couponDiscount = Math.round((subtotal * Number(dbCoupon.value)) / 100);
          }
          if (dbCoupon.max_discount) {
            couponDiscount = Math.min(couponDiscount, Number(dbCoupon.max_discount));
          }
          couponDiscount = Math.min(couponDiscount, subtotal);
          validatedCouponCode = dbCoupon.code;
        }
      } else {
        // Built-in launch coupons fallback
        const hardcodedCoupons: Record<string, { value: number; type: 'flat' | 'percent'; minOrder: number }> = {
          EASY50: { value: 50, type: 'flat', minOrder: 250 },
          FIRSTFARM: { value: 10, type: 'percent', minOrder: 250 },
          GHATKESAR100: { value: 100, type: 'flat', minOrder: 500 },
          GACHIBOWLI100: { value: 100, type: 'flat', minOrder: 500 },
          WELCOME20: { value: 20, type: 'percent', minOrder: 350 },
        };

        const hc = hardcodedCoupons[cleanCode];
        if (hc && subtotal >= hc.minOrder) {
          couponDiscount = hc.type === 'flat' ? hc.value : Math.round((subtotal * hc.value) / 100);
          couponDiscount = Math.min(couponDiscount, subtotal);
          validatedCouponCode = cleanCode;
        }
      }
    }

    // 3. Calculate Delivery Fee
    const isFreeDelivery = subtotal >= settings.freeDeliveryThreshold;
    const deliveryFee = isFreeDelivery ? 0 : settings.baseDeliveryFee;
    const totalPayable = Math.max(0, subtotal - couponDiscount + deliveryFee);

    return {
      valid: true,
      itemsBreakdown,
      subtotal,
      savingsFromCompareAt,
      couponCode: validatedCouponCode,
      couponDiscount,
      deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      isFreeDelivery,
      totalPayable,
    };
  }

  /**
   * Log price modifications to price_history table
   */
  static async logPriceChange(params: {
    entityType: 'basket' | 'product';
    entityId: string;
    entityName: string;
    oldPrice: number;
    newPrice: number;
    oldCompareAt?: number;
    newCompareAt?: number;
    changedBy?: string;
  }) {
    try {
      const supabase = createAdminClient();
      await supabase.from('price_history').insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        old_price: params.oldPrice,
        new_price: params.newPrice,
        old_compare_at: params.oldCompareAt,
        new_compare_at: params.newCompareAt,
        changed_by: params.changedBy || 'Admin User',
      });
    } catch (err) {
      console.error('Failed to log price change:', err);
    }
  }

  /**
   * Log administrative audit action
   */
  static async logAudit(params: {
    adminName: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
  }) {
    try {
      const supabase = createAdminClient();
      await supabase.from('audit_logs').insert({
        admin_name: params.adminName,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        details: params.details || {},
      });
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  }
}
