import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {
  X,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react-native';
import { BasketCropItem, ProductItem, resolveImageUrl } from '../services/productService';

interface StapleItemState {
  originalId: string;
  originalName: string;
  originalQuantity: string;
  originalImage: string;
  originalPrice: number;
  isSwapped: boolean;
  currentId: string;
  currentName: string;
  currentQuantity: string;
  currentImage: string;
  currentPrice: number;
}

interface StapleBoxCustomizerModalProps {
  visible: boolean;
  onClose: () => void;
  initialItems?: BasketCropItem[];
  allProducts?: ProductItem[];
  boxPrice?: number;
  onAddToCart: (
    items: Array<{
      productId: string;
      name: string;
      quantity: string;
      price: number;
      image_url: string;
      isSwapped: boolean;
      originalName?: string;
    }>,
    swapsUsed: number,
    finalPrice: number
  ) => void;
}

export function StapleBoxCustomizerModal({
  visible,
  onClose,
  initialItems = [],
  allProducts = [],
  boxPrice = 250,
  onAddToCart,
}: StapleBoxCustomizerModalProps) {
  // Build initial 5 items from dynamic database items
  const defaultItems = useMemo<StapleItemState[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.slice(0, 5).map((it) => ({
        originalId: it.productId || it.id,
        originalName: it.name,
        originalQuantity: it.quantity,
        originalImage: resolveImageUrl(it.image_url),
        originalPrice: it.price || 35,
        isSwapped: false,
        currentId: it.productId || it.id,
        currentName: it.name,
        currentQuantity: it.quantity,
        currentImage: resolveImageUrl(it.image_url),
        currentPrice: it.price || 35,
      }));
    }

    // Dynamic database-aligned fallback if not yet loaded
    return [
      {
        originalId: '22222222-0000-0000-0000-000000000001',
        originalName: 'Country Tomato',
        originalQuantity: '1 kg',
        originalImage: 'https://tuhnxwpnlwfllvouhpvu.supabase.co/storage/v1/object/public/products/veg_1794401683036_bi0fox.webp',
        originalPrice: 35,
        isSwapped: false,
        currentId: '22222222-0000-0000-0000-000000000001',
        currentName: 'Country Tomato',
        currentQuantity: '1 kg',
        currentImage: 'https://tuhnxwpnlwfllvouhpvu.supabase.co/storage/v1/object/public/products/veg_1794401683036_bi0fox.webp',
        currentPrice: 35,
      },
      {
        originalId: '22222222-0000-0000-0000-000000000008',
        originalName: 'Red Onion',
        originalQuantity: '1.5 kg',
        originalImage: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=80',
        originalPrice: 45,
        isSwapped: false,
        currentId: '22222222-0000-0000-0000-000000000008',
        currentName: 'Red Onion',
        currentQuantity: '1.5 kg',
        currentImage: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=80',
        currentPrice: 45,
      },
      {
        originalId: '22222222-0000-0000-0000-000000000007',
        originalName: 'Potato',
        originalQuantity: '2 kg',
        originalImage: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80',
        originalPrice: 35,
        isSwapped: false,
        currentId: '22222222-0000-0000-0000-000000000007',
        currentName: 'Potato',
        currentQuantity: '2 kg',
        currentImage: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80',
        currentPrice: 35,
      },
      {
        originalId: '22222222-0000-0000-0000-000000000003',
        originalName: 'Fresh Palak (Spinach)',
        originalQuantity: '2 bunches',
        originalImage: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80',
        originalPrice: 25,
        isSwapped: false,
        currentId: '22222222-0000-0000-0000-000000000003',
        currentName: 'Fresh Palak (Spinach)',
        currentQuantity: '2 bunches',
        currentImage: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80',
        currentPrice: 25,
      },
      {
        originalId: '22222222-0000-0000-0000-000000000004',
        originalName: 'Lady Finger (Bhindi)',
        originalQuantity: '0.5 kg',
        originalImage: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80',
        originalPrice: 40,
        isSwapped: false,
        currentId: '22222222-0000-0000-0000-000000000004',
        currentName: 'Lady Finger (Bhindi)',
        currentQuantity: '0.5 kg',
        currentImage: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80',
        currentPrice: 40,
      },
    ];
  }, [initialItems]);

  const [items, setItems] = useState<StapleItemState[]>(defaultItems);
  const [activeSwapIndex, setActiveSwapIndex] = useState<number | null>(null);

  // Sync when initial items change
  useEffect(() => {
    setItems(defaultItems);
  }, [defaultItems]);

  const swapsUsed = items.filter((i) => i.isSwapped).length;
  const maxSwaps = 3;
  const swapsRemaining = maxSwaps - swapsUsed;

  // Available alternative swap crops from database products (excluding currently assigned items)
  const availableAlternatives = useMemo(() => {
    const currentCropIds = new Set(items.map((i) => i.currentId));
    const currentCropNames = new Set(items.map((i) => i.currentName.toLowerCase().trim()));

    if (allProducts && allProducts.length > 0) {
      return allProducts
        .filter(
          (p) =>
            p.active !== false &&
            !currentCropIds.has(p.id) &&
            !currentCropNames.has((p.name || '').toLowerCase().trim())
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.unit.includes('bunch')
            ? '2 bunches'
            : p.unit.includes('pc')
            ? '1 pc'
            : '500 g',
          image_url: resolveImageUrl(p.image_url),
          price: p.price,
        }));
    }

    return [];
  }, [allProducts, items]);

  const handleSwapSelect = (alternative: {
    id: string;
    name: string;
    quantity: string;
    image_url: string;
    price: number;
  }) => {
    if (activeSwapIndex === null) return;

    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== activeSwapIndex) return item;
        return {
          ...item,
          isSwapped: true,
          currentId: alternative.id,
          currentName: alternative.name,
          currentQuantity: alternative.quantity,
          currentImage: alternative.image_url,
          currentPrice: alternative.price,
        };
      })
    );

    setActiveSwapIndex(null);
  };

  const handleResetItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          isSwapped: false,
          currentId: item.originalId,
          currentName: item.originalName,
          currentQuantity: item.originalQuantity,
          currentImage: item.originalImage,
          currentPrice: item.originalPrice,
        };
      })
    );
  };

  const handleConfirmAddToCart = () => {
    const formatted = items.map((i) => ({
      productId: i.currentId,
      name: i.currentName,
      quantity: i.currentQuantity,
      price: i.currentPrice,
      image_url: i.currentImage,
      isSwapped: i.isSwapped,
      originalName: i.isSwapped ? i.originalName : undefined,
    }));
    onAddToCart(formatted, swapsUsed, boxPrice);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title}>Staple Box</Text>
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>₹{boxPrice}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>5 essential items • Up to 3 seasonal swaps</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Swap Status Banner */}
          <View style={styles.swapBanner}>
            <View style={styles.swapBannerLeft}>
              <ArrowRightLeft size={16} color="#065f46" />
              <Text style={styles.swapBannerText}>
                {swapsUsed === 0
                  ? '3 seasonal swaps available'
                  : swapsRemaining > 0
                  ? `${swapsRemaining} swap${swapsRemaining > 1 ? 's' : ''} remaining`
                  : 'All 3 swaps used'}
              </Text>
            </View>
            <View style={styles.swapDots}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[styles.swapDot, i < swapsUsed ? styles.swapDotActive : null]}
                />
              ))}
            </View>
          </View>

          {/* 5 Box Items List */}
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <View
                key={`${item.originalId}-${index}`}
                style={[styles.itemCard, item.isSwapped && styles.itemCardSwapped]}
              >
                {/* Product Thumbnail Avatar */}
                <Image
                  source={{ uri: item.currentImage }}
                  style={styles.itemAvatar}
                  resizeMode="cover"
                />

                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.currentName}
                    </Text>
                    {item.isSwapped && (
                      <View style={styles.swappedBadge}>
                        <Text style={styles.swappedBadgeText}>SWAPPED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemQuantity}>{item.currentQuantity}</Text>
                  {item.isSwapped && (
                    <Text style={styles.itemOriginalNote}>
                      Replaced: {item.originalName} ({item.originalQuantity})
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.itemActions}>
                  {item.isSwapped ? (
                    <TouchableOpacity
                      style={styles.resetBtn}
                      onPress={() => handleResetItem(index)}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={13} color="#059669" />
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.swapBtn, swapsRemaining === 0 && styles.swapBtnDisabled]}
                      onPress={() => swapsRemaining > 0 && setActiveSwapIndex(index)}
                      disabled={swapsRemaining === 0}
                      activeOpacity={0.7}
                    >
                      <ArrowRightLeft size={13} color={swapsRemaining > 0 ? '#065f46' : '#94a3b8'} />
                      <Text
                        style={[
                          styles.swapBtnText,
                          swapsRemaining === 0 && styles.swapBtnTextDisabled,
                        ]}
                      >
                        Swap
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Fixed Box Price</Text>
              <Text style={styles.footerPrice}>₹{boxPrice}</Text>
            </View>

            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={handleConfirmAddToCart}
              activeOpacity={0.88}
            >
              <ShoppingBag size={18} color="#ffffff" />
              <Text style={styles.addToCartText}>
                Add to Cart • ₹{boxPrice}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SWAP PICKER SHEET (Alternative Crops) ── */}
        {activeSwapIndex !== null && (
          <View style={styles.swapSheetOverlay}>
            <View style={styles.swapSheet}>
              <View style={styles.swapSheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.swapSheetTitle}>
                    Swap {items[activeSwapIndex]?.currentName}
                  </Text>
                  <Text style={styles.swapSheetSubtitle}>
                    Choose an alternative farm crop from this week's harvest
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setActiveSwapIndex(null)}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.swapOptionsList} showsVerticalScrollIndicator={false}>
                {availableAlternatives.map((alt) => (
                  <TouchableOpacity
                    key={alt.id}
                    style={styles.swapOptionRow}
                    onPress={() => handleSwapSelect(alt)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: alt.image_url }}
                      style={styles.altAvatar}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.swapOptionName}>{alt.name}</Text>
                      <Text style={styles.swapOptionQty}>{alt.quantity}</Text>
                    </View>
                    <View style={styles.selectSwapPill}>
                      <Text style={styles.selectSwapPillText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  pricePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  swapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapBannerText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#047857',
  },
  swapDots: {
    flexDirection: 'row',
    gap: 6,
  },
  swapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  swapDotActive: {
    backgroundColor: '#047857',
  },
  itemsList: {
    maxHeight: 380,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemCardSwapped: {
    backgroundColor: '#f0fdf4',
    borderColor: '#047857',
  },
  itemAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  swappedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  swappedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  itemOriginalNote: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  itemActions: {
    marginLeft: 8,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  swapBtnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  swapBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065f46',
  },
  swapBtnTextDisabled: {
    color: '#94a3b8',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 8,
    marginBottom: 20,
  },
  footerLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#065f46',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  /* ── SWAP PICKER OVERLAY ── */
  swapSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  swapSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.65,
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  swapSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  swapSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  swapSheetSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  swapOptionsList: {
    maxHeight: 320,
  },
  swapOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  altAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  swapOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  swapOptionQty: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  selectSwapPill: {
    backgroundColor: '#065f46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectSwapPillText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
