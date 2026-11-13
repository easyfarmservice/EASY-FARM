import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle2,
  Clock,
  Package,
  ArrowRight,
  ShieldCheck,
  Leaf,
  Store,
} from 'lucide-react-native';
import { Colors } from '../src/constants/theme';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderNumber?: string;
    deliveryDate?: string;
    total?: string;
    paymentMethod?: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <CheckCircle2 size={54} color="#059669" />
        </View>

        <Text style={styles.title}>Order Confirmed!</Text>
        <Text style={styles.subtitle}>
          Your farm harvest order has been locked in for this Sunday morning.
        </Text>

        {/* Order Details Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.valueHighlight}>
              {params.orderNumber || 'EF-202611-CONFIRMED'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Scheduled Harvest</Text>
            <Text style={styles.value}>
              {params.deliveryDate || 'Next Sunday'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Delivery Window</Text>
            <Text style={styles.value}>7:00 AM – 12:00 PM</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>
              {params.paymentMethod || 'UPI'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowTotal}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{params.total || '0'}</Text>
          </View>
        </View>

        {/* Harvest Assurance */}
        <View style={styles.promiseCard}>
          <Leaf size={24} color="#065f46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.promiseTitle}>Harvested at Dawn Guarantee</Text>
            <Text style={styles.promiseSub}>
              Unlike supermarkets, your vegetables are still in Telangana soil right now. They will be hand-harvested early Sunday morning and delivered within hours.
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.replace('/orders' as any)}
          activeOpacity={0.85}
        >
          <Package size={18} color="#ffffff" />
          <Text style={styles.trackBtnText}>Track Order Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/' as any)}
          activeOpacity={0.7}
        >
          <Store size={18} color="#065f46" />
          <Text style={styles.homeBtnText}>Back to Shop</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#064e3b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  valueHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065f46',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065f46',
  },
  promiseCard: {
    width: '100%',
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
  },
  promiseTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
  },
  promiseSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  trackBtn: {
    width: '100%',
    backgroundColor: '#065f46',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  homeBtn: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeBtnText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '800',
  },
});
