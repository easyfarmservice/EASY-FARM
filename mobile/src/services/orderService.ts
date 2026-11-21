import { SafeStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { CartItem } from '../context/CartContext';
import { SavedAddressItem } from './addressStorage';
import { getNextDeliverySunday } from '../constants/delivery';

export interface OrderItemSnapshot {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  image_url?: string;
  customizedItems?: any[];
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  deliveryDate: string;
  deliverySlot: string;
  status: 'confirmed' | 'harvested' | 'packed' | 'out_for_delivery' | 'delivered';
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  couponDiscount?: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'UPI' | 'COD' | 'ONLINE';
  paymentStatus: 'paid' | 'pending';
  address: SavedAddressItem;
  customerName: string;
  customerPhone: string;
  deliveryOtp?: string;
}

const ORDERS_STORAGE_KEY = '@easyfarm_customer_orders_v1';

export async function createOrder(params: {
  items: CartItem[];
  address: SavedAddressItem;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod: 'UPI' | 'COD' | 'ONLINE';
  subtotal: number;
  deliveryFee: number;
  couponDiscount?: number;
  couponCode?: string;
  couponId?: string;
  total: number;
}): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  try {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `EF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;
    const nextSunday = getNextDeliverySunday();

    const orderItems: OrderItemSnapshot[] = params.items.map((i) => ({
      id: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      unit: i.product.unit,
      price: i.product.price,
      total: i.product.price * i.quantity,
      image_url: i.product.image_url,
      customizedItems: i.product.customizedItems || [],
    }));

    const newOrder: CustomerOrder = {
      id: `order_${timestamp}_${randomSuffix}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      deliveryDate: nextSunday.dateString,
      deliverySlot: 'Sunday Morning (7:00 AM – 12:00 PM)',
      status: 'confirmed',
      items: orderItems,
      subtotal: params.subtotal,
      deliveryFee: params.deliveryFee,
      couponDiscount: params.couponDiscount,
      couponCode: params.couponCode,
      total: params.total,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'COD' ? 'pending' : 'paid',
      address: params.address,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
    };

    // 1. Persist to Supabase `orders` and `order_items` tables
    try {
      // Find or create profile ID
      let profileId: string | null = null;
      if (params.customerEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', params.customerEmail)
          .maybeSingle();
        if (profile) {
          profileId = profile.id;
        }
      }

      // Format clean full address string
      const formattedAddressString =
        params.address?.fullAddress ||
        [
          params.address?.flatNo,
          params.address?.apartment,
          params.address?.locality,
          params.address?.pincode ? `PIN ${params.address.pincode}` : '',
        ]
          .filter(Boolean)
          .join(', ');

      // Persist address to customer_addresses table if profile exists
      let addressId: string | null = null;
      if (params.address) {
        try {
          const { data: insertedAddr } = await supabase
            .from('customer_addresses')
            .insert({
              customer_id: profileId,
              label: params.address.label || 'Home',
              full_address: formattedAddressString || params.address.flatNo || '',
              apartment: params.address.apartment || '',
              locality: params.address.locality || '',
              pincode: params.address.pincode || '500088',
              is_default: true,
              latitude: params.address.latitude || 17.4475,
              longitude: params.address.longitude || 78.6534,
            })
            .select('id')
            .maybeSingle();

          if (insertedAddr?.id) {
            addressId = insertedAddr.id;
          }
        } catch (addrErr) {
          console.warn('Address persistence notice:', addrErr);
        }
      }

      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: profileId,
          address_id: addressId,
          status: 'confirmed',
          subtotal: params.subtotal,
          delivery_fee: params.deliveryFee,
          total: params.total,
          delivery_date: nextSunday.isoString,
          notes: JSON.stringify({
            orderNumber,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
            paymentMethod: params.paymentMethod,
            couponCode: params.couponCode || null,
            couponDiscount: params.couponDiscount || 0,
            fullAddress: formattedAddressString,
            flatNo: params.address?.flatNo || '',
            apartment: params.address?.apartment || '',
            locality: params.address?.locality || '',
            pincode: params.address?.pincode || '500088',
            deliveryZone: params.address?.locality || params.address?.apartment || 'Ghatkesar',
            address: {
              ...params.address,
              fullAddress: formattedAddressString,
            },
            items: params.items.map((it) => ({
              name: it.product.name,
              quantity: it.quantity,
              unitPrice: it.product.price,
              totalPrice: it.product.price * it.quantity,
              customizedItems: it.product.customizedItems || [],
            })),
          }),
        })
        .select()
        .maybeSingle();

      if (insertedOrder) {
        newOrder.id = insertedOrder.id;

        // Insert into order_items table in Supabase
        const dbItems = params.items.map((it) => ({
          order_id: insertedOrder.id,
          basket_name: it.product.name,
          quantity: it.quantity,
          unit_price: it.product.price,
          total_price: it.product.price * it.quantity,
        }));
        await supabase.from('order_items').insert(dbItems);
      } else if (orderErr) {
        console.warn('Supabase order insert note:', orderErr.message);
      }
    } catch (dbErr) {
      console.log('Direct Supabase insert note (using resilient device persistence):', dbErr);
    }

    // 2. Persist in local storage for instant offline order tracking
    const existingStr = await SafeStorage.getItem(ORDERS_STORAGE_KEY);
    const existingOrders: CustomerOrder[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [newOrder, ...existingOrders];
    await SafeStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    return { success: true, order: newOrder };
  } catch (err: any) {
    console.error('Order creation failed:', err);
    return { success: false, error: err.message || 'Failed to place order' };
  }
}

