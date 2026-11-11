import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmailService } from '@/services/email.service';
import { WeeklyStreakService } from '@/services/weekly-streak.service';
import { EasyCoinsService } from '@/services/easy-coins.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch orders from Supabase with relations
    const [{ data: orders, error: ordersError }, { data: allProfiles }, { data: allRewardClaims }] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          address_id,
          status,
          subtotal,
          delivery_fee,
          total,
          delivery_date,
          notes,
          created_at,
          updated_at,
          profiles(id, full_name, phone, email),
          customer_addresses(id, full_address, apartment, locality, pincode, label),
          order_items(id, basket_name, quantity, unit_price, total_price),
          payments(id, provider, provider_payment_id, provider_order_id, status, amount)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, phone, email'),
      supabase
        .from('reward_claims')
        .select('*'),
    ]);

    if (ordersError) {
      console.error('[Admin Orders API] Error fetching orders:', ordersError);
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 });
    }

    const profilesList = Array.isArray(allProfiles) ? allProfiles : [];
    const rewardClaimsList = Array.isArray(allRewardClaims) ? allRewardClaims : [];

    const defaultStapleVegetables = [
      { productName: 'Tomato', quantity: 1, unit: 'kg', price: 40 },
      { productName: 'Onion', quantity: 1, unit: 'kg', price: 45 },
      { productName: 'Potato', quantity: 1, unit: 'kg', price: 35 },
      { productName: 'Okra (Bhindi)', quantity: 500, unit: 'g', price: 35 },
      { productName: 'Palak (Spinach)', quantity: 500, unit: 'g', price: 30 },
    ];

    // 2. Format orders for Admin Dashboard with robust JSON metadata fallback
    const formattedOrders = (orders || []).map((o: any) => {
      let meta: any = null;
      if (o.notes) {
        try {
          if (o.notes.startsWith('{')) {
            meta = JSON.parse(o.notes);
          }
        } catch {}
      }

      const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
      const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      const addrObj = Array.isArray(o.customer_addresses) ? o.customer_addresses[0] : o.customer_addresses;

      const isPaid =
        payment?.status === 'captured' ||
        o.status === 'confirmed' ||
        o.status === 'harvest_scheduled' ||
        o.status === 'packed' ||
        o.status === 'out_for_delivery' ||
        o.status === 'delivered';

      const customerName =
        meta?.customerName ||
        profile?.full_name ||
        'Customer';

      let customerPhone =
        meta?.customerPhone ||
        profile?.phone ||
        '';

      let customerEmail =
        meta?.customerEmail ||
        (profile?.email && !profile.email.endsWith('@guest.easyfarm.in') ? profile.email : '') ||
        '';

      // Fallback profile lookup by phone or name if email/phone missing
      if (!customerEmail || !customerPhone) {
        const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
        const matchedProfile = profilesList.find((p: any) => {
          const pPhone = (p.phone || '').replace(/\D/g, '').slice(-10);
          if (cleanPhone && pPhone && cleanPhone === pPhone && p.email && !p.email.endsWith('@guest.easyfarm.in')) {
            return true;
          }
          if (
            customerName &&
            customerName !== 'Customer' &&
            customerName !== 'Resident' &&
            p.full_name &&
            p.full_name.toLowerCase().trim() === customerName.toLowerCase().trim() &&
            p.email &&
            !p.email.endsWith('@guest.easyfarm.in')
          ) {
            return true;
          }
          return false;
        });

        if (matchedProfile) {
          if (!customerEmail && matchedProfile.email) customerEmail = matchedProfile.email;
          if (!customerPhone && matchedProfile.phone) customerPhone = matchedProfile.phone;
        }
      }

      // Final fallback to profile email if still empty
      if (!customerEmail && profile?.email) {
        customerEmail = profile.email;
      }

      const flatNo = meta?.flatNo || addrObj?.full_address || '';
      const apartment = meta?.apartment || addrObj?.apartment || 'Singapore Township';
      const locality = meta?.locality || addrObj?.locality || 'Ghatkesar & Pocharam, Hyderabad';
      const pincode = meta?.pincode || addrObj?.pincode || '500088';

      const address =
        meta?.fullAddress ||
        (addrObj
          ? `${addrObj.full_address || ''}, ${addrObj.apartment || ''}, ${addrObj.locality || ''}, PIN ${addrObj.pincode || ''}`.replace(/^[,\s]+|[,\s]+$/g, '')
          : [flatNo, apartment, locality, pincode ? `PIN ${pincode}` : ''].filter(Boolean).join(', ') || 'Ghatkesar & Pocharam, Hyderabad (Active)');

      const metaItems = Array.isArray(meta?.items) ? meta.items : [];
      const dbOrderItems = Array.isArray(o.order_items) ? o.order_items : [];

      let items: any[] = [];
      if (metaItems.length > 0) {
        items = metaItems.map((mi: any, idx: number) => {
          const dbMatch = dbOrderItems[idx] || dbOrderItems.find((di: any) => di.basket_name === (mi.basketName || mi.name));
          const itemName = mi.basketName || mi.name || dbMatch?.basket_name || 'Weekly Harvest Basket';
          const isStaple =
            itemName.toLowerCase().includes('staple') ||
            itemName.toLowerCase().includes('weekly harvest');
          const subItems =
            Array.isArray(mi.customizedItems) && mi.customizedItems.length > 0
              ? mi.customizedItems
              : isStaple
              ? defaultStapleVegetables
              : [];
          const qty = Number(mi.quantity ?? dbMatch?.quantity ?? 1);
          const unitPrice = Number(mi.unitPrice ?? mi.price ?? dbMatch?.unit_price ?? o.total ?? 0);
          const totalPrice = Number(mi.totalPrice ?? dbMatch?.total_price ?? unitPrice * qty);

          return {
            name: itemName,
            quantity: qty,
            unitPrice,
            totalPrice,
            customizedItems: subItems,
          };
        });
      } else if (dbOrderItems.length > 0) {
        items = dbOrderItems.map((di: any) => {
          const itemName = di.basket_name || 'Weekly Harvest Basket';
          const isStaple =
            itemName.toLowerCase().includes('staple') ||
            itemName.toLowerCase().includes('weekly harvest');
          const qty = Number(di.quantity || 1);
          const unitPrice = Number(di.unit_price || 0);
          const totalPrice = Number(di.total_price || unitPrice * qty);

          return {
            name: itemName,
            quantity: qty,
            unitPrice,
            totalPrice,
            customizedItems: isStaple ? defaultStapleVegetables : [],
          };
        });
      } else {
        items = [
          {
            name: 'Staple Box',
            quantity: 1,
            unitPrice: Number(o.total || 185),
            totalPrice: Number(o.total || 185),
            customizedItems: defaultStapleVegetables,
          },
        ];
      }

      // Compute fallback Sunday delivery date if delivery_date is missing
      let deliveryDateStr = o.delivery_date || meta?.deliveryDate || '';
      if (!deliveryDateStr && o.created_at) {
        const d = new Date(o.created_at);
        const daysUntilSun = (7 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSun);
        deliveryDateStr = d.toISOString().split('T')[0];
      }

      const displayOrderNum = meta?.orderNumber || `ORD-${o.id.slice(0, 6).toUpperCase()}`;

      // Resolve all Easy Coins claimed extra items from metadata & reward_claims table
      const rawClaimSources: any[] = [];
      if (Array.isArray(meta?.claimedRewards) && meta.claimedRewards.length > 0) {
        rawClaimSources.push(...meta.claimedRewards);
      } else if (meta?.claimedReward) {
        rawClaimSources.push(meta.claimedReward);
      } else {
        const dbClaims = rewardClaimsList.filter(
          (rc: any) =>
            (rc.order_id === displayOrderNum || rc.order_id === o.id) &&
            rc.claim_status !== 'released' &&
            rc.claim_status !== 'cancelled'
        );
        if (dbClaims.length > 0) {
          rawClaimSources.push(...dbClaims);
        }
      }

      const normalizedClaimedRewards = rawClaimSources.map((c: any, cIdx: number) => {
        const qty = Math.max(1, Number(c.quantity) || 1);
        const totalCoins = Number(
          c.total_coins ??
            c.coin_cost_snapshot ??
            (Number(c.coin_cost) || 0) * qty
        );
        const unitCoins = Number(c.coin_cost) || Math.round(totalCoins / qty);
        return {
          id: c.id || c.reward_product_id || `rew-claim-${cIdx}`,
          name: c.name || c.reward_name_snapshot || 'Easy Coins Extra Item',
          brand: c.brand || c.brand_snapshot || 'Easy Farm',
          package_size: c.package_size || c.package_size_snapshot || '1 Unit',
          quantity: qty,
          coin_cost: unitCoins,
          total_coins: totalCoins,
          image_url: c.image_url || c.image_url_snapshot || '/images/rewards/neem-comb.jpg',
        };
      });

      return {
        id: displayOrderNum,
        uuid: o.id,
        status: o.status || 'pending_payment',
        payment_status: isPaid ? 'paid' : 'pending',
        payment_id: payment?.provider_payment_id || null,
        subtotal: Number(o.subtotal || meta?.subtotal || o.total || 0),
        delivery_fee: Number(o.delivery_fee ?? meta?.deliveryFee ?? 0),
        coupon_discount: Number(meta?.couponDiscount || 0),
        total: Number(o.total || 0),
        delivery_date: deliveryDateStr,
        delivery_promise: meta?.deliveryPromise || 'Sunday, 8:00 AM – 6:00 PM',
        delivery_zone: meta?.deliveryZone || 'Ghatkesar & Pocharam, Hyderabad (Active)',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        address,
        flat_no: flatNo,
        apartment,
        locality,
        pincode,
        items,
        notes: meta?.deliveryPromise || o.notes || '',
        coupon_code: meta?.couponCode || null,
        coins_discount: meta?.coinsDiscount || (Number(meta?.coinsDiscountAmount) > 0
          ? {
              coinsUsed: Math.round(Number(meta.coinsDiscountAmount) * 10),
              discountAmount: Number(meta.coinsDiscountAmount),
            }
          : null),
        claimed_reward: normalizedClaimedRewards[0] || null,
        claimed_rewards: normalizedClaimedRewards,
        streak_reward: meta?.streakReward || null,
        confirmed_at: meta?.timeline?.confirmed_at || null,
        created_at: o.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (err: any) {
    console.error('[Admin Orders API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'orderId and status are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch current order record to preserve notes and timeline
    let ordQuery = supabase
      .from('orders')
      .select('id, customer_id, subtotal, total, notes, status, created_at');
    if (orderId.length === 36 && orderId.includes('-')) {
      ordQuery = ordQuery.eq('id', orderId);
    } else {
      ordQuery = ordQuery.ilike('notes', `%${orderId}%`);
    }
    const { data: currentOrd } = await ordQuery.maybeSingle();

    const updateData: any = {
      status,
      updated_at: nowIso,
    };

    let parsedMeta: any = {};
    if (currentOrd) {
      let meta: any = {};
      if (currentOrd.notes) {
        try {
          if (currentOrd.notes.startsWith('{')) meta = JSON.parse(currentOrd.notes);
          else meta = { originalNotes: currentOrd.notes };
        } catch {
          meta = { originalNotes: currentOrd.notes };
        }
      }
      meta.timeline = meta.timeline || {};

      if (status === 'confirmed' && !meta.timeline.confirmed_at) {
        meta.timeline.confirmed_at = nowIso;
      } else if ((status === 'harvest_scheduled' || status === 'harvested') && !meta.timeline.harvested_at) {
        meta.timeline.harvested_at = nowIso;
      } else if (status === 'packed' && !meta.timeline.packed_at) {
        meta.timeline.packed_at = nowIso;
      } else if (status === 'out_for_delivery' && !meta.timeline.out_for_delivery_at) {
        meta.timeline.out_for_delivery_at = nowIso;
      } else if (status === 'delivered') {
        meta.timeline.delivered_at = nowIso;
        updateData.delivered_at = nowIso;
        updateData.otp_verified = true;
      }

      if (status !== 'delivered') {
        updateData.otp_verified = false;
        updateData.delivered_at = null;
        if (meta.timeline.delivered_at) {
          delete meta.timeline.delivered_at;
        }
      }

      parsedMeta = meta;
      updateData.notes = JSON.stringify(meta);
    } else {
      if (status !== 'delivered') {
        updateData.otp_verified = false;
        updateData.delivered_at = null;
      }
    }

    let query = supabase.from('orders').update(updateData);

    if (orderId.length === 36 && orderId.includes('-')) {
      query = query.eq('id', orderId);
    } else {
      query = query.ilike('notes', `%${orderId}%`);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 1.5 Settle or reverse Easy Coins on order status update
    const appOrderRef = parsedMeta?.orderNumber || orderId;
    const customerProfileRef =
      (currentOrd as any)?.customer_id || parsedMeta?.customerId || 'guest-customer-default';
    const orderSubtotal = Number(
      parsedMeta?.subtotal ?? (currentOrd as any)?.subtotal ?? (currentOrd as any)?.total ?? 0
    );

    if (
      ['confirmed', 'harvest_scheduled', 'harvested', 'packed', 'out_for_delivery', 'delivered'].includes(
        status
      )
    ) {
      try {
        await EasyCoinsService.processOrderCoinsSettlement({
          order_id: appOrderRef,
          customer_id: customerProfileRef,
          eligible_subtotal: orderSubtotal,
          discount_coins: Number(parsedMeta?.coinsDiscount?.coinsUsed || 0),
          discount_amount_inr: Number(
            parsedMeta?.coinsDiscount?.discountAmount || parsedMeta?.coinsDiscountAmount || 0
          ),
          claimed_rewards: Array.isArray(parsedMeta?.claimedRewards)
            ? parsedMeta.claimedRewards
            : parsedMeta?.claimedReward
            ? [parsedMeta.claimedReward]
            : [],
          payment_id: `admin_confirm_${appOrderRef}`,
        });
      } catch (coinErr) {
        console.warn('[Admin Orders PATCH] Easy Coins settlement warning:', coinErr);
      }
    } else if (status === 'cancelled') {
      try {
        await EasyCoinsService.reverseOrderCoins({
          order_id: appOrderRef,
          reason: 'Order cancelled by Admin',
        });
      } catch (revCoinErr) {
        console.warn('[Admin Orders PATCH] Easy Coins reversal warning:', revCoinErr);
      }
    }

    // 2. If order was marked as delivered:
    if (status === 'delivered') {
      // Award Weekly Streak stamp & evaluate milestone rewards
      try {
        await WeeklyStreakService.processDeliveredOrder(currentOrd?.id || orderId);
      } catch (streakErr) {
        console.error('[Admin Orders PATCH] Error processing weekly streak on delivery:', streakErr);
      }

      // Dispatch confirmation email to customer
      try {
        let orderQuery = supabase
          .from('orders')
          .select(`
            id,
            notes,
            profiles(full_name, email),
            customer_addresses(full_address, apartment, locality)
          `);

        if (orderId.length === 36 && orderId.includes('-')) {
          orderQuery = orderQuery.eq('id', orderId);
        } else {
          orderQuery = orderQuery.ilike('notes', `%${orderId}%`);
        }

        const { data: matchedOrder } = await orderQuery.maybeSingle();
        if (matchedOrder) {
          let meta: any = null;
          if (matchedOrder.notes) {
            try {
              if (matchedOrder.notes.startsWith('{')) meta = JSON.parse(matchedOrder.notes);
            } catch {}
          }

          const customerEmail = meta?.customerEmail || (matchedOrder.profiles as any)?.email || '';
          const customerName = meta?.customerName || (matchedOrder.profiles as any)?.full_name || 'Valued Resident';
          const displayOrderId = meta?.orderNumber || `EF${matchedOrder.id.slice(0, 4).toUpperCase()}`;
          const deliveryAddress =
            meta?.fullAddress ||
            (matchedOrder.customer_addresses as any)?.full_address ||
            [(matchedOrder.customer_addresses as any)?.apartment, (matchedOrder.customer_addresses as any)?.locality]
              .filter(Boolean)
              .join(', ') ||
            'Ghatkesar & Pocharam, Hyderabad (Active)';

          if (customerEmail) {
            await EmailService.sendOrderDeliveredEmail({
              toEmail: customerEmail,
              recipientName: customerName,
              orderId: displayOrderId,
              deliveryAddress,
            });
          }
        }
      } catch (emailErr) {
        console.error('[Admin Orders PATCH] Error sending delivered email:', emailErr);
      }
    }

    // 3. If order was cancelled or reverted from delivered, reverse stamp and recalculate streak
    if (status === 'cancelled' || (currentOrd?.status === 'delivered' && status !== 'delivered')) {
      try {
        await WeeklyStreakService.processReversedOrder(currentOrd?.id || orderId, `Order status changed to ${status}`);
      } catch (revErr) {
        console.error('[Admin Orders PATCH] Error reversing weekly streak stamp:', revErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
