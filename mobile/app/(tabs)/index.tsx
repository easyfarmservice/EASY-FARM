import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Search,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Clock,
  Plus,
  Minus,
  Check,
  Leaf,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../../src/constants/theme';
import { getSelectedDeliveryAddress, SavedAddressItem } from '../../src/services/addressStorage';
import { getNextDeliverySunday } from '../../src/constants/delivery';
import { fetchCatalogProducts, CATEGORIES, CategoryType } from '../../src/services/productService';
import { ProductItem } from '../../src/data/initialProducts';
import { useCart } from '../../src/context/CartContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

export default function ShopScreen() {
  const router = useRouter();
  const { items, addToCart, updateQuantity, getItemQuantity, totalItems, subtotal } = useCart();

  const [activeAddress, setActiveAddress] = useState<SavedAddressItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');

  const deliveryCycle = useMemo(() => getNextDeliverySunday(), []);

  useEffect(() => {
    loadAddress();
    loadProducts();
  }, []);

  const loadAddress = async () => {
    const addr = await getSelectedDeliveryAddress();
    setActiveAddress(addr);
  };

  const loadProducts = async () => {
    setLoading(true);
    const data = await fetchCatalogProducts();
    setProducts(data);
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. Header with Brand & Location Pill */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandTitle}>Easy Farm</Text>
            <Text style={styles.brandTagline}>Farm-to-Doorstep • Zero Storage</Text>
          </View>
          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={() => router.push('/cart' as any)}
            activeOpacity={0.8}
          >
            <ShoppingBag size={20} color="#ffffff" />
            {totalItems > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location Selection Pill */}
        <TouchableOpacity
          style={styles.locationPill}
          onPress={() => router.push('/location' as any)}
          activeOpacity={0.85}
        >
          <MapPin size={16} color="#fbbf24" />
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>
              DELIVER TO{' '}
              <Text style={{ fontWeight: '800' }}>
                {(activeAddress?.label || 'HOME').toUpperCase()}
              </Text>
            </Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {activeAddress
                ? `${activeAddress.flatNo ? activeAddress.flatNo + ', ' : ''}${activeAddress.apartment || activeAddress.locality || 'Singapore Township'}`
                : 'Select delivery address (Ghatkesar & Pocharam)'}
            </Text>
          </View>
          <ChevronDown size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Sunday Harvest Cycle Banner */}
        <View style={styles.cycleBanner}>
          <View style={styles.cycleBadge}>
            <Clock size={14} color="#065f46" />
            <Text style={styles.cycleBadgeText}>HARVEST CYCLE</Text>
          </View>
          <Text style={styles.cycleTitle}>
            Next Harvest & Delivery: {deliveryCycle.dateString}
          </Text>
          <Text style={styles.cycleSubtitle}>
            Order cut-off: <Text style={{ fontWeight: '700' }}>Saturday 11:59 PM</Text>. Harvested at Sunday dawn and delivered fresh by 12 PM.
          </Text>
        </View>

        {/* 3. Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spinach, tomato, chikkudu, beans..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 4. Category Pills Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 5. Product Count & Catalog Heading */}
        <View style={styles.catalogHeader}>
          <Text style={styles.catalogTitle}>
            {selectedCategory === 'All' ? 'All Seasonal Produce' : selectedCategory}
          </Text>
          <Text style={styles.catalogCount}>{filteredProducts.length} items</Text>
        </View>

        {/* 6. Products Grid */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loaderText}>Harvesting today's fresh catalog...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Leaf size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No vegetables found</Text>
            <Text style={styles.emptySubtitle}>Try searching for another vegetable name</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const qty = getItemQuantity(product.id);
              const savings =
                product.market_price && product.market_price > product.price
                  ? Math.round(
                      ((product.market_price - product.price) / product.market_price) * 100
                    )
                  : 0;

              return (
                <View key={product.id} style={styles.productCard}>
                  {/* Image */}
                  <View style={styles.imageWrap}>
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    {savings > 0 && (
                      <View style={styles.savingsBadge}>
                        <TrendingDown size={10} color="#ffffff" />
                        <Text style={styles.savingsText}>{savings}% OFF</Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productUnit}>Per {product.unit}</Text>

                    {/* Price Row */}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceCurrent}>₹{product.price}</Text>
                      {product.market_price && product.market_price > product.price && (
                        <Text style={styles.priceMarket}>₹{product.market_price}</Text>
                      )}
                    </View>

                    {/* Action Button: + ADD or Stepper */}
                    {qty === 0 ? (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => addToCart(product, 1)}
                        activeOpacity={0.8}
                      >
                        <Plus size={14} color={Colors.primary} />
                        <Text style={styles.addBtnText}>ADD</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.stepperWrap}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(product.id, qty - 1)}
                          activeOpacity={0.7}
                        >
                          <Minus size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.stepperCount}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateQuantity(product.id, qty + 1)}
                          activeOpacity={0.7}
                        >
                          <Plus size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: totalItems > 0 ? 90 : 30 }} />
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {totalItems > 0 && (
        <View style={styles.floatingCartBar}>
          <View style={styles.floatingCartLeft}>
            <Text style={styles.floatingCartItems}>
              {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'}
            </Text>
            <Text style={styles.floatingCartTotal}>₹{subtotal}</Text>
          </View>
          <TouchableOpacity
            style={styles.floatingCartButton}
            onPress={() => router.push('/cart' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingCartButtonText}>View Cart</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '500',
  },
  cartIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e11d48',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  locationTextWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  locationLabel: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationAddress: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  cycleBanner: {
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cycleBadgeText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cycleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
    marginBottom: 2,
  },
  cycleSubtitle: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipSelected: {
    backgroundColor: '#065f46',
    borderColor: '#065f46',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  catalogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  catalogCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  loaderWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 125,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  savingsBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  savingsText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    height: 36,
  },
  productUnit: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  priceCurrent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065f46',
  },
  priceMarket: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addBtnText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '800',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#065f46',
    borderRadius: 10,
    height: 32,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCount: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#064e3b',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingCartLeft: {},
  floatingCartItems: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  floatingCartTotal: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  floatingCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  floatingCartButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
