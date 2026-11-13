import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Banknote,
  ArrowRight,
  User,
  Phone,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '../src/constants/theme';
import { useCart } from '../src/context/CartContext';
import { useAuth } from '../src/context/AuthContext';
import { getSelectedDeliveryAddress, SavedAddressItem } from '../src/services/addressStorage';
import { getNextDeliverySunday } from '../src/constants/delivery';
import { createOrder } from '../src/services/orderService';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, subtotal, deliveryFee, totalPayable, coinsDiscountAmount, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [address, setAddress] = useState<SavedAddressItem | null>(null);
  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(profile?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD' | 'ONLINE'>('UPI');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const deliveryCycle = getNextDeliverySunday();

  useEffect(() => {
    getSelectedDeliveryAddress().then((addr: any) => {
      setAddress(addr);
    });
  }, []);

  const handlePlaceOrder = async () => {
    if (!address) {
      Alert.alert('Address Required', 'Please confirm your delivery address before checkout.', [
        { text: 'Choose Location', onPress: () => router.push('/location' as any) },
      ]);
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Contact Name', 'Please enter recipient name.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Phone Number', 'Please enter a valid 10-digit mobile number for Sunday delivery updates.');
      return;
    }

    setSubmitting(true);
    const result = await createOrder({
      items,
      address,
      customerName: fullName.trim(),
      customerPhone: cleanPhone,
      customerEmail: user?.email,
      paymentMethod,
      subtotal,
      deliveryFee,
      total: totalPayable,
    });

    setSubmitting(false);

    if (result.success && result.order) {
      clearCart();
      router.replace({
        pathname: '/order-success' as any,
        params: {
          orderNumber: result.order.orderNumber,
          deliveryDate: result.order.deliveryDate,
          total: result.order.total.toString(),
          paymentMethod: result.order.paymentMethod,
        },
      });
    } else {
      Alert.alert('Order Failed', result.error || 'Unable to place order. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sunday Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <MapPin size={18} color="#065f46" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Delivery Address</Text>
              <Text style={styles.cardSubtitle}>
                Corridor: Pocharam & Ghatkesar Active Zone
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/location')}
              activeOpacity={0.7}
            >
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>

          {address ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>
                {address.label.toUpperCase()}
              </Text>
              <Text style={styles.addressLine}>
                {address.flatNo ? `${address.flatNo}, ` : ''}
                {address.apartment ? `${address.apartment}, ` : ''}
                {address.locality}
              </Text>
              <Text style={styles.pincodeLine}>PIN: {address.pincode}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectAddressBtn}
              onPress={() => router.push('/location')}
            >
              <Text style={styles.selectAddressBtnText}>Select Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Scheduled Harvest Delivery Slot */}
        <View style={styles.slotCard}>
          <Clock size={20} color="#065f46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.slotTitle}>Scheduled Sunday Harvest</Text>
            <Text style={styles.slotDate}>{deliveryCycle.dateString}</Text>
            <Text style={styles.slotTime}>Morning Drop (7:00 AM – 12:00 PM)</Text>
          </View>
          <View style={styles.confirmedPill}>
            <CheckCircle2 size={13} color="#059669" />
            <Text style={styles.confirmedText}>CONFIRMED</Text>
          </View>
        </View>

        {/* 3. Recipient Contact Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Contact</Text>
          <Text style={styles.cardSubtitle}>
            Our delivery partner will call this number for gate entry on Sunday.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <User size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Sravan Pachimadla"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>10-Digit Mobile Number</Text>
            <View style={styles.inputWrap}>
              <Phone size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 9951767700"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>
        </View>

        {/* 4. Payment Method Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>

          {/* UPI */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'UPI' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('UPI')}
            activeOpacity={0.8}
          >
            <Smartphone size={20} color={paymentMethod === 'UPI' ? '#065f46' : '#64748b'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentTitle}>Instant UPI Payment</Text>
              <Text style={styles.paymentSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === 'UPI' && styles.radioCircleActive,
              ]}
            >
              {paymentMethod === 'UPI' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'COD' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('COD')}
            activeOpacity={0.8}
          >
            <Banknote size={20} color={paymentMethod === 'COD' ? '#065f46' : '#64748b'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.paymentSub}>Pay in cash or UPI when basket arrives</Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === 'COD' && styles.radioCircleActive,
              ]}
            >
              {paymentMethod === 'COD' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Cards & Netbanking */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'ONLINE' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('ONLINE')}
            activeOpacity={0.8}
          >
            <CreditCard size={20} color={paymentMethod === 'ONLINE' ? '#065f46' : '#64748b'} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentTitle}>Cards & Netbanking</Text>
              <Text style={styles.paymentSub}>Secure Razorpay Checkout</Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                paymentMethod === 'ONLINE' && styles.radioCircleActive,
              ]}
            >
              {paymentMethod === 'ONLINE' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Produce Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sunday Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryFee === 0 && { color: '#059669', fontWeight: '800' }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          {coinsDiscountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>Easy Coins Applied</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>-₹{coinsDiscountAmount}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryTotalLabel}>Final Amount</Text>
            <Text style={styles.summaryTotalValue}>₹{totalPayable}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.stickyFooter}>
        <View>
          <Text style={styles.footerLabel}>AMOUNT TO PAY</Text>
          <Text style={styles.footerPrice}>₹{totalPayable}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, submitting && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.placeOrderBtnText}>Place Sunday Order</Text>
              <ArrowRight size={16} color="#ffffff" />
            </>
          )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  addressBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 18,
  },
  pincodeLine: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  selectAddressBtn: {
    backgroundColor: '#065f46',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectAddressBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  slotCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
    marginTop: 1,
  },
  slotTime: {
    fontSize: 11,
    color: '#065f46',
    marginTop: 1,
  },
  confirmedPill: {
    backgroundColor: '#d1fae5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  inputGroup: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginTop: 10,
  },
  paymentOptionSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#065f46',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#065f46',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065f46',
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
  footerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065f46',
  },
  placeOrderBtn: {
    backgroundColor: '#065f46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  placeOrderBtnDisabled: {
    opacity: 0.7,
  },
  placeOrderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
