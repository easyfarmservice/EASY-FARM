import React from 'react';
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
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Leaf,
} from 'lucide-react-native';
import { Colors } from '../../src/constants/theme';
import { useCart } from '../../src/context/CartContext';

interface BasketDef {
  id: string;
  name: string;
  price: number;
  marketPrice: number;
  description: string;
  image_url: string;
  features: string[];
  popular?: boolean;
}

const BASKETS: BasketDef[] = [
  {
    id: '33333333-0000-0000-0000-000000000001',
    name: 'Staple Harvest Basket',
    price: 250,
    marketPrice: 320,
    description: 'Everyday essential vegetables for small families. Includes potato, onion, tomato, fresh greens & seasonal veg.',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    features: [
      '5 Seasonal vegetables & greens',
      'Harvested Sunday at dawn',
      'Zero cold storage / 100% natural',
      'Up to 3 custom item swaps',
    ],
    popular: true,
  },
  {
    id: '33333333-0000-0000-0000-000000000002',
    name: 'Green & Exotics Basket',
    price: 350,
    marketPrice: 450,
    description: 'Nutrient-rich farm greens, baby corn, broccoli, exotic beans, and fresh local seasonal harvest.',
    image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
    features: [
      'Nutrient-dense leafy greens',
      'Premium farm vegetables',
      'Zero pesticides / organic care',
      'Fresh delivery Sunday morning',
    ],
  },
  {
    id: '33333333-0000-0000-0000-000000000003',
    name: 'Family Special Basket',
    price: 500,
    marketPrice: 650,
    description: 'Abundant gourmet selection for larger households. Complete kitchen supply for the entire week.',
    image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&auto=format&fit=crop&q=80',
    features: [
      '8–10 Farm-fresh harvest varieties',
      'Includes premium country greens',
      'Highest weekly savings',
      'Priority Sunday doorstep drop',
    ],
  },
];

export default function BasketsScreen() {
  const router = useRouter();
  const { addToCart } = useCart();

  const handleAddBasket = (basket: BasketDef) => {
    addToCart(
      {
        id: basket.id,
        name: basket.name,
        slug: basket.name.toLowerCase().replace(/\s+/g, '-'),
        price: basket.price,
        unit: 'box',
        image_url: basket.image_url,
        market_price: basket.marketPrice,
        category: 'Farm Baskets',
      },
      1
    );
    router.push('/cart' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Curated Farm Baskets</Text>
        <Text style={styles.headerSubtitle}>
          Complete weekly harvest boxes freshly harvested on Sunday
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {BASKETS.map((basket) => (
          <View key={basket.id} style={styles.basketCard}>
            {basket.popular && (
              <View style={styles.popularBadge}>
                <Sparkles size={12} color="#ffffff" />
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}

            <Image
              source={{ uri: basket.image_url }}
              style={styles.basketImage}
              resizeMode="cover"
            />

            <View style={styles.basketBody}>
              <View style={styles.titleRow}>
                <Text style={styles.basketName}>{basket.name}</Text>
                <View style={styles.priceWrap}>
                  <Text style={styles.price}>₹{basket.price}</Text>
                  <Text style={styles.marketPrice}>₹{basket.marketPrice}</Text>
                </View>
              </View>

              <Text style={styles.basketDesc}>{basket.description}</Text>

              {/* Feature Checklist */}
              <View style={styles.featureList}>
                {basket.features.map((f, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <CheckCircle2 size={15} color="#059669" />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddBasket(basket)}
                activeOpacity={0.85}
              >
                <ShoppingBag size={18} color="#ffffff" />
                <Text style={styles.addBtnText}>Add Basket to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Custom Box Banner */}
        <View style={styles.customBoxCard}>
          <Leaf size={28} color="#065f46" />
          <View style={styles.customBoxTextWrap}>
            <Text style={styles.customBoxTitle}>Want to build your own box?</Text>
            <Text style={styles.customBoxSubtitle}>
              Handpick specific vegetables in your preferred quantities from our full catalog.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.customBoxBtn}
            onPress={() => router.push('/' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.customBoxBtnText}>Shop Produce</Text>
            <ArrowRight size={14} color="#065f46" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
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
  },
  basketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  basketImage: {
    width: '100%',
    height: 160,
  },
  basketBody: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  basketName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065f46',
  },
  marketPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  basketDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  featureList: {
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#065f46',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  customBoxCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  customBoxTextWrap: {
    flex: 1,
  },
  customBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  customBoxSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  customBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  customBoxBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
});
