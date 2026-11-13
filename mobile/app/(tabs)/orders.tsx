import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Package,
  Clock,
  CheckCircle2,
  MapPin,
  ArrowRight,
  RotateCcw,
  Truck,
  Leaf,
  ShieldCheck,
} from 'lucide-react-native';
import { Colors } from '../../src/constants/theme';
import { getCustomerOrders, CustomerOrder } from '../../src/services/orderService';
import { useCart } from '../../src/context/CartContext';

export default function OrdersScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadOrders = useCallback(async () => {
    const list = await getCustomerOrders();
    setOrders(list);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleReorder = (order: CustomerOrder) => {
    order.items.forEach((item) => {
      addToCart(
        {
          id: item.id,
          name: item.name,
          slug: item.id,
          price: item.price,
          unit: item.unit,
          image_url: item.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
          category: 'Fresh Veggies',
        },
        item.quantity
      );
    });
    router.push('/cart' as any);
  };

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Package size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No orders placed yet</Text>
          <Text style={styles.emptySubtitle}>
            Your fresh vegetable and harvest orders will appear here for live tracking on Sunday morning.
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push('/' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>
          Live Sunday harvest tracking & past delivery history
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {orders.map((order) => {
          return (
            <View key={order.id} style={styles.orderCard}>
              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderDate}>
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {order.status === 'confirmed' ? 'CONFIRMED' : order.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Harvest Tracker Progress */}
              <View style={styles.trackerWrap}>
                <View style={styles.trackerStep}>
                  <View style={[styles.stepDot, styles.stepDotActive]}>
                    <CheckCircle2 size={14} color="#ffffff" />
                  </View>
                  <Text style={[styles.stepLabel, styles.stepLabelActive]}>Confirmed</Text>
                </View>
                <View style={styles.stepConnectorActive} />
                <View style={styles.trackerStep}>
                  <View style={[styles.stepDot, styles.stepDotActive]}>
                    <Leaf size={12} color="#ffffff" />
                  </View>
                  <Text style={[styles.stepLabel, styles.stepLabelActive]}>Sunday Dawn Harvest</Text>
                </View>
                <View style={styles.stepConnector} />
                <View style={styles.trackerStep}>
                  <View style={styles.stepDot}>
                    <Truck size={12} color="#94a3b8" />
                  </View>
                  <Text style={styles.stepLabel}>Doorstep Delivery</Text>
                </View>
              </View>

              {/* Delivery Window Banner */}
              <View style={styles.deliverySlotBanner}>
                <Clock size={16} color="#065f46" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliverySlotTitle}>
                    Delivery on {order.deliveryDate}
                  </Text>
                  <Text style={styles.deliverySlotSub}>
                    {order.deliverySlot}
                  </Text>
                </View>
              </View>

              {/* Address Preview */}
              <View style={styles.addressRow}>
                <MapPin size={15} color="#64748b" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {order.address.flatNo ? `${order.address.flatNo}, ` : ''}
                  {order.address.apartment || order.address.locality}
                </Text>
              </View>

              {/* Items Summary */}
              <View style={styles.itemsWrap}>
                <Text style={styles.itemsTitle}>
                  {order.items.length} {order.items.length === 1 ? 'Variety' : 'Varieties'} Harvested
                </Text>
                {order.items.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.quantity}x {item.name} ({item.unit})
                    </Text>
                    <Text style={styles.itemPrice}>₹{item.total}</Text>
                  </View>
                ))}
                {order.items.length > 3 && (
                  <Text style={styles.moreItemsText}>
                    +{order.items.length - 3} more fresh items
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* Order Footer with Total & Re-order */}
              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.footerLabel}>Total Amount ({order.paymentMethod})</Text>
                  <Text style={styles.footerPrice}>₹{order.total}</Text>
                </View>

                <TouchableOpacity
                  style={styles.reorderBtn}
                  onPress={() => handleReorder(order)}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={14} color="#065f46" />
                  <Text style={styles.reorderBtnText}>Repeat Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#065f46',
  },
  header: {
    backgroundColor: '#065f46',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#a7f3d0',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: '#065f46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  trackerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  trackerStep: {
    alignItems: 'center',
    width: 70,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#059669',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepConnectorActive: {
    flex: 1,
    height: 2,
    backgroundColor: '#059669',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  deliverySlotBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  deliverySlotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  deliverySlotSub: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  itemsWrap: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  itemsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 12,
    color: '#334155',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  moreItemsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  footerPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#065f46',
  },
  reorderBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
});
