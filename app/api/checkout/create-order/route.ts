import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService } from '@/services/delivery.service';
import { PricingService } from '@/services/pricing.service';
import { PaymentService } from '@/services/payment.service';
import { EmailService } from '@/services/email.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/security/rate-limit';

const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      basketId: z.string().min(1, 'Basket ID is required'),
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

    const { items, address, couponCode } = parseResult.data;

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
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (profile) customerProfileId = profile.id;
      }
    } catch (authErr) {
      console.warn('Session verification fallback to guest mode:', authErr);
    }

    const customerEmail = address.email || authUser?.email || 'customer@example.com';

    // 4. SERVER-AUTHORITATIVE PRICING RECALCULATION
    const pricingItems = items.map((i) => ({
      basketId: i.basketId,
      quantity: i.quantity,
      customPrice: i.customPrice,
      compareAtPrice: i.compareAtPrice,
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

    const finalTotal = serverPricing.totalPayable;
    const finalSubtotal = serverPricing.subtotal;
    const finalDeliveryFee = serverPricing.deliveryFee;

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

    // Comprehensive JSON order metadata for Admin Panel & My Orders
    const orderMetadata = {
      orderNumber: orderId,
      customerName: address.fullName,
      customerPhone: address.phone,
      customerEmail: customerEmail,
      flatNo: address.flatNo,
      apartment: address.apartment,
      locality: address.locality,
      pincode: address.pincode,
      fullAddress: `${address.flatNo}, ${address.apartment}, ${address.locality}, PIN ${address.pincode}`,
      couponCode: couponCode || null,
      items: serverPricing.itemsBreakdown,
      deliveryPromise: serviceability.delivery_promise || 'Sunday by 6 PM',
      deliveryZone: serviceability.zone_name || 'Ghatkesar & Pocharam',
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
      }
    } catch (dbErr) {
      console.warn('Database order persistence fallback:', dbErr);
    }

    // 7. Create Payment Order (Razorpay)
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
      total: finalTotal,
      subtotal: finalSubtotal,
      deliveryFee: finalDeliveryFee,
      couponDiscount: serverPricing.couponDiscount,
      paymentOrder,
      deliveryZone: serviceability.zone_name,
      deliveryPromise: serviceability.delivery_promise,
    });
  } catch (err: any) {
    console.error('Checkout create-order endpoint failure:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to initialize order.' },
      { status: 500 }
    );
  }
}
