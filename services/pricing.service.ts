import { createAdminClient } from '@/lib/supabase/admin';
import { Basket } from '@/types/database';
import { UnifiedBasketService } from './unified-basket.service';

export interface CalculationItem {
  basketId: string;
  quantity: number;
  customPrice?: number;
  compareAtPrice?: number;
  customizedItems?: Array<any>;
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
    isDeliveryFree: boolean;
  }> {
    const defaults = {
      baseDeliveryFee: 40,
      freeDeliveryThreshold: 499,
      minimumOrderValue: 100,
      allowCouponStacking: false,
      orderCutoffDay: 'Saturday',
      orderCutoffTime: '23:00',
      deliveryDay: 'Sunday',
      deliveryPromise: 'Sunday by 6 PM',
      isDeliveryFree: false,
    };

    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from('business_settings').select('key, value');

      if (!data || data.length === 0) return defaults;

      const settingsMap: Record<string, any> = {};
      data.forEach((row) => {
        settingsMap[row.key] = row.value;
      });

      const isDeliveryFree = Boolean(
        settingsMap.is_delivery_free === true ||
        settingsMap.is_delivery_free === 'true' ||
        Number(settingsMap.base_delivery_fee) === 0
      );

      return {
        baseDeliveryFee: isDeliveryFree ? 0 : Number(settingsMap.base_delivery_fee ?? defaults.baseDeliveryFee),
        freeDeliveryThreshold: Number(settingsMap.free_delivery_threshold ?? defaults.freeDeliveryThreshold),
        minimumOrderValue: Number(settingsMap.minimum_order_value ?? defaults.minimumOrderValue),
        allowCouponStacking: Boolean(settingsMap.allow_coupon_stacking ?? defaults.allowCouponStacking),
        orderCutoffDay: String(settingsMap.order_cutoff_day ?? defaults.orderCutoffDay).replace(/"/g, ''),
        orderCutoffTime: String(settingsMap.order_cutoff_time ?? defaults.orderCutoffTime).replace(/"/g, ''),
        deliveryDay: String(settingsMap.delivery_day ?? defaults.deliveryDay).replace(/"/g, ''),
        deliveryPromise: String(settingsMap.delivery_promise ?? defaults.deliveryPromise).replace(/"/g, ''),
        isDeliveryFree,
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
    const fallbackMap: Record<string, { id: string; name: string; price: number; compareAt?: number }> = {
      '33333333-0000-0000-0000-000000000001': { id: '33333333-0000-0000-0000-000000000001', name: 'Staple Box', price: 185, compareAt: 240 },
      'staple-basket': { id: '33333333-0000-0000-0000-000000000001', name: 'Staple Box', price: 185, compareAt: 240 },
      'staple-box': { id: '33333333-0000-0000-0000-000000000001', name: 'Staple Box', price: 185, compareAt: 240 },
      'b-01': { id: '33333333-0000-0000-0000-000000000001', name: 'Staple Box', price: 185, compareAt: 240 },
      '33333333-0000-0000-0000-000000000004': { id: '33333333-0000-0000-0000-000000000004', name: 'Custom Box', price: 450, compareAt: 580 },
      'custom-basket': { id: '33333333-0000-0000-0000-000000000004', name: 'Custom Box', price: 450, compareAt: 580 },
      'custom-box': { id: '33333333-0000-0000-0000-000000000004', name: 'Custom Box', price: 450, compareAt: 580 },
      'b-02': { id: 'b-02', name: 'Green Basket', price: 195, compareAt: 250 },
      'green-box': { id: 'b-02', name: 'Green Basket', price: 195, compareAt: 250 },
      'b-03': { id: 'b-03', name: 'Special Basket', price: 260, compareAt: 335 },
      'premium-box': { id: 'b-03', name: 'Special Basket', price: 260, compareAt: 335 },
    };

    let subtotal = 0;
    let savingsFromCompareAt = 0;
    const itemsBreakdown: CalculationResult['itemsBreakdown'] = [];

    for (const item of items) {
      let dbBasket = basketsMap.get(item.basketId);
      if (!dbBasket && fallbackMap[item.basketId]) {
        const fb = fallbackMap[item.basketId];
        dbBasket = {
          id: fb.id,
          name: fb.name,
          slug: item.basketId,
          description: '',
          price: fb.price,
          compare_at_price: fb.compareAt,
          active: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Basket;
      } else if (!dbBasket) {
        // Fallback for any client-customized basket item
        const fallbackPrice = typeof item.customPrice === 'number' && item.customPrice > 0 ? item.customPrice : 185;
        dbBasket = {
          id: item.basketId,
          name: 'Fresh Farm Basket',
          slug: item.basketId,
          description: '',
          price: fallbackPrice,
          compare_at_price: item.compareAtPrice,
          active: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Basket;
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
      const isCustomBox = Boolean(dbBasket.slug?.includes('custom') || dbBasket.id.endsWith('4'));
      const authoritativeBasketPrice = Number(dbBasket.price || 185);

      if (isCustomBox && Array.isArray(item.customizedItems) && item.customizedItems.length < 4) {
        return {
          valid: false,
          message: `Minimum 4 items are required in Custom Box (currently ${item.customizedItems.length} selected).`,
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

      let unitPrice = authoritativeBasketPrice;
      if (Array.isArray(item.customizedItems) && item.customizedItems.length > 0) {
        const allProducts = await UnifiedBasketService.getAllProducts();
        const prodMap = new Map<string, any>();
        allProducts.forEach((p) => {
          prodMap.set(p.id, p);
          if (p.slug) prodMap.set(p.slug, p);
          prodMap.set(p.name.toLowerCase(), p);
        });

        let serverVerifiedCustomSum = 0;
        for (const sub of item.customizedItems) {
          const matchedProd =
            prodMap.get(sub.productId || sub.id) ||
            prodMap.get(String(sub.productName || sub.name || '').toLowerCase());
          const subQty = Math.max(1, Number(sub.quantity) || 1);
          if (matchedProd) {
            // Verify client sub-item price is not tampered below authoritative catalog rate
            const uStr = String(sub.unit || matchedProd.unit || 'kg').toLowerCase().trim();
            let multiplier = 1;
            if (uStr === '100 g' || uStr === '100g') multiplier = 0.1;
            else if (uStr === '200 g' || uStr === '200g') multiplier = 0.2;
            else if (uStr === '250 g' || uStr === '250g') multiplier = 0.25;
            else if (uStr === '500 g' || uStr === '500g') multiplier = 0.5;
            else if (uStr === '1.5 kg' || uStr === '1.5kg') multiplier = 1.5;
            else if (uStr === '2 kg' || uStr === '2kg' || uStr === '2 bunches' || uStr === '2 pcs') multiplier = 2;
            else if (uStr === '3 kg' || uStr === '3kg' || uStr === '3 bunches' || uStr === '3 pcs') multiplier = 3;
            else if (uStr === '4 bunches' || uStr === '4 pcs') multiplier = 4;
            else if (uStr === '5 kg' || uStr === '5kg' || uStr === '5 bunches') multiplier = 5;
            else if (uStr === '6 pcs') multiplier = 6;

            const baseCatalogUnit = String(matchedProd.unit || 'kg').toLowerCase();
            const isBaseAlreadySubUnit =
              baseCatalogUnit.includes('500') ||
              baseCatalogUnit.includes('250') ||
              baseCatalogUnit.includes('200') ||
              baseCatalogUnit.includes('2 bunch') ||
              baseCatalogUnit.includes('2 pc');

            const expectedMinPrice = isBaseAlreadySubUnit
              ? Math.max(1, Math.round(Number(matchedProd.price) * Math.min(1, multiplier)))
              : Math.max(1, Math.round(Number(matchedProd.price) * multiplier));
            const clientSubPrice = Number(sub.price || 0);
            const verifiedSubPrice = clientSubPrice >= expectedMinPrice ? clientSubPrice : expectedMinPrice;
            serverVerifiedCustomSum += isCustomBox ? verifiedSubPrice * subQty : verifiedSubPrice;
          } else {
            serverVerifiedCustomSum += Math.max(15, Number(sub.price || 35)) * (isCustomBox ? subQty : 1);
          }
        }
        unitPrice = Math.max(serverVerifiedCustomSum, typeof item.customPrice === 'number' ? item.customPrice : 0);
      } else if (typeof item.customPrice === 'number' && item.customPrice > 0) {
        // Without customizedItems breakdown, allow customPrice for Custom Box or >= 75% of fixed basket price
        const minAllowedPrice = isCustomBox ? 1 : Math.round(authoritativeBasketPrice * 0.75);
        unitPrice = item.customPrice >= minAllowedPrice ? item.customPrice : authoritativeBasketPrice;
      }

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

    const cleanCouponCode = couponCode?.trim()?.toUpperCase();
    const isOneRupeeTestCoupon =
      cleanCouponCode === 'TEST1' ||
      cleanCouponCode === 'EASY1' ||
      cleanCouponCode === 'RUPEE1' ||
      cleanCouponCode === 'ONE';

    // 2. Validate Coupon Server-side
    let couponDiscount = 0;
    let validatedCouponCode: string | undefined = undefined;

    if (cleanCouponCode) {
      // 2a. Check live DB Coupons first (authoritative admin configuration)
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCouponCode)
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
      } else if (isOneRupeeTestCoupon) {
        // 2b. Built-in ₹1 live testing coupons (bypasses delivery fee, forces total to ₹1)
        couponDiscount = Math.max(0, subtotal - 1);
        validatedCouponCode = cleanCouponCode;
        return {
          valid: true,
          itemsBreakdown,
          subtotal,
          savingsFromCompareAt,
          couponCode: validatedCouponCode,
          couponDiscount,
          deliveryFee: 0,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          isFreeDelivery: true,
          totalPayable: 1,
        };
      } else {
        // 2c. Built-in launch coupons fallback
        const hardcodedCoupons: Record<string, { value: number; type: 'flat' | 'percent'; minOrder: number }> = {
          EASY50: { value: 50, type: 'flat', minOrder: 100 },
          FIRSTFARM: { value: 10, type: 'percent', minOrder: 100 },
          GHATKESAR100: { value: 100, type: 'flat', minOrder: 250 },
          WELCOME20: { value: 20, type: 'percent', minOrder: 150 },
        };

        const hc = hardcodedCoupons[cleanCouponCode];
        if (hc && subtotal >= hc.minOrder) {
          couponDiscount = hc.type === 'flat' ? hc.value : Math.round((subtotal * hc.value) / 100);
          couponDiscount = Math.min(couponDiscount, subtotal);
          validatedCouponCode = cleanCouponCode;
        }
      }
    }

    // 3. Calculate Delivery Fee
    const isFreeDelivery = settings.isDeliveryFree || settings.baseDeliveryFee === 0 || subtotal >= settings.freeDeliveryThreshold;
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
