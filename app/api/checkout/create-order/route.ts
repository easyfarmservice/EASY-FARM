import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService } from '@/services/delivery.service';
import { PricingService } from '@/services/pricing.service';
import { PaymentService } from '@/services/payment.service';
import { EmailService } from '@/services/email.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { EasyCoinsService } from '@/services/easy-coins.service';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      basketId: z.string().min(1, 'Basket ID is required'),
      basketName: z.string().optional(),
      quantity: z.number().int().positive('Quantity must be greater than zero'),
      customPrice: z.number().optional(),
      compareAtPrice: z.number().optional(),
      customizedItems: z.array(z.any()).optional(),
    })
  ).min(1, 'At least one basket is required to place an order'),
  address: z.object({
    id: z.string().optional(),
    label: z.string().default('Home'),
    fullName: z.string().min(2, 'Recipient full name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    email: z.string().optional().nullable().transform((val) => (val && val.includes('@') ? val.trim() : undefined)),
    flatNo: z.string().min(1, 'Flat / door number is required'),
    apartment: z.string().min(1, 'Apartment / community name is required'),
    locality: z.string().min(1, 'Locality is required'),
    pincode: z.string().min(4).max(10, 'Valid PIN code is required'),
    latitude: z.number().min(-90).max(90, 'Valid latitude coordinate is required'),
    longitude: z.number().min(-180).max(180, 'Valid longitude coordinate is required'),
  }),
  couponCode: z.string().optional().nullable(),
  claimedRewardId: z.string().optional().nullable(),
  claimedRewards: z
    .array(
      z.object({
        rewardProductId: z.string(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .optional()
    .nullable(),
  redeemedDiscountCoins: z.number().int().min(0).optional().nullable(),
  streakRewardId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting (max 30 checkout attempts per minute per IP)
  const rateLimit = checkRateLimit(req, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = CreateOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order request data',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { items, address, couponCode, claimedRewardId, claimedRewards, redeemedDiscountCoins, streakRewardId } = parseResult.data;

    // 2. CRITICAL BACKEND GEOSPATIAL REVALIDATION
    // Never trust client-provided isServiceable flag or React state.
    // Query PostGIS active delivery zone polygon authoritatively.
    const serviceability = await DeliveryService.checkAvailability(
      address.latitude,
      address.longitude
    );

    if (!serviceability.available) {
      return NextResponse.json(
        {
          success: false,
          unserviceable: true,
          error:
            serviceability.message ||
            'Your pinned delivery location is outside our active delivery zones. Order cannot be placed.',
        },
        { status: 400 }
      );
    }

    // 3. Authenticate user session if present
    let authUser: any = null;
    let customerProfileId: string | null = null;
    let profileEmail: string | null = null;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const res = NextResponse.next();
      const supabaseUserClient = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data: { user } } = await supabaseUserClient.auth.getUser();
      authUser = user;

      if (authUser) {
        const supabaseAdmin = createAdminClient();
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (profile) {
          customerProfileId = profile.id;
          profileEmail = profile.email || null;
        }
      }
    } catch (authErr) {
      console.warn('Session verification fallback to guest mode:', authErr);
    }

    // Priority: address form email → profile DB email → auth session email
    // Never fall back to a placeholder — if no email found, leave empty so
    // delivery routes know not to attempt sending.
    const customerEmail = address.email || profileEmail || authUser?.email || '';

    // 4. SERVER-AUTHORITATIVE PRICING RECALCULATION
    const pricingItems = items.map((i) => ({
      basketId: i.basketId,
      quantity: i.quantity,
      customPrice: i.customPrice,
      compareAtPrice: i.compareAtPrice,
      customizedItems: i.customizedItems,
    }));
    const serverPricing = await PricingService.calculateOrderTotal(
      pricingItems,
      couponCode || undefined,
      customerEmail
    );

    if (!serverPricing.valid) {
      return NextResponse.json(
        { success: false, error: serverPricing.message || 'Unable to calculate order total' },
        { status: 400 }
      );
    }

    let finalTotal = serverPricing.totalPayable;
    const finalSubtotal = serverPricing.subtotal;
    const finalDeliveryFee = serverPricing.deliveryFee;

    // Validate and Apply Weekly Streak Milestone Reward Discount (if selected)
    let streakDiscountAmount = 0;
    let appliedStreakReward: any = null;
    if (streakRewardId && customerProfileId) {
      const streakValidation = await WeeklyStreakService.validateAndApplyReward({
        customerId: customerProfileId,
        rewardId: streakRewardId,
        subtotal: finalSubtotal,
        hasCoupon: !!couponCode,
      });

      if (!streakValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: streakValidation.message || 'Selected streak milestone reward could not be applied.',
          },
          { status: 400 }
        );
      }

      streakDiscountAmount = streakValidation.discountAmount;
      appliedStreakReward = streakValidation.reward;
      finalTotal = Math.max(1, finalTotal - streakDiscountAmount);
    }

    // 5. Generate unique Order ID
    const orderId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    // Calculate delivery date (Next upcoming Sunday by default)
    const deliveryDate = new Date();
    const daysUntilSunday = (7 - deliveryDate.getDay()) % 7 || 7;
    deliveryDate.setDate(deliveryDate.getDate() + daysUntilSunday);
    const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

    // 6. PERSIST TO DATABASE (Server-side admin client)
    const supabaseAdmin = createAdminClient();

    // Ensure customer profile exists for both registered and guest users
    if (!customerProfileId && (customerEmail || address.phone)) {
      try {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .or(`phone.eq.${address.phone},email.eq.${customerEmail}`)
          .maybeSingle();

        if (existingProfile?.id) {
          customerProfileId = existingProfile.id;
        } else {
          const { data: newProfile } = await supabaseAdmin
            .from('profiles')
            .insert({
              full_name: address.fullName || 'Resident',
              phone: address.phone,
              email: customerEmail || `${address.phone}@guest.easyfarm.in`,
              role: 'customer',
            })
            .select('id')
            .maybeSingle();
          if (newProfile?.id) customerProfileId = newProfile.id;
        }
      } catch (profErr) {
        console.warn('Could not upsert guest profile:', profErr);
      }
    }

    // Save customer address record
    let savedAddressId: string | null = null;
    if (customerProfileId) {
      try {
        const { data: savedAddr } = await supabaseAdmin
          .from('customer_addresses')
          .insert({
            customer_id: customerProfileId,
            label: address.label || 'Home',
            full_address: `${address.flatNo}, ${address.apartment}`,
            apartment: address.apartment,
            locality: address.locality,
            pincode: address.pincode,
            latitude: address.latitude,
            longitude: address.longitude,
            delivery_zone_id: serviceability.zone_id,
            delivery_area_id: serviceability.area_id,
            is_default: false,
          })
          .select('id')
          .maybeSingle();

        if (savedAddr?.id) savedAddressId = savedAddr.id;
      } catch (addrErr) {
        console.warn('Could not save customer address record:', addrErr);
      }
    }

    // Handle Easy Coins Reward Claim Reservation (supports claiming any number of items up to balance)
    let claimedRewardSnapshot: any = null;
    let claimedRewardsSnapshot: any[] = [];

    const rewardItemsToReserve =
      Array.isArray(claimedRewards) && claimedRewards.length > 0
        ? claimedRewards.map((r) => ({
            reward_product_id: r.rewardProductId,
            quantity: r.quantity || 1,
          }))
        : claimedRewardId
        ? [{ reward_product_id: claimedRewardId, quantity: 1 }]
        : [];

    if (rewardItemsToReserve.length > 0) {
      const reservation = await EasyCoinsService.reserveMultipleRewards({
        order_id: orderId,
        customer_id: customerProfileId || 'guest-customer-default',
        items: rewardItemsToReserve,
      });

      if (!reservation.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              reservation.error ||
              'Failed to claim reward items. Please check your Easy Coins balance or continue without rewards.',
          },
          { status: 400 }
        );
      }

      claimedRewardsSnapshot = reservation.claims || [];
      claimedRewardSnapshot = claimedRewardsSnapshot[0] || null;
    }

    // Handle Easy Coins Basket Purchase Discount (10 Easy Coins = ₹1 Rupee)
    let coinsDiscountUsed = 0;
    let coinsDiscountAmount = 0;
    const requestedDiscountCoins = Math.max(0, Math.floor(Number(redeemedDiscountCoins) || 0));

    if (requestedDiscountCoins > 0) {
      const targetCustomerId = customerProfileId || 'guest-customer-default';
      const customerBalance = await EasyCoinsService.getCustomerBalance(targetCustomerId);
      const rewardItemsCoinsSpent = claimedRewardsSnapshot.reduce(
        (sum, c) => sum + Number(c.total_coins ?? c.coin_cost_snapshot ?? 0),
        0
      );
      const availableForDiscount = Math.max(0, customerBalance - rewardItemsCoinsSpent);

      if (requestedDiscountCoins > availableForDiscount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient Easy Coins for discount. Available balance after extra items is ${availableForDiscount} Coins.`,
          },
          { status: 400 }
        );
      }

      const maxCoinsByOrderTotal = Math.max(0, Math.floor(Math.max(0, finalTotal - 1) * 10));
      coinsDiscountUsed = Math.min(requestedDiscountCoins, maxCoinsByOrderTotal);
      coinsDiscountAmount = Number((coinsDiscountUsed / 10).toFixed(2));
      finalTotal = Math.max(1, Number((finalTotal - coinsDiscountAmount).toFixed(2)));
    }

    // Enrich items breakdown with customized vegetable sub-items and names
    const enrichedItems = (serverPricing.itemsBreakdown || []).map((pricedItem, idx) => {
      const reqItem = items[idx] || items.find((i) => i.basketId === pricedItem.basketId);
      return {
        ...pricedItem,
        basketName:
          pricedItem.basketName && pricedItem.basketName !== 'Fresh Farm Basket'
            ? pricedItem.basketName
            : reqItem?.basketName || pricedItem.basketName || 'Fresh Farm Basket',
        customizedItems: reqItem?.customizedItems || [],
      };
    });

    // Comprehensive JSON order metadata for Admin Panel & My Orders
    const orderMetadata = {
      orderNumber: orderId,
      customerId: customerProfileId || 'guest-customer-default',
      customerName: address.fullName,
      customerPhone: address.phone,
      customerEmail: customerEmail,
      flatNo: address.flatNo,
      apartment: address.apartment,
      locality: address.locality,
      pincode: address.pincode,
      fullAddress: `${address.flatNo}, ${address.apartment}, ${address.locality}, PIN ${address.pincode}`,
      couponCode: couponCode || null,
      couponDiscount: serverPricing.couponDiscount || 0,
      coinsDiscountAmount,
      coinsDiscount:
        coinsDiscountUsed > 0
          ? {
              coinsUsed: coinsDiscountUsed,
              discountAmount: coinsDiscountAmount,
            }
          : null,
      subtotal: finalSubtotal,
      deliveryFee: finalDeliveryFee,
      total: finalTotal,
      deliveryDate: deliveryDateStr,
      items: enrichedItems,
      deliveryPromise: serviceability.delivery_promise || 'Sunday by 6 PM',
      deliveryZone: serviceability.zone_name || 'Ghatkesar & Pocharam, Hyderabad (Active)',
      claimedReward: claimedRewardSnapshot,
      claimedRewards: claimedRewardsSnapshot,
      streakReward: appliedStreakReward
        ? {
            id: appliedStreakReward.id,
            title: appliedStreakReward.milestone_title,
            discountAmount: streakDiscountAmount,
          }
        : null,
    };

    // Insert order record
    let newOrderRecord: any = null;
    try {
      const { data: insertedOrder, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          customer_id: customerProfileId,
          address_id: savedAddressId,
          delivery_zone_id: serviceability.zone_id,
          delivery_area_id: serviceability.area_id,
          status: 'pending_payment',
          subtotal: finalSubtotal,
          delivery_fee: finalDeliveryFee,
          total: finalTotal,
          delivery_date: deliveryDateStr,
          notes: JSON.stringify(orderMetadata),
        })
        .select()
        .maybeSingle();

      if (orderErr) {
        console.warn('Orders table insert error (proceeding with fallback):', orderErr);
      } else {
        newOrderRecord = insertedOrder;

        // Insert historical order item snapshots
        if (newOrderRecord?.id && serverPricing.itemsBreakdown) {
          await supabaseAdmin.from('order_items').insert(
            serverPricing.itemsBreakdown.map((item: any) => ({
              order_id: newOrderRecord.id,
              basket_id: item.basketId && item.basketId.length > 20 ? item.basketId : null,
              basket_name: item.basketName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
            }))
          );
        }

        // Record streak reward redemption if applied
        if (appliedStreakReward && customerProfileId) {
          await WeeklyStreakService.recordRewardRedemption({
            rewardId: appliedStreakReward.id,
            customerId: customerProfileId,
            orderId: newOrderRecord?.id || orderId,
            subtotalBefore: finalSubtotal,
            discountAmount: streakDiscountAmount,
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database order persistence fallback:', dbErr);
    }

    // 7. Process Easy Coins subtraction (extra items + 10 Coins = ₹1 basket discount) & addition (earned coins on basket purchase)
    let coinsEarned = 0;
    let newCoinBalance = 0;
    try {
      const settlement = await EasyCoinsService.processOrderCoinsSettlement({
        order_id: orderId,
        customer_id: customerProfileId || 'guest-customer-default',
        eligible_subtotal: finalSubtotal,
        discount_coins: coinsDiscountUsed,
        discount_amount_inr: coinsDiscountAmount,
        claimed_rewards: claimedRewardsSnapshot,
        payment_id: `checkout_${orderId}`,
      });
      coinsEarned = settlement.coins_earned;
      newCoinBalance = settlement.new_balance;
    } catch (coinSettleErr) {
      console.warn('Easy Coins settlement warning during create-order:', coinSettleErr);
    }

    // 8. Create Payment Order (Razorpay)
    const paymentOrder = await PaymentService.createPaymentOrder(orderId, finalTotal);

    // Save initial record to payments table linked with Razorpay Order ID
    if (newOrderRecord?.id && paymentOrder?.id) {
      try {
        await supabaseAdmin.from('payments').insert({
          order_id: newOrderRecord.id,
          provider: 'razorpay',
          provider_order_id: paymentOrder.id,
          amount: finalTotal,
          currency: 'INR',
          status: 'pending',
          metadata: { orderNumber: orderId, razorpayOrderId: paymentOrder.id },
        });
      } catch (payErr) {
        console.warn('Payments table insert warning:', payErr);
      }
    }

    // Note: Order confirmation email is dispatched strictly in /api/verify-payment after successful Razorpay payment capture

    return NextResponse.json({
      success: true,
      orderId,
      customerProfileId: customerProfileId || 'guest-customer-default',
      total: finalTotal,
      subtotal: finalSubtotal,
      deliveryFee: finalDeliveryFee,
      couponDiscount: serverPricing.couponDiscount,
      coinsDiscountAmount,
      coinsDiscount:
        coinsDiscountUsed > 0
          ? {
              coinsUsed: coinsDiscountUsed,
              discountAmount: coinsDiscountAmount,
            }
          : null,
      coinsEarned,
      newCoinBalance,
      paymentOrder,
      deliveryZone: serviceability.zone_name,
      deliveryPromise: serviceability.delivery_promise,
      claimedReward: claimedRewardSnapshot,
      claimedRewards: claimedRewardsSnapshot,
    });
  } catch (err: any) {
    console.error('Checkout create-order endpoint failure:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to initialize order.' },
      { status: 500 }
    );
  }
}
