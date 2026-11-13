import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Truck,
  Edit3,
} from 'lucide-react-native';
import { Colors } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { getSelectedDeliveryAddress } from '../../src/services/addressStorage';
import { getNextDeliverySunday } from '../../src/constants/delivery';

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    subtotal,
    deliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold,
    totalPayable,
    coinsDiscountAmount,
    setCoinsDiscountAmount,
  } = useCart();

  const { profile } = useAuth();
  const [address, setAddress] = React.useState<any>(null);
  const [redeemCoins, setRedeemCoins] = useState<boolean>(false);

  React.useEffect(() => {
    getSelectedDeliveryAddress().then(setAddress);
  }, []);

  const deliveryCycle = getNextDeliverySunday();
  const amountNeededForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const availableCoins = profile?.easy_coins_balance || 150;
  const potentialCoinsDiscount = Math.min(25, Math.floor(availableCoins / 10)); // 10 coins = ₹1

  const toggleCoins = () => {
    if (!redeemCoins) {
      setCoinsDiscountAmount(potentialCoinsDiscount);
      setRedeemCoins(true);
    } else {
      setCoinsDiscountAmount(0);
      setRedeemCoins(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Basket</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Your harvest basket is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add fresh organic vegetables, greens and farm baskets harvested every Sunday dawn.
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.push('/' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.shopNowBtnText}>Browse Fresh Produce</Text>
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
        <View>
          <Text style={styles.headerTitle}>Your Basket</Text>
          <Text style={styles.headerSubtitle}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} • Sunday Doorstep Delivery
          </Text>
        </View>
        <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address Card */}
        <View style={styles.addressCard}>
          <MapPin size={18} color={Colors.primary} />
          <View style={styles.addressTextWrap}>
            <Text style={styles.addressLabel}>
              Delivering to {(address?.label || 'Home').toUpperCase()}
            </Text>
            <Text style={styles.addressFull} numberOfLines={1}>
              {address
                ? `${address.flatNo ? address.flatNo + ', ' : ''}${address.apartment || address.locality || 'Singapore Township'}`
                : 'Singapore Township, Pocharam'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeAddressBtn}
            onPress={() => router.push('/location' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.changeAddressBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Free Delivery Meter */}
        <View style={styles.freeDeliveryBanner}>
          <Truck size={18} color={isFreeDelivery ? '#059669' : '#0284c7'} />
          <View style={{ flex: 1 }}>
            {isFreeDelivery ? (
              <Text style={styles.freeDeliveryTitleSuccess}>
                You unlocked FREE Sunday Delivery!
              </Text>
            ) : (
              <Text style={styles.freeDeliveryTitle}>
                Add ₹{amountNeededForFree} more for <Text style={{ fontWeight: '800' }}>FREE Delivery</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Items List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Harvest Items</Text>
          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.product.image_url }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemUnit}>
                  ₹{item.product.price} / {item.product.unit}
                </Text>
              </View>

              {/* Stepper */}
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperAction}
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  activeOpacity={0.7}
                >
                  {item.quantity === 1 ? (
                    <Trash2 size={13} color="#e11d48" />
                  ) : (
                    <Minus size={13} color="#065f46" />
                  )}
                </TouchableOpacity>
                <Text style={styles.stepperQuantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperAction}
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={13} color="#065f46" />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>
                ₹{item.product.price * item.quantity}
              </Text>
            </View>
          ))}
        </View>

        {/* Easy Coins Loyalty Discount Card */}
        <TouchableOpacity
          style={[styles.coinsCard, redeemCoins && styles.coinsCardActive]}
          onPress={toggleCoins}
          activeOpacity={0.85}
        >
          <View style={styles.coinsLeft}>
            <Sparkles size={20} color={redeemCoins ? '#059669' : '#d97706'} />
            <View>
              <Text style={styles.coinsTitle}>
                Redeem Easy Coins ({availableCoins} Available)
              </Text>
              <Text style={styles.coinsSubtitle}>
                Save ₹{potentialCoinsDiscount} on this Sunday harvest
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.checkboxCircle,
              redeemCoins && styles.checkboxCircleActive,
            ]}
          >
            {redeemCoins && <CheckCircle2 size={16} color="#ffffff" />}
          </View>
        </TouchableOpacity>

        {/* Bill Summary Card */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>₹{subtotal}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Sunday Delivery Fee</Text>
            <Text
              style={[
                styles.billValue,
                isFreeDelivery && { color: '#059669', fontWeight: '800' },
              ]}
            >
              {isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>

          {coinsDiscountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#059669' }]}>
                Easy Coins Discount
              </Text>
              <Text style={[styles.billValue, { color: '#059669' }]}>
                -₹{coinsDiscountAmount}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.billRowTotal}>
            <Text style={styles.billTotalLabel}>To Pay</Text>
            <Text style={styles.billTotalValue}>₹{totalPayable}</Text>
          </View>
        </View>

        {/* Harvest Guarantee Notice */}
        <View style={styles.guaranteeBox}>
          <ShieldCheck size={18} color="#059669" />
          <Text style={styles.guaranteeText}>
            100% Zero Cold Storage Guarantee. Harvested early Sunday morning and delivered direct to your door.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerPriceWrap}>
          <Text style={styles.footerPriceLabel}>TOTAL PAYABLE</Text>
          <Text style={styles.footerPriceValue}>₹{totalPayable}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  clearBtnText: {
    color: '#fecdd3',
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 12,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  shopNowBtn: {
    backgroundColor: '#065f46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  shopNowBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  addressFull: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  changeAddressBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeAddressBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  freeDeliveryBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  freeDeliveryTitle: {
    fontSize: 12,
    color: '#0369a1',
  },
  freeDeliveryTitleSuccess: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemUnit: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    height: 30,
    paddingHorizontal: 4,
  },
  stepperAction: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQuantity: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
    marginHorizontal: 6,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 46,
    textAlign: 'right',
  },
  coinsCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinsCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  coinsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350f',
  },
  coinsSubtitle: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 1,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  billTotalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#065f46',
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  guaranteeText: {
    fontSize: 11,
    color: '#047857',
    flex: 1,
    lineHeight: 15,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  footerPriceWrap: {},
  footerPriceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  footerPriceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065f46',
  },
  checkoutBtn: {
    backgroundColor: '#065f46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
