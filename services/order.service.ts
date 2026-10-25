import { createAdminClient } from '@/lib/supabase/admin';
import { DeliveryService } from './delivery.service';
import { getNextDeliveryDate } from '@/lib/constants';

interface CreateOrderParams {
  customerId: string;
  addressId: string;
  items: { basket_id: string; quantity: number }[];
  notes?: string;
}

export class OrderService {
  /**
   * Server-side secure order creation with serviceability & price recalculation
   */
  static async createOrder(params: CreateOrderParams) {
    const supabase = createAdminClient();

    // 1. Fetch customer address and coordinates
    const { data: address, error: addrError } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('id', params.addressId)
      .eq('customer_id', params.customerId)
      .single();

    if (addrError || !address) {
      throw new Error('Selected address not found or unauthorized');
    }

    // 2. Server-side PostGIS Serviceability Validation
    const deliveryCheck = await DeliveryService.checkAvailability(
      address.latitude,
      address.longitude
    );

    if (!deliveryCheck.available) {
      throw new Error("Cannot place order: Selected address is outside active delivery zone.");
    }

    // 3. Cutoff Window Validation
    const { isOrderingOpen, deliveryDate } = getNextDeliveryDate();
    if (!isOrderingOpen) {
      throw new Error("Orders for this Sunday are closed. Next ordering window opens next week.");
    }

    // 4. Fetch real basket prices from DB (NEVER TRUST CLIENT PRICES)
    const basketIds = params.items.map((i) => i.basket_id);
    const { data: dbBaskets, error: basketError } = await supabase
      .from('baskets')
      .select('*')
      .in('id', basketIds)
      .eq('active', true);

    if (basketError || !dbBaskets || dbBaskets.length !== basketIds.length) {
      throw new Error('One or more selected baskets are inactive or unavailable');
    }

    // 5. Calculate Subtotal & Delivery Fee on Server
    let subtotal = 0;
    const orderItemsToInsert = [];

    for (const item of params.items) {
      const basket = dbBaskets.find((b) => b.id === item.basket_id);
      if (!basket) continue;

      const unitPrice = Number(basket.price);
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItemsToInsert.push({
        basket_id: basket.id,
        basket_name: basket.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
      });
    }

    const deliveryFee = deliveryCheck.delivery_fee || 0;
    const total = subtotal + deliveryFee;

    // 6. Create Order in Database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: params.customerId,
          address_id: params.addressId,
          delivery_zone_id: deliveryCheck.zone_id,
          delivery_area_id: deliveryCheck.area_id,
          status: 'pending_payment',
          subtotal,
          delivery_fee: deliveryFee,
          total,
          delivery_date: deliveryDate.toISOString().split('T')[0],
          notes: params.notes,
        },
      ])
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation failed:', orderError);
      throw new Error('Failed to create order record');
    }

    // 7. Insert Order Items
    const itemsWithOrderId = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    await supabase.from('order_items').insert(itemsWithOrderId);

    // 8. Create Initial Payment Record
    await supabase.from('payments').insert([
      {
        order_id: order.id,
        provider: 'razorpay',
        amount: total,
        currency: 'INR',
        status: 'pending',
      },
    ]);

    return order;
  }
}
