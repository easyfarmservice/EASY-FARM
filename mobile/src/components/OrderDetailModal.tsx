import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  X,
  MapPin,
  Check,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Calendar,
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  Copy,
  ChevronRight,
  RotateCcw,
  Tag,
  AlertCircle,
  HelpCircle,
  Mail,
} from 'lucide-react-native';
import { CustomerOrder } from '../services/orderService';

interface OrderDetailModalProps {
  visible: boolean;
  order: CustomerOrder | null;
  onClose: () => void;
  onReorder?: (order: CustomerOrder) => void;
}

export function OrderDetailModal({
  visible,
  order,
  onClose,
  onReorder,
}: OrderDetailModalProps) {
  if (!order) return null;

  const isDelivered = order.status === 'delivered';
  const isOut = order.status === 'out_for_delivery';
  const isPacked = order.status === 'packed';
  const isHarvested = order.status === 'harvested';
  const isConfirmed = order.status === 'confirmed';

  // Extract all customized crops from basket items
  const customCropItems = order.items.flatMap((i) => i.customizedItems || []);
  const hasCustomCrops = customCropItems.length > 0;

  // Determine active step index for the tracker (0 to 4)
  let activeStep = 0;
  if (isConfirmed) activeStep = 0;
  if (isHarvested) activeStep = 1;
  if (isPacked) activeStep = 2;
  if (isOut) activeStep = 3;
  if (isDelivered) activeStep = 4;

  const handleWhatsAppHelp = () => {
    const text = encodeURIComponent(
      `Hi Easy Farm Team, I have a question regarding my order #${order.orderNumber} scheduled for ${order.deliveryDate}.`
    );
    Linking.openURL(`https://wa.me/919701685116?text=${text}`).catch(() => {
      Alert.alert('Notice', 'Unable to open WhatsApp. Contact us at 9701685116.');
    });
  };

  const trackingSteps = [
    {
      title: 'Order Confirmed',
      sub: 'Sunday harvest reserved',
      desc: 'Crops scheduled with local farmers in Telangana corridor.',
      done: activeStep >= 0,
      active: activeStep === 0,
      icon: 'check',
    },
    {
      title: 'Fresh Harvesting',
      sub: 'Sunday early morning (6:00 AM)',
      desc: 'Plucked fresh from fields hours before doorstep delivery.',
      done: activeStep >= 1,
      active: activeStep === 1,
      icon: 'plant',
    },
    {
      title: 'Graded & Quality Packed',
      sub: 'Ozone-washed in Eco-Crates',
      desc: 'Sorted, weighed, and packed into reusable zero-plastic crates.',
      done: activeStep >= 2,
      active: activeStep === 2,
      icon: 'package',
    },
    {
      title: 'Out for Delivery',
      sub: 'En route to your door',
      desc: 'Our electric delivery van is on its way with fresh harvest.',
      done: activeStep >= 3,
      active: activeStep === 3,
      icon: 'truck',
    },
    {
      title: 'Delivered with OTP',
      sub: 'Fresh at your doorstep',
      desc: 'Handover verified and weekly streak unlocked.',
      done: activeStep >= 4,
      active: activeStep === 4,
      icon: 'home',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.topBarTitleWrap}>
            <Text style={styles.topBarTitle}>Order #{order.orderNumber}</Text>
            <Text style={styles.topBarSub}>Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={handleWhatsAppHelp} style={styles.topBarActionBtn} activeOpacity={0.7}>
            <MessageSquare size={18} color="#065f46" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Status Header Banner */}
          <View
            style={[
              styles.statusBanner,
              isDelivered
                ? styles.statusBannerDelivered
                : isOut
                ? styles.statusBannerOut
                : styles.statusBannerActive,
            ]}
          >
            <View style={styles.statusBannerRow}>
              <View style={styles.statusIconCircle}>
                {isDelivered ? (
                  <CheckCircle2 size={24} color="#059669" />
                ) : isOut ? (
                  <Truck size={24} color="#d97706" />
                ) : (
                  <Sparkles size={24} color="#065f46" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusBannerTitle}>
                  {isDelivered
                    ? 'Delivered at Doorstep'
                    : isOut
                    ? 'Van Out for Delivery!'
                    : isPacked
                    ? 'Packed & Ready for Dispatch'
                    : isHarvested
                    ? 'Harvested from Local Fields'
                    : 'Confirmed for Sunday Harvest'}
                </Text>
                <Text style={styles.statusBannerDesc}>
                  {isDelivered
                    ? 'Hope you enjoyed the fresh harvest from Easy Farm!'
                    : `Expected: ${order.deliveryDate} • ${order.deliverySlot}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Handover OTP Highlight Banner (Shown prominently when Out for Delivery) */}
          {isOut && (
            <View style={styles.otpCard}>
              <View style={styles.otpCardTop}>
                <View style={styles.otpBadge}>
                  <ShieldCheck size={14} color="#065f46" />
                  <Text style={styles.otpBadgeText}>DELIVERY HANDOVER OTP</Text>
                </View>
                <Text style={styles.otpTimeNotice}>Active until handover</Text>
              </View>

              <Text style={styles.otpCardPrompt}>
                Your 4-digit delivery handover OTP has been sent directly to your registered email address. Please check your email inbox and share the 4 digits with the delivery partner at your doorstep to confirm handover.
              </Text>

              <View style={styles.otpDigitsContainer}>
                <View style={styles.otpPendingBox}>
                  <Mail size={16} color="#065f46" style={{ marginRight: 6 }} />
                  <Text style={styles.otpPendingText}>Check your registered email inbox for 4-digit OTP</Text>
                </View>
              </View>
            </View>
          )}

          {/* Live Tracking Progress Timeline */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={16} color="#065f46" />
              <Text style={styles.sectionTitle}>Live Harvest Tracking</Text>
            </View>

            <View style={styles.timelineContainer}>
              {trackingSteps.map((step, idx) => {
                const isLast = idx === trackingSteps.length - 1;
                return (
                  <View key={idx} style={styles.timelineStepRow}>
                    {/* Left Icon + Connecting Line */}
                    <View style={styles.timelineLeftColumn}>
                      <View
                        style={[
                          styles.timelineCircle,
                          step.done ? styles.timelineCircleDone : styles.timelineCirclePending,
                          step.active && styles.timelineCircleActive,
                        ]}
                      >
                        {step.done ? (
                          <Check size={12} color="#ffffff" />
                        ) : (
                          <View style={styles.timelineInnerDot} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineVerticalLine,
                            step.done && styles.timelineVerticalLineDone,
                          ]}
                        />
                      )}
                    </View>

                    {/* Right Step Text Details */}
                    <View style={styles.timelineRightColumn}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.timelineStepTitle, step.done && styles.timelineStepTitleDone]}>
                          {step.title}
                        </Text>
                        {step.active && (
                          <View style={styles.activePill}>
                            <Text style={styles.activePillText}>IN PROGRESS</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineStepSub}>{step.sub}</Text>
                      <Text style={styles.timelineStepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Delivery Address & Customer Destination */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <MapPin size={16} color="#065f46" />
              <Text style={styles.sectionTitle}>Delivery Destination</Text>
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.addressNameText}>{order.customerName || 'Valued Customer'}</Text>
              {order.customerPhone ? (
                <Text style={styles.addressPhoneText}>📞 {order.customerPhone}</Text>
              ) : null}
              <Text style={styles.addressFullText}>
                {order.address?.fullAddress ||
                  `${order.address?.flatNo ? 'Flat ' + order.address.flatNo + ', ' : ''}${order.address?.apartment || ''}, ${order.address?.locality || 'Pocharam, Hyderabad'}`}
              </Text>
              <View style={styles.addressTagRow}>
                <View style={styles.zoneTag}>
                  <Text style={styles.zoneTagText}>📍 {order.address?.locality || 'Ghatkesar & Pocharam'}</Text>
                </View>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>✓ Direct Doorstep Delivery</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Harvest Basket & Fresh Vegetables Breakdown */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Package size={16} color="#065f46" />
              <Text style={styles.sectionTitle}>Harvest Box Contents</Text>
            </View>

            {/* Farm Box Container */}
            {order.items.map((it, idx) => (
              <View key={it.id || idx} style={styles.boxContainer}>
                <View style={styles.boxHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boxName}>{it.name}</Text>
                    <Text style={styles.boxQty}>Quantity: {it.quantity} Box</Text>
                  </View>
                  <Text style={styles.boxPrice}>₹{it.total || it.price}</Text>
                </View>

                {/* Customized Crops Breakdown */}
                {Array.isArray(it.customizedItems) && it.customizedItems.length > 0 ? (
                  <View style={styles.cropsListWrap}>
                    <Text style={styles.cropsSectionHeading}>FRESH VEGETABLES INCLUDED:</Text>
                    {it.customizedItems.map((crop: any, cIdx: number) => (
                      <View key={crop.productId || crop.id || cIdx} style={styles.cropRow}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13 }}>🌱</Text>
                          <Text style={styles.cropName}>{crop.name}</Text>
                        </View>
                        <Text style={styles.cropWeight}>{crop.selectedWeight || crop.quantity || crop.unit || 'Standard'}</Text>
                        <Text style={styles.cropPrice}>₹{crop.price || 0}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {/* Bill & Payment Summary */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Tag size={16} color="#065f46" />
              <Text style={styles.sectionTitle}>Bill & Payment Breakdown</Text>
            </View>

            <View style={styles.billTable}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Subtotal</Text>
                <Text style={styles.billVal}>₹{order.subtotal || order.total}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Sunday Farm-to-Door Delivery</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.strikethroughText}>₹40</Text>
                  <Text style={styles.freeGreenText}>FREE</Text>
                </View>
              </View>

              {Number(order.couponDiscount) > 0 ? (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: '#059669' }]}>
                    Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}
                  </Text>
                  <Text style={[styles.billVal, { color: '#059669' }]}>-₹{order.couponDiscount}</Text>
                </View>
              ) : null}

              <View style={styles.billDivider} />

              <View style={[styles.billRow, { marginTop: 4 }]}>
                <Text style={styles.billTotalLabel}>Total Amount</Text>
                <Text style={styles.billTotalVal}>₹{order.total}</Text>
              </View>

              <View style={styles.paymentStatusBadgeRow}>
                <View style={styles.paidMethodBadge}>
                  <Check size={12} color="#065f46" />
                  <Text style={styles.paidMethodText}>
                    {order.paymentStatus === 'paid' ? 'Paid Online via ' : 'Payment: '}
                    {order.paymentMethod}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Easy Farm Quality Guarantee & Help */}
          <View style={styles.supportCard}>
            <View style={styles.supportHeader}>
              <ShieldCheck size={20} color="#065f46" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.supportTitle}>Easy Farm 100% Quality Promise</Text>
                <Text style={styles.supportDesc}>
                  Every vegetable is harvested within 24 hours of delivery. If any item is not crisp and fresh, we replace or refund instantly.
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleWhatsAppHelp} style={styles.supportBtn} activeOpacity={0.8}>
              <MessageSquare size={16} color="#065f46" />
              <Text style={styles.supportBtnText}>Chat with Shiva Shankar (Founder) on WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom CTA Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.reorderBtn}
            onPress={() => {
              if (onReorder) onReorder(order);
            }}
            activeOpacity={0.85}
          >
            <RotateCcw size={16} color="#ffffff" />
            <Text style={styles.reorderBtnText}>Reorder This Harvest Box (₹{order.total})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  topBarSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  topBarActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  statusBanner: {
    margin: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  statusBannerActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusBannerOut: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusBannerDelivered: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBannerDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  otpCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#059669',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  otpCardTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  otpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  otpTimeNotice: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  otpCardPrompt: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  otpDigitsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  otpDigitBox: {
    width: 52,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  otpDigitText: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: '900',
    color: '#065f46',
  },
  otpPendingBox: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  otpPendingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  otpCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  otpCopyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  cardSection: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  timelineContainer: {
    paddingLeft: 6,
    paddingTop: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineCircleDone: {
    backgroundColor: '#059669',
  },
  timelineCircleActive: {
    backgroundColor: '#059669',
    borderWidth: 3,
    borderColor: '#a7f3d0',
  },
  timelineCirclePending: {
    backgroundColor: '#e2e8f0',
  },
  timelineInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    minHeight: 44,
    backgroundColor: '#e2e8f0',
    marginVertical: 3,
  },
  timelineVerticalLineDone: {
    backgroundColor: '#059669',
  },
  timelineRightColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  timelineStepTitleDone: {
    color: '#0f172a',
  },
  activePill: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  timelineStepSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  addressBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressPhoneText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  addressFullText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 6,
    lineHeight: 18,
  },
  addressTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  zoneTag: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  zoneTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  verifiedTag: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  boxContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  boxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  boxQty: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  boxPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065f46',
  },
  cropsListWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cropsSectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cropName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  cropWeight: {
    fontSize: 11,
    color: '#64748b',
    marginRight: 10,
  },
  cropPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  billTable: {
    paddingVertical: 2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  strikethroughText: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  freeGreenText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  billTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065f46',
  },
  paymentStatusBadgeRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  paidMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  paidMethodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  supportCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  supportDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 6,
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#065f46',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#065f46',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  reorderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
