import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Check,
  ChevronLeft,
  Scale,
  RefreshCw,
} from 'lucide-react-native';
import {
  ProductItem,
  getNetQuantityOptions,
  getDefaultNetQuantityLabel,
  calculateNetQuantityPrice,
  resolveImageUrl,
  NetQuantityOption,
} from '../services/productService';

const { width } = Dimensions.get('window');

export interface CustomBoxPayload {
  id: string;
  name: string;
  price: number;
  market_price?: number;
  unit: string;
  image_url: string;
  customizedItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    unit: string;
    price: number;
    image_url: string;
  }>;
}

interface CustomBoxBuilderModalProps {
  visible?: boolean;
  onClose?: () => void;
  inline?: boolean;
  customBoxId?: string;
  products: ProductItem[];
  onAddToCart?: (customBox: CustomBoxPayload) => void;
  onAutoSyncCustomBox?: (customBox: CustomBoxPayload | null) => void;
  onProceedToOrder?: () => void;
  resetKey?: string | null;
}

const CATEGORIES = [
  'All',
  'Leafy Greens',
  'Fresh Veggies',
  'Roots & Gourds',
  'Native & Exotics',
] as const;

export function CustomBoxBuilderModal({
  visible = true,
  onClose,
  inline = false,
  customBoxId = '33333333-0000-0000-0000-000000000004',
  products = [],
  onAddToCart,
  onAutoSyncCustomBox,
  onProceedToOrder,
  resetKey,
}: CustomBoxBuilderModalProps) {
  // Pack counts per product (id -> count)
  const [packCounts, setPackCounts] = useState<Record<string, number>>({});
  // Selected net quantity option per product (id -> label, e.g. "500 g", "1 kg")
  const [activeNetQuantities, setActiveNetQuantities] = useState<Record<string, string>>({});
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const minItems = 4;
  const selectedCropIds = Object.keys(packCounts).filter((id) => (packCounts[id] || 0) > 0);
  const selectedCount = selectedCropIds.length;
  const isMinMet = selectedCount >= minItems;
  const remainingNeeded = Math.max(0, minItems - selectedCount);

  // Dynamic categorization of products (matching website CustomBoxZeptoView)
  const categorizedProducts = useMemo(() => {
    return products.map((p) => {
      const n = (p.name || '').toLowerCase();
      let category = 'Fresh Veggies';

      if (
        n.includes('spinach') ||
        n.includes('palak') ||
        n.includes('methi') ||
        n.includes('coriander') ||
        n.includes('mint') ||
        n.includes('pudina') ||
        n.includes('thotakura') ||
        n.includes('gongura') ||
        n.includes('curry') ||
        n.includes('amaranth') ||
        n.includes('sorrel') ||
        n.includes('greens') ||
        n.includes('bachali') ||
        n.includes('leaves')
      ) {
        category = 'Leafy Greens';
      } else if (
        n.includes('potato') ||
        n.includes('onion') ||
        n.includes('carrot') ||
        n.includes('beet') ||
        n.includes('gourd') ||
        n.includes('sorakaya') ||
        n.includes('potla') ||
        n.includes('beera') ||
        n.includes('radish') ||
        n.includes('mullangi') ||
        n.includes('yam') ||
        n.includes('chamagadda')
      ) {
        category = 'Roots & Gourds';
      } else if (
        n.includes('corn') ||
        n.includes('baby corn') ||
        n.includes('broccoli') ||
        n.includes('mushroom') ||
        n.includes('capsicum') ||
        n.includes('zucchini')
      ) {
        category = 'Native & Exotics';
      }

      return {
        ...p,
        resolvedCategory: category,
      };
    });
  }, [products]);

  // Filter products by active status, category, and search query
  const filteredProducts = useMemo(() => {
    return categorizedProducts.filter((p) => {
      if (p.active === false) return false;
      const matchCat = selectedCat === 'All' || p.resolvedCategory === selectedCat;
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.resolvedCategory || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [categorizedProducts, selectedCat, search]);

  // Compute dynamic subtotal (starts at 0 initially!)
  const subtotal = useMemo(() => {
    let sum = 0;
    products.forEach((p) => {
      const count = packCounts[p.id] || 0;
      if (count > 0) {
        const options = getNetQuantityOptions(p.unit);
        const currentNetLabel = activeNetQuantities[p.id] || getDefaultNetQuantityLabel(p.unit);
        const selectedOpt = options.find((o) => o.label === currentNetLabel) || options[0];
        const unitPrice = calculateNetQuantityPrice(p.price, selectedOpt.multiplier);
        sum += unitPrice * count;
      }
    });
    return sum;
  }, [products, packCounts, activeNetQuantities]);

  const updateCropCount = (id: string, delta: number) => {
    setPackCounts((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleSelectNetQuantity = (prodId: string, label: string) => {
    setActiveNetQuantities((prev) => ({
      ...prev,
      [prodId]: label,
    }));
  };

  // Add all currently filtered items at once
  const handleAddAllFiltered = () => {
    setPackCounts((prev) => {
      const updated = { ...prev };
      filteredProducts.forEach((p) => {
        if (!updated[p.id]) {
          updated[p.id] = 1;
        }
      });
      return updated;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    setPackCounts({});
  };

  // Compute complete Custom Box payload once minimum 4 crops are selected
  const customBoxPayload = useMemo<CustomBoxPayload | null>(() => {
    if (!isMinMet) return null;

    const chosenItems = selectedCropIds
      .map((id) => {
        const prod = products.find((p) => p.id === id);
        if (!prod) return null;
        const count = packCounts[id] || 1;
        const options = getNetQuantityOptions(prod.unit);
        const currentNetLabel = activeNetQuantities[prod.id] || getDefaultNetQuantityLabel(prod.unit);
        const selectedOpt = options.find((o) => o.label === currentNetLabel) || options[0];
        const unitPrice = calculateNetQuantityPrice(prod.price, selectedOpt.multiplier);

        return {
          productId: prod.id,
          name: prod.name,
          quantity: count,
          unit: currentNetLabel,
          price: unitPrice * count,
          image_url: resolveImageUrl(prod.image_url),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (chosenItems.length < minItems) return null;

    return {
      id: customBoxId,
      name: 'Custom Box',
      price: subtotal,
      market_price: Math.round(subtotal * 1.25),
      unit: 'box',
      image_url:
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80',
      customizedItems: chosenItems,
    };
  }, [isMinMet, selectedCropIds, products, packCounts, activeNetQuantities, customBoxId, subtotal]);

  // Automatically add / sync veggies into Custom Box in cart whenever customer edits selections
  const lastSyncedSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!onAutoSyncCustomBox) return;
    const sig = customBoxPayload
      ? `${customBoxPayload.id}|${customBoxPayload.price}|${customBoxPayload.customizedItems
          .map((i) => `${i.productId}:${i.unit}:${i.quantity}`)
          .join(',')}`
      : null;

    if (sig === lastSyncedSigRef.current) return;
    lastSyncedSigRef.current = sig;
    onAutoSyncCustomBox(customBoxPayload);
  }, [customBoxPayload, onAutoSyncCustomBox]);

  // Reset selections after order completion
  const prevResetKeyRef = useRef<string | null | undefined>(resetKey);
  useEffect(() => {
    if (resetKey && resetKey !== prevResetKeyRef.current) {
      setPackCounts({});
      lastSyncedSigRef.current = null;
    }
    prevResetKeyRef.current = resetKey;
  }, [resetKey]);

  const handleConfirmAddToCart = () => {
    if (!customBoxPayload) return;

    if (onAutoSyncCustomBox) {
      onAutoSyncCustomBox(customBoxPayload);
    } else if (onAddToCart) {
      onAddToCart(customBoxPayload);
    }

    if (onProceedToOrder) {
      onProceedToOrder();
    } else {
      onClose?.();
    }
  };

  const innerContent = (
    <>
      {/* ── TOP HEADER ── */}
      <View style={styles.topHeader}>
        {inline ? (
          <View style={styles.inlineIconBox}>
            <ShoppingBag size={18} color="#065f46" />
          </View>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
        )}

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{inline ? 'Shop • Custom Box' : 'Build Custom Box'}</Text>
          <Text style={styles.headerSubtitle}>
            {inline
              ? 'Added veggies go straight to your Custom Box'
              : 'Pick whatever vegetables you like'}
          </Text>
        </View>

        {/* Dynamic Live Subtotal Pill (starts at ₹0!) */}
        <View style={styles.headerPricePill}>
          <Text style={styles.headerPriceText}>₹{subtotal}</Text>
        </View>
      </View>

      {/* ── SCROLLABLE MAIN CONTENT ── */}
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
          {/* Hero Banner (matching website CustomBoxZeptoView) */}
          <View style={styles.heroBanner}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.farmDirectBadge}>
                <Sparkles size={11} color="#065f46" />
                <Text style={styles.farmDirectBadgeText}>DIRECT FROM TELANGANA FARMS</Text>
              </View>

              <Text style={styles.heroBannerTitle}>Create Your Own Harvest Box</Text>
              <Text style={styles.heroBannerSubtitle}>
                Select at least <Text style={{ fontWeight: '800' }}>4 crops</Text> with your desired
                net quantity (250g, 500g, 1kg, 2kg+). Pay only for what you pick.
              </Text>
            </View>

            <Image
              source={require('../../assets/custom-box.jpg')}
              style={styles.heroBannerImg}
              resizeMode="cover"
            />
          </View>

          {/* Quota Progress Banner */}
          <View
            style={[
              styles.quotaBanner,
              isMinMet ? styles.quotaBannerSuccess : styles.quotaBannerWarning,
            ]}
          >
            {isMinMet ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <AlertCircle size={18} color="#d97706" />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.quotaText,
                  isMinMet ? styles.quotaTextSuccess : styles.quotaTextWarning,
                ]}
              >
                {isMinMet
                  ? `Minimum reached! (${selectedCount} crops selected)`
                  : `Select ${remainingNeeded} more crop${remainingNeeded > 1 ? 's' : ''} (min 4 required)`}
              </Text>
              {/* Visual Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, (selectedCount / minItems) * 100)}%`,
                      backgroundColor: isMinMet ? '#059669' : '#d97706',
                    },
                  ]}
                />
              </View>
            </View>
            <View
              style={[
                styles.quotaPill,
                isMinMet ? styles.quotaPillSuccess : styles.quotaPillWarning,
              ]}
            >
              <Text
                style={[
                  styles.quotaPillText,
                  isMinMet ? styles.quotaPillTextSuccess : styles.quotaPillTextWarning,
                ]}
              >
                {selectedCount} / 4
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <Search size={16} color="#065f46" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vegetables & greens..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills & Shortcuts */}
          <View style={styles.catSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, selectedCat === cat && styles.catPillActive]}
                  onPress={() => setSelectedCat(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.catPillText, selectedCat === cat && styles.catPillTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={handleAddAllFiltered}
                activeOpacity={0.8}
              >
                <Plus size={13} color="#065f46" />
                <Text style={styles.quickActionText}>Add All in {selectedCat}</Text>
              </TouchableOpacity>

              {selectedCount > 0 && (
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={handleClearAll}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── CROPS LIST WITH DIRECT QUANTITY SELECTION (250g, 500g, 1kg, 2kg) ── */}
          <View style={styles.cropsContainer}>
            {filteredProducts.map((crop) => {
              const count = packCounts[crop.id] || 0;
              const isSelected = count > 0;
              const options = getNetQuantityOptions(crop.unit);
              const currentNetLabel =
                activeNetQuantities[crop.id] || getDefaultNetQuantityLabel(crop.unit);
              const selectedOpt = options.find((o) => o.label === currentNetLabel) || options[0];
              const portionPrice = calculateNetQuantityPrice(crop.price, selectedOpt.multiplier);

              return (
                <View
                  key={crop.id}
                  style={[styles.cropCard, isSelected && styles.cropCardSelected]}
                >
                  {/* Top: Photo + Name + Base Rate */}
                  <View style={styles.cropTopRow}>
                    <Image
                      source={{ uri: resolveImageUrl(crop.image_url) }}
                      style={styles.cropPhoto}
                      resizeMode="cover"
                    />

                    <View style={styles.cropMeta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <Text style={styles.cropName} numberOfLines={1}>
                          {crop.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.addedBadge}>
                            <Check size={11} color="#065f46" />
                            <Text style={styles.addedBadgeText}>Added to Custom Box</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.cropBaseRate}>
                        ₹{crop.price} / {crop.unit || 'kg'} base mandi rate
                      </Text>

                      <View style={styles.calculatedPriceRow}>
                        <Text style={styles.portionPriceTag}>₹{portionPrice}</Text>
                        <Text style={styles.portionLabelTag}>for {currentNetLabel}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Quantity Chips: Tap to change between 250g, 500g, 1kg, 2kg, etc. */}
                  <View style={styles.portionSelectorSection}>
                    <Text style={styles.portionSelectorLabel}>Select Net Quantity:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.portionChipsScroll}
                    >
                      {options.map((opt) => {
                        const optPrice = calculateNetQuantityPrice(crop.price, opt.multiplier);
                        const isOptActive = currentNetLabel === opt.label;

                        return (
                          <TouchableOpacity
                            key={opt.label}
                            style={[
                              styles.portionChip,
                              isOptActive && styles.portionChipActive,
                            ]}
                            onPress={() => handleSelectNetQuantity(crop.id, opt.label)}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.portionChipText,
                                isOptActive && styles.portionChipTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                            <Text
                              style={[
                                styles.portionChipPrice,
                                isOptActive && styles.portionChipPriceActive,
                              ]}
                            >
                              ₹{optPrice}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Card Bottom: Add or Stepper */}
                  <View style={styles.cropActionRow}>
                    <Text style={styles.deliveryPromiseText}>• Sunday Harvest Delivery</Text>

                    {count === 0 ? (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => updateCropCount(crop.id, 1)}
                        activeOpacity={0.85}
                      >
                        <Plus size={14} color="#ffffff" />
                        <Text style={styles.addBtnText}>Add</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.stepperWrap}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateCropCount(crop.id, -1)}
                          activeOpacity={0.7}
                        >
                          <Minus size={13} color="#065f46" />
                        </TouchableOpacity>
                        <Text style={styles.stepperCountText}>
                          {count} {count === 1 ? 'pack' : 'packs'}
                        </Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => updateCropCount(crop.id, 1)}
                          activeOpacity={0.7}
                        >
                          <Plus size={13} color="#065f46" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── STICKY BOTTOM CHECKOUT DOCK ── */}
        <View style={styles.bottomDock}>
          <View>
            <Text style={styles.bottomDockLabel}>
              Custom Box • {selectedCount} / 4+ crop{selectedCount === 1 ? '' : 's'}
            </Text>
            <Text style={styles.bottomDockPrice}>₹{subtotal}</Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, !isMinMet && styles.confirmBtnDisabled]}
            onPress={handleConfirmAddToCart}
            disabled={!isMinMet}
            activeOpacity={0.88}
          >
            <ShoppingBag size={18} color="#ffffff" />
            <Text style={styles.confirmBtnText}>
              {isMinMet
                ? onProceedToOrder
                  ? `Proceed to Order • ₹${subtotal}`
                  : `Add Custom Box • ₹${subtotal}`
                : `Select ${remainingNeeded} more (Min 4)`}
            </Text>
          </TouchableOpacity>
        </View>
    </>
  );

  if (inline) {
    return <View style={styles.inlineContainer}>{innerContent}</View>;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {innerContent}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inlineContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inlineIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  headerPricePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  headerPriceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065f46',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  farmDirectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  farmDirectBadgeText: {
    color: '#065f46',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064e3b',
    marginBottom: 4,
  },
  heroBannerSubtitle: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  heroBannerImg: {
    width: 76,
    height: 76,
    borderRadius: 16,
  },
  quotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quotaBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  quotaBannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  quotaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quotaTextWarning: {
    color: '#b45309',
  },
  quotaTextSuccess: {
    color: '#065f46',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  quotaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quotaPillWarning: {
    backgroundColor: '#fef3c7',
  },
  quotaPillSuccess: {
    backgroundColor: '#d1fae5',
  },
  quotaPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  quotaPillTextWarning: {
    color: '#b45309',
  },
  quotaPillTextSuccess: {
    color: '#065f46',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  catSection: {
    marginBottom: 12,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catPillActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  quickActionText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  clearAllText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
  cropsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cropCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cropCardSelected: {
    borderColor: '#047857',
    backgroundColor: '#f0fdf4',
    shadowColor: '#047857',
    shadowOpacity: 0.12,
  },
  cropTopRow: {
    flexDirection: 'row',
  },
  cropPhoto: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  cropMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  cropName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    flexShrink: 0,
  },
  addedBadgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '800',
  },
  cropBaseRate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  calculatedPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
    gap: 4,
  },
  portionPriceTag: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064e3b',
  },
  portionLabelTag: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  portionSelectorSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  portionSelectorLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  portionChipsScroll: {
    gap: 6,
    paddingBottom: 2,
  },
  portionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8faf7',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  portionChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  portionChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  portionChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  portionChipPrice: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginTop: 1,
  },
  portionChipPriceActive: {
    color: '#fef08a',
  },
  cropActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  deliveryPromiseText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#047857',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomDockLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  bottomDockPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#064e3b',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#065f46',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