export async function getCustomerOrders(email?: string): Promise<CustomerOrder[]> {
  try {
    // 1. Try fetching from Supabase orders table
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile?.id) {
        query = query.eq('customer_id', profile.id);
      }
    }

    const { data: dbOrders, error } = await query;

    if (!error && dbOrders && dbOrders.length > 0) {
      const mapped: CustomerOrder[] = dbOrders.map((o: any) => {
        let parsedNotes: any = {};
        try {
          parsedNotes = typeof o.notes === 'string' ? JSON.parse(o.notes) : o.notes || {};
        } catch {}

        let items: OrderItemSnapshot[] = [];

        // Check if rich item snapshots with customized crops are saved in notes
        if (Array.isArray(parsedNotes.items) && parsedNotes.items.length > 0) {
          items = parsedNotes.items.map((it: any, idx: number) => ({
            id: it.id || `item-${idx}`,
            name: it.name || it.basketName || 'Farm Harvest Box',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'box',
            price: Number(it.unitPrice || it.price) || 0,
            total: Number(it.totalPrice || it.total) || (Number(it.unitPrice || it.price || 0) * (Number(it.quantity) || 1)),
            image_url: it.image_url || '',
            customizedItems: Array.isArray(it.customizedItems) ? it.customizedItems : [],
          }));
        } else if (Array.isArray(o.order_items) && o.order_items.length > 0) {
          items = o.order_items.map((it: any) => ({
            id: it.id,
            name: it.basket_name,
            quantity: Number(it.quantity) || 1,
            unit: 'box',
            price: Number(it.unit_price) || 0,
            total: Number(it.total_price) || 0,
            customizedItems: [],
          }));
        } else {
          items = [
            {
              id: 'item-1',
              name: 'Farm Harvest Box',
              quantity: 1,
              unit: 'box',
              price: Number(o.total),
              total: Number(o.total),
              customizedItems: [],
            },
          ];
        }

        const rawAddr = parsedNotes.address || {};
        const flatNo = parsedNotes.flatNo || rawAddr.flatNo || '302';
        const apartment = parsedNotes.apartment || rawAddr.apartment || 'Tower A';
        const locality = parsedNotes.locality || rawAddr.locality || 'Singapore Township';
        const pincode = parsedNotes.pincode || rawAddr.pincode || '500088';
        const fullAddress =
          parsedNotes.fullAddress ||
          rawAddr.fullAddress ||
          [flatNo ? 'Flat ' + flatNo : '', apartment, locality, pincode ? 'PIN ' + pincode : '']
            .filter(Boolean)
            .join(', ');

        // Format delivery date nicely
        let formattedDeliveryDate = 'Coming Sunday';
        if (o.delivery_date) {
          try {
            const d = new Date(o.delivery_date);
            if (!isNaN(d.getTime())) {
              formattedDeliveryDate = d.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });
            } else {
              formattedDeliveryDate = o.delivery_date;
            }
          } catch {
            formattedDeliveryDate = o.delivery_date;
          }
        }

        return {
          id: o.id,
          orderNumber: parsedNotes.orderNumber || `EF-${o.id.slice(0, 8).toUpperCase()}`,
          createdAt: o.created_at,
          deliveryDate: formattedDeliveryDate,
          deliverySlot: 'Sunday Morning (7:00 AM – 12:00 PM)',
          status: o.status || 'confirmed',
          items,
          subtotal: Number(o.subtotal) || Number(o.total),
          deliveryFee: Number(o.delivery_fee) || 0,
          couponDiscount: Number(parsedNotes.couponDiscount) || 0,
          couponCode: parsedNotes.couponCode || undefined,
          total: Number(o.total),
          paymentMethod: parsedNotes.paymentMethod || 'UPI',
          paymentStatus: o.status === 'confirmed' || o.status === 'delivered' ? 'paid' : 'pending',
          address: {
            id: rawAddr.id || 'addr-default',
            label: rawAddr.label || 'Home',
            flatNo,
            apartment,
            locality,
            pincode,
            fullAddress,
            latitude: rawAddr.latitude || 17.4475,
            longitude: rawAddr.longitude || 78.6534,
            isServiceable: true,
          },
          customerName: parsedNotes.customerName || 'Valued Customer',
          customerPhone: parsedNotes.customerPhone || '',
          deliveryOtp: parsedNotes.deliveryOtp || o.delivery_otp || undefined,
        };
      });

      return mapped;
    }

    // Fallback to local storage
    const existingStr = await SafeStorage.getItem(ORDERS_STORAGE_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    console.warn('Failed to get customer orders from Supabase, using local:', e);
    const existingStr = await SafeStorage.getItem(ORDERS_STORAGE_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  }
}
