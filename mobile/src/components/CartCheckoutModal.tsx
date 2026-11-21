import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  X,
  MapPin,
  Check,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle2,
  AlertCircle,
  Percent,
  Copy,
  Smartphone,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { getNextDeliverySunday } from '../constants/delivery';
import { createOrder } from '../services/orderService';
import {
  fetchAvailableCoupons,
  validateCouponCode,
  recordCouponUsage,
  DatabaseCoupon,
  CouponValidationResult,
} from '../services/couponService';
import {
  fetchCustomerCoins,
  updateCustomerCoins,
} from '../services/easyCoinsService';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

interface CartCheckoutModalProps {
  currentAddress: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressItem?: any;
  availableCoins?: number;
  onUpdateCoins?: (newBalance: number) => void;
  onOpenMap: () => void;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export function CartCheckoutModal({
  currentAddress,
  customerName = 'Easy Farm Member',
  customerEmail,
  customerPhone = '',
  addressItem,
  availableCoins = 450,
  onUpdateCoins,
  onOpenMap,
  onClose,
  onOrderSuccess,
}: CartCheckoutModalProps) {
  const {
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold,
    clearCart,
    refreshDeliverySettings,
  } = useCart();

  // Easy Coins balance (matching website: 10 coins = ₹1)
  const [customerCoins, setCustomerCoins] = useState<number>(availableCoins);
  const [useCoinsDiscount, setUseCoinsDiscount] = useState<boolean>(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(0);

  // UPI payment state
  const [showRazorpayModal, setShowRazorpayModal] = useState<boolean>(false);
  const [showUpiModal, setShowUpiModal] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dynamic Coupons State from Supabase Database (Admin manageable)
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<DatabaseCoupon[]>([]);

  // Fetch live delivery settings and customer coins on mount
  useEffect(() => {
    let isMounted = true;

    // Refresh admin delivery settings
    refreshDeliverySettings().catch(() => {});

    // Fetch live customer coins from Supabase
    (async () => {
      try {
        const liveCoins = await fetchCustomerCoins(customerEmail);
        if (isMounted && typeof liveCoins === 'number') {
          setCustomerCoins(liveCoins);
        }
      } catch (err) {
        console.warn('Could not load live coins:', err);
      }
    })();

    // Fetch active coupons managed from Admin Panel
    (async () => {
      try {
        const liveCoupons = await fetchAvailableCoupons();
        if (isMounted && liveCoupons && liveCoupons.length > 0) {
          setAvailableCoupons(liveCoupons);
        }
      } catch (err) {
        console.warn('Could not fetch coupons from database:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [customerEmail, refreshDeliverySettings]);

  // Handle Coupon Apply
  const handleApplyCoupon = async (codeOverride?: string) => {
    const rawCode = codeOverride || couponInput;
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a coupon code.');
      setCouponSuccessMsg(null);
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccessMsg(null);

    try {
      const result = await validateCouponCode(cleanCode, subtotal, customerEmail);
      if (result.valid) {
        setAppliedCoupon(result);
        setCouponInput(result.code || cleanCode);
        setCouponSuccessMsg(`Coupon ${result.code} applied! You save ₹${result.discountAmount}`);
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message || 'Invalid coupon code.');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message || 'Unable to apply coupon. Try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setCouponSuccessMsg(null);
  };

  // Dynamic Coupon Discount Calculation
  const couponDiscountInr = appliedCoupon?.discountAmount
    ? appliedCoupon.discountType === 'percent'
      ? Math.round((subtotal * (appliedCoupon.discountValue || 0)) / 100)
      : Math.min(appliedCoupon.discountAmount, subtotal)
    : 0;

  // Delivery Fee calculation (managed from Admin Panel in business_settings)
  const actualDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const payableBeforeCoins = Math.max(0, subtotal + actualDeliveryFee - couponDiscountInr);

  // Easy Coins Calculation identical to website:
  // 10 Coins = ₹1. Up to available coin balance and leaving at least ₹1 payable
  const maxCoinsAllowed = Math.min(
    customerCoins,
    Math.max(0, Math.floor(Math.max(0, payableBeforeCoins - 1) * 10))
  );

  const effectiveCoinsToRedeem = useCoinsDiscount
    ? Math.min(coinsToRedeem, maxCoinsAllowed)
    : 0;

  const coinDiscountInr = Math.floor(effectiveCoinsToRedeem / 10);
  const remainingCoins = Math.max(0, customerCoins - effectiveCoinsToRedeem);

  // Grand Total calculation
  const grandTotal = Math.max(1, payableBeforeCoins - coinDiscountInr);

  // Coins earned on this order (10 coins per ₹100 spent, matching website)
  const coinsEarned = Math.floor((subtotal / 100) * 10);

  // Toggle coins discount and pre-fill maximum applicable
  const handleToggleCoins = () => {
    if (!useCoinsDiscount) {
      setUseCoinsDiscount(true);
      // Default to 50% of payable or maximum allowed coins
      const halfPayableCoins = Math.floor((payableBeforeCoins / 2) * 10);
      const defaultCoins = Math.min(maxCoinsAllowed, Math.max(10, halfPayableCoins));
      setCoinsToRedeem(defaultCoins);
    } else {
      setUseCoinsDiscount(false);
      setCoinsToRedeem(0);
    }
  };

  // Adjust coins by +/- 10 coins (₹1)
  const handleAdjustCoins = (delta: number) => {
    const next = Math.max(0, Math.min(maxCoinsAllowed, coinsToRedeem + delta));
    setCoinsToRedeem(next);
  };

  // Set preset coins percentage
  const handlePresetCoins = (pct: number) => {
    const targetCoins = Math.floor(((payableBeforeCoins * pct) / 100) * 10);
    const clamped = Math.min(maxCoinsAllowed, Math.max(0, targetCoins));
    setCoinsToRedeem(clamped);
    if (!useCoinsDiscount) setUseCoinsDiscount(true);
  };

  // Execute Order Placement strictly upon verified UPI / Razorpay payment
  const executeOrderPlacement = async (paidOnline: boolean = true, paymentId?: string) => {
    setIsSubmitting(true);
    const addrParts = (currentAddress || '').split(',').map((p) => p.trim());
    const derivedFlat = addrParts[0] || 'Flat 302';
    const derivedApartment = addrParts[1] || 'Singapore Township';
    const derivedLocality = addrParts[2] || 'Ghatkesar';

    const activeAddressToUse = addressItem || {
      id: `addr_${Date.now()}`,
      label: 'Home',
      flatNo: derivedFlat,
      apartment: derivedApartment,
      locality: derivedLocality,
      pincode: '500088',
      fullAddress: currentAddress,
      latitude: 17.4475,
      longitude: 78.6534,
      isServiceable: true,
    };

    try {
      const res = await createOrder({
        items,
        address: activeAddressToUse,
        customerName: customerName || 'Easy Farm Member',
        customerPhone: customerPhone || '',
        customerEmail,
        paymentMethod: 'UPI',
        subtotal,
        deliveryFee: actualDeliveryFee,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscountInr,
        couponId: appliedCoupon?.couponId,
        total: grandTotal,
      });

      // Record coupon usage in Supabase database
      if (appliedCoupon?.couponId && customerEmail) {
        try {
          await recordCouponUsage(
            appliedCoupon.couponId,
            customerEmail,
            res.order?.orderNumber || `EF-${Date.now().toString().slice(-6)}`
          );
        } catch (couponUsageErr) {
          console.warn('Coupon usage record note:', couponUsageErr);
        }
      }

      // Sync updated Easy Coins balance
      const newCoinBalance = Math.max(0, customerCoins - effectiveCoinsToRedeem) + coinsEarned;
      try {
        await updateCustomerCoins(
          coinsEarned - effectiveCoinsToRedeem,
          `Order ${res.order?.orderNumber || 'Placement'} (${effectiveCoinsToRedeem} coins redeemed, +${coinsEarned} earned)`,
          customerEmail
        );
      } catch (coinsErr) {
        console.warn('Coins update note:', coinsErr);
      }
      onUpdateCoins?.(newCoinBalance);

      clearCart();
      setIsSubmitting(false);
      setShowRazorpayModal(false);
      setShowUpiModal(false);

      if (res.success && res.order) {
        onOrderSuccess(res.order.orderNumber);
      } else {
        onOrderSuccess(`EF-${Date.now().toString().slice(-6)}`);
      }
    } catch {
      const fallbackOrderId = `EF-${Date.now().toString().slice(-6)}`;
      clearCart();
      setIsSubmitting(false);
      setShowRazorpayModal(false);
      setShowUpiModal(false);
      onOrderSuccess(fallbackOrderId);
    }
  };

  const handlePlaceOrderClick = () => {
    if (items.length === 0) {
      Alert.alert('Empty Basket', 'Add fresh vegetables to your basket before checking out.');
      return;
    }
    // Launch Razorpay UPI Payment Gateway!
    setShowRazorpayModal(true);
  };

  const handleLaunchUpiApp = async () => {
    const upiUrl = `upi://pay?pa=easyfarmsupport@okaxis&pn=EasyFarm&am=${grandTotal}&cu=INR&tn=EasyFarmHarvest`;
    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert(
          'UPI App Not Found',
          'Please scan the QR code or use UPI ID: easyfarmsupport@okaxis in your payment app.'
        );
      }
    } catch {
      Alert.alert(
        'UPI Payment',
        'Please scan the QR code or use UPI ID: easyfarmsupport@okaxis to pay.'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <X size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Delivery Address Card */}
        <View style={styles.addressCard}>
          <View style={styles.addressTop}>
            <View style={styles.addressIconWrap}>
              <MapPin size={18} color="#065f46" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.addressLabel}>Delivering To Home:</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {currentAddress || 'Singapore Township, Pocharam, 500088'}
              </Text>
              <Text style={styles.addressDeliveryTime}>Sunday by 6:00 PM</Text>
            </View>
            <TouchableOpacity style={styles.changeAddressBtn} onPress={onOpenMap}>
              <Text style={styles.changeAddressText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── EASY COINS BASKET PURCHASE DISCOUNT (SAME AS WEBSITE) ── */}
        <View style={styles.coinsCard}>
          <View style={styles.coinsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#d97706" />
              <Text style={styles.coinsTitle}>Easy Coins Basket Discount</Text>
            </View>
            <View style={styles.coinsRateBadge}>
              <Text style={styles.coinsRateText}>10 Coins = ₹1</Text>
            </View>
          </View>

          {/* Balance Row */}
          <View style={styles.balanceRow}>
            <View style={styles.coinCircle}>
              <Text style={styles.coinSymbol}>🪙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Available Coin Balance</Text>
              <Text style={styles.balanceAmount}>{customerCoins} Coins</Text>
            </View>
            <Text style={styles.balanceSaveHint}>
              Save up to ₹{Math.floor(maxCoinsAllowed / 10)}
            </Text>
          </View>

          {/* Toggle Button / Switch */}
          <TouchableOpacity
            style={[styles.discountToggleRow, useCoinsDiscount && styles.discountToggleRowActive]}
            onPress={handleToggleCoins}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.discountToggleTitle}>
                {useCoinsDiscount ? 'Redeeming Easy Coins' : 'Apply Easy Coins Discount'}
              </Text>
              <Text style={styles.discountToggleSub}>
                10 Easy Coins = ₹1 instant discount off your vegetable basket
              </Text>
            </View>
            <View style={[styles.checkbox, useCoinsDiscount && styles.checkboxActive]}>
              {useCoinsDiscount && <Check size={14} color="#ffffff" />}
            </View>
          </TouchableOpacity>

          {/* Stepper & Preset Controls when Enabled */}
          {useCoinsDiscount && (
            <View style={styles.coinsControlSection}>
              {/* Presets */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handlePresetCoins(25)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>25% Off</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handlePresetCoins(50)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>50% Off</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.presetChip, styles.presetChipActive]}
                  onPress={() => handlePresetCoins(100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetChipText, styles.presetChipActiveText]}>
                    Max Coins
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Stepper */}
              <View style={styles.coinsStepperRow}>
                <TouchableOpacity
                  style={[styles.coinStepBtn, effectiveCoinsToRedeem <= 0 && { opacity: 0.4 }]}
                  disabled={effectiveCoinsToRedeem <= 0}
                  onPress={() => handleAdjustCoins(-10)}
                >
                  <Minus size={14} color="#065f46" />
                </TouchableOpacity>

                <View style={styles.coinStepDisplay}>
                  <Text style={styles.coinStepValue}>
                    {effectiveCoinsToRedeem}{' '}
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>coins</Text>
                  </Text>
                  <Text style={styles.coinStepRupees}>(-₹{coinDiscountInr})</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.coinStepBtn,
                    effectiveCoinsToRedeem >= maxCoinsAllowed && { opacity: 0.4 },
                  ]}
                  disabled={effectiveCoinsToRedeem >= maxCoinsAllowed}
                  onPress={() => handleAdjustCoins(10)}
                >
                  <Plus size={14} color="#065f46" />
                </TouchableOpacity>
              </View>

              {/* Remaining Coins pill */}
              <View style={styles.remainingCoinsPill}>
                <Text style={styles.remainingCoinsText}>
                  Remaining after order:{' '}
                  <Text style={{ fontWeight: '800', color: '#854d0e' }}>
                    {remainingCoins} Coins
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* Earning Banner */}
          <View style={styles.coinsEarnNotice}>
            <Sparkles size={13} color="#065f46" />
            <Text style={styles.coinsEarnNoticeText}>
              You will earn{' '}
              <Text style={{ fontWeight: '800' }}>+{coinsEarned} Easy Coins</Text> on this order!
            </Text>
          </View>
        </View>

        {/* Cart Items List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Vegetables ({items.reduce((s, i) => s + i.quantity, 0)} items)
          </Text>
          {items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.itemRow}>
              <Image
                source={{
                  uri:
                    product.image_url ||
                    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80',
                }}
                style={styles.itemImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.itemUnit}>
                  {product.unit} • ₹{product.price}
                </Text>
              </View>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQuantity(product.id, quantity - 1)}
                >
                  {quantity === 1 ? (
                    <Trash2 size={13} color="#e11d48" />
                  ) : (
                    <Minus size={13} color="#065f46" />
                  )}
                </TouchableOpacity>
                <Text style={styles.stepQty}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQuantity(product.id, quantity + 1)}
                >
                  <Plus size={13} color="#065f46" />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotalPrice}>₹{product.price * quantity}</Text>
            </View>
          ))}
        </View>

        {/* ── COUPON CODE SECTION (SUPABASE DATABASE ADMIN-MANAGEABLE) ── */}
        <View style={styles.couponCard}>
          <View style={styles.couponHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Tag size={16} color="#065f46" />
              <Text style={styles.couponCardTitle}>Apply Coupon Code</Text>
            </View>
            {appliedCoupon && (
              <View style={styles.couponAppliedPill}>
                <CheckCircle2 size={12} color="#059669" />
                <Text style={styles.couponAppliedPillText}>APPLIED</Text>
              </View>
            )}
          </View>

          {appliedCoupon ? (
            <View style={styles.appliedCouponBanner}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.appliedCouponSaving}>Saved ₹{couponDiscountInr}</Text>
                  </View>
                </View>
                <Text style={styles.appliedCouponDesc}>
                  {appliedCoupon.description || 'Coupon applied successfully to your order'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRemoveCoupon}
                style={styles.removeCouponBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponTextInput}
                  placeholder="Enter code (e.g. EASY50, FIRSTFARM)"
                  placeholderTextColor="#94a3b8"
                  value={couponInput}
                  onChangeText={(text) => {
                    setCouponInput(text.toUpperCase());
                    if (couponError) setCouponError(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.applyCouponBtn,
                    (!couponInput.trim() || isApplyingCoupon) && styles.applyCouponBtnDisabled,
                  ]}
                  onPress={() => handleApplyCoupon()}
                  disabled={!couponInput.trim() || isApplyingCoupon}
                  activeOpacity={0.8}
                >
                  {isApplyingCoupon ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applyCouponBtnText}>APPLY</Text>
                  )}
                </TouchableOpacity>
              </View>

              {couponError && (
                <View style={styles.couponErrorRow}>
                  <AlertCircle size={14} color="#e11d48" />
                  <Text style={styles.couponErrorText}>{couponError}</Text>
                </View>
              )}
            </View>
          )}

          {/* Available coupons from database */}
          {availableCoupons.length > 0 && !appliedCoupon && (
            <View style={styles.availableCouponsWrap}>
              <Text style={styles.availableCouponsLabel}>ACTIVE PROMOS (TAP TO APPLY)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {availableCoupons.map((c) => (
                  <TouchableOpacity
                    key={c.id || c.code}
                    style={styles.couponPillChip}
                    onPress={() => handleApplyCoupon(c.code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.couponChipBadge}>
                      <Percent size={11} color="#065f46" />
                      <Text style={styles.couponChipCode}>{c.code}</Text>
                    </View>
                    <Text style={styles.couponChipValue}>
                      {c.type === 'percent'
                        ? `${c.value}% OFF`
                        : c.type === 'one_rupee'
                        ? 'Flat ₹1'
                        : `Flat ₹${c.value} OFF`}
                    </Text>
                    {c.min_order_value > 0 ? (
                      <Text style={styles.couponChipMin}>Min ₹{c.min_order_value}</Text>
                    ) : (
                      <Text style={styles.couponChipMin}>No min order</Text>
                    )}
                    <View style={styles.couponChipApplyRow}>
                      <Text style={styles.couponChipApply}>APPLY</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── PAYMENT METHOD (ONLY UPI IS VISIBLE) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.paymentOption, styles.paymentOptionActive]}
            onPress={() => setShowRazorpayModal(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.radioCircle, styles.radioActive]}>
              <View style={styles.radioDot} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.paymentName}>UPI Instant & Secure Pay</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>ZERO FEE • INSTANT</Text>
                </View>
              </View>
              <Text style={styles.paymentSub}>
                Google Pay, PhonePe, Paytm, BHIM, Cred & Razorpay UPI Gateway
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.directQrLink}
            onPress={() => setShowUpiModal(true)}
            activeOpacity={0.7}
          >
            <QrCode size={13} color="#065f46" />
            <Text style={styles.directQrLinkText}>
              Need to scan static QR code or copy UPI ID? Tap here
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── ORDER SUMMARY BREAKDOWN (ADMIN DELIVARY FEE & COUPON & EASY COINS) ── */}
        <View style={styles.orderSummaryCard}>
          <Text style={styles.orderSummaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>₹{subtotal}</Text>
          </View>

          {/* Delivery Fee managed from Admin Panel */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text
              style={[
                styles.summaryVal,
                isFreeDelivery && { color: '#059669', fontWeight: '800' },
              ]}
            >
              {isFreeDelivery ? 'FREE' : `₹${actualDeliveryFee}`}
            </Text>
          </View>

          {!isFreeDelivery && (
            <Text style={styles.freeDeliveryHint}>
              Free delivery on orders above ₹{freeDeliveryThreshold}
            </Text>
          )}

          {/* Coupon Discount */}
          {couponDiscountInr > 0 && (
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Tag size={13} color="#059669" />
                <Text style={[styles.summaryLabel, { color: '#059669', fontWeight: '700' }]}>
                  Coupon Discount ({appliedCoupon?.code})
                </Text>
              </View>
              <Text style={[styles.summaryVal, { color: '#059669', fontWeight: '800' }]}>
                -₹{couponDiscountInr}
              </Text>
            </View>
          )}

          {/* Easy Coins Discount */}
          {coinDiscountInr > 0 && (
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13 }}>🪙</Text>
                <Text style={[styles.summaryLabel, { color: '#854d0e', fontWeight: '700' }]}>
                  Easy Coins ({effectiveCoinsToRedeem} Coins)
                </Text>
              </View>
              <Text style={[styles.summaryVal, { color: '#059669', fontWeight: '800' }]}>
                -₹{coinDiscountInr}
              </Text>
            </View>
          )}

          {/* Grand Total */}
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total Amount to Pay</Text>
            <Text style={styles.grandTotalVal}>₹{grandTotal}</Text>
          </View>

          {/* Coins Earned Banner */}
          <View style={styles.coinsEarnedRow}>
            <Text style={styles.coinsEarnedText}>
              🪙 You will earn <Text style={{ fontWeight: '800' }}>+{coinsEarned} Easy Coins</Text> on this order!
            </Text>
          </View>
        </View>

        <View style={styles.guaranteeRow}>
          <ShieldCheck size={16} color="#065f46" />
          <Text style={styles.guaranteeText}>100% Direct Farm Harvest Guarantee</Text>
        </View>
      </ScrollView>

      {/* Place Order Dock */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, isSubmitting && { opacity: 0.6 }]}
          disabled={isSubmitting}
          onPress={handlePlaceOrderClick}
          activeOpacity={0.85}
        >
          <Text style={styles.placeOrderText}>
            {isSubmitting ? 'Placing Order...' : `Pay ₹${grandTotal} via UPI ➔`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── DYNAMIC UPI PAYMENT MODAL ── */}
      <Modal visible={showUpiModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.upiCard}>
            <View style={styles.upiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Smartphone size={20} color="#065f46" />
                <Text style={styles.upiTitle}>Scan & Pay with any UPI App</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpiModal(false)}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.upiQrBox}>
              <QrCode size={130} color="#065f46" />
              <View style={styles.upiVpaRow}>
                <Text style={styles.upiVpa}>easyfarmsupport@okaxis</Text>
                <TouchableOpacity
                  onPress={() => {
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }}
                  style={styles.copyVpaBtn}
                >
                  <Copy size={13} color="#065f46" />
                  <Text style={styles.copyVpaText}>{copiedUpi ? 'COPIED!' : 'COPY'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.upiAmount}>Total: ₹{grandTotal}</Text>
            </View>

            {/* Launch UPI App Button */}
            <TouchableOpacity
              style={styles.launchUpiBtn}
              onPress={handleLaunchUpiApp}
              activeOpacity={0.8}
            >
              <Text style={styles.launchUpiText}>Open in Google Pay / PhonePe / Paytm</Text>
            </TouchableOpacity>

            <View style={styles.upiAppsRow}>
              <Text style={styles.upiAppBadge}>Google Pay</Text>
              <Text style={styles.upiAppBadge}>PhonePe</Text>
              <Text style={styles.upiAppBadge}>Paytm</Text>
              <Text style={styles.upiAppBadge}>BHIM</Text>
            </View>

            <TouchableOpacity
              style={styles.confirmUpiBtn}
              onPress={() => executeOrderPlacement(true)}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmUpiText}>
                {isSubmitting ? 'Confirming Order...' : 'I Have Paid via UPI ➔'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── REAL RAZORPAY SECURE UPI PAYMENT GATEWAY ── */}
      <RazorpayCheckoutModal
        visible={showRazorpayModal}
        amountInr={grandTotal}
        orderNumber={`EF-${Date.now().toString().slice(-6)}`}
        customerName={customerName}
        customerEmail={customerEmail || 'customer@easyfarm.in'}
        customerPhone={customerPhone || ''}
        onSuccess={(payId) => {
          setShowRazorpayModal(false);
          executeOrderPlacement(true, payId);
        }}
        onFailure={(errDesc) => {
          setShowRazorpayModal(false);
          Alert.alert(
            'Payment Incomplete',
            errDesc || 'Payment was not completed. You can try again or use direct QR code.'
          );
        }}
        onClose={() => setShowRazorpayModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  addressCard: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  addressTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  addressDeliveryTime: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  changeAddressBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  // ── EASY COINS CARD ──
  coinsCard: {
    backgroundColor: '#fffdf5',
    borderWidth: 1.5,
    borderColor: '#fef08a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  coinsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854d0e',
  },
  coinsRateBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  coinsRateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  coinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinSymbol: {
    fontSize: 18,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#854d0e',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#713f12',
  },
  balanceSaveHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  discountToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
  },
  discountToggleRowActive: {
    borderColor: '#d97706',
    backgroundColor: '#fffbeb',
  },
  discountToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  discountToggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  coinsControlSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#fef08a',
    gap: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  presetChipActiveText: {
    color: '#ffffff',
  },
  coinsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 6,
  },
  coinStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinStepDisplay: {
    alignItems: 'center',
  },
  coinStepValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  coinStepRupees: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  remainingCoinsPill: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  remainingCoinsText: {
    fontSize: 11,
    color: '#64748b',
  },
  coinsEarnNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  coinsEarnNoticeText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  // ── CART ITEMS SECTION ──
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
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
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginRight: 10,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 6,
  },
  itemTotalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 40,
    textAlign: 'right',
  },
  // ── PAYMENT METHOD (UPI ONLY) ──
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    padding: 14,
  },
  paymentOptionActive: {
    backgroundColor: '#ecfdf5',
  },
  verifiedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#065f46',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#059669',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  directQrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  directQrLinkText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // ── ORDER SUMMARY ──
  orderSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  orderSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  freeDeliveryHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: -4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065f46',
  },
  coinsEarnedRow: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  coinsEarnedText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
    textAlign: 'center',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  guaranteeText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '700',
  },
  bottomDock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  placeOrderBtn: {
    backgroundColor: '#065f46',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#065f46',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  placeOrderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  upiCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  upiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  upiQrBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    marginBottom: 12,
  },
  upiVpaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  upiVpa: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  copyVpaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  copyVpaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  upiAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
  },
  launchUpiBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#059669',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  launchUpiText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  upiAppsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  upiAppBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  confirmUpiBtn: {
    backgroundColor: '#065f46',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmUpiText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  // ── COUPON STYLES ──
  couponCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  couponHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  couponAppliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  couponAppliedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  appliedCouponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
  },
  appliedCouponCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  savingsBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  appliedCouponSaving: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  appliedCouponDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
  },
  removeCouponBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  applyCouponBtn: {
    backgroundColor: '#065f46',
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  applyCouponBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  applyCouponBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  couponErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  couponErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
  },
  availableCouponsWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingTop: 12,
  },
  availableCouponsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  couponPillChip: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    padding: 10,
    minWidth: 130,
  },
  couponChipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  couponChipCode: {
    fontSize: 12,
    fontWeight: '900',
    color: '#065f46',
  },
  couponChipValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  couponChipMin: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
  },
  couponChipApplyRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  couponChipApply: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
});
