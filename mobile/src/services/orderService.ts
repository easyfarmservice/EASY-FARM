import AsyncStorage from '@react-native-async-storage/async-storage';
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
  total: number;
  paymentMethod: 'UPI' | 'COD' | 'ONLINE';
  paymentStatus: 'paid' | 'pending';
  address: SavedAddressItem;
  customerName: string;
  customerPhone: string;
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
      total: params.total,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'COD' ? 'pending' : 'paid',
      address: params.address,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
    };

    // 1. Try to persist to Supabase orders table if online
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: insertedOrder, error: orderInsertError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          status: 'confirmed',
          subtotal: params.subtotal,
          delivery_fee: params.deliveryFee,
          total: params.total,
          delivery_date: nextSunday.isoString,
          notes: JSON.stringify({
            orderNumber,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
            paymentMethod: params.paymentMethod,
            address: params.address,
          }),
        })
        .select()
        .maybeSingle();

      if (insertedOrder) {
        newOrder.id = insertedOrder.id;
      }
    } catch (dbErr) {
      console.log('Direct Supabase insert note (using resilient device persistence):', dbErr);
    }

    // 2. Persist in local storage for instant offline order tracking
    const existingStr = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    const existingOrders: CustomerOrder[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [newOrder, ...existingOrders];
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    return { success: true, order: newOrder };
  } catch (err: any) {
    console.error('Order creation failed:', err);
    return { success: false, error: err.message || 'Failed to place order' };
  }
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  try {
    const existingStr = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    console.warn('Failed to get customer orders:', e);
    return [];
  }
}
