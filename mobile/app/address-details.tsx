import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Home,
  Briefcase,
  Tag,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../src/constants/theme';
import {
  setActiveDeliveryAddress,
  saveAddressToSupabase,
  ActiveDeliveryAddress,
} from '../src/services/addressStorage';

export default function AddressDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    placeName?: string;
    locality?: string;
    mandal?: string;
    pincode?: string;
    fullAddress?: string;
    nearText?: string;
    isServiceable?: string;
    zoneName?: string;
    areaName?: string;
    deliveryDay?: string;
    deliveryPromise?: string;
  }>();

  const lat = params.lat ? parseFloat(params.lat) : 17.4475;
  const lng = params.lng ? parseFloat(params.lng) : 78.6534;
  const isServiceable = params.isServiceable !== '0';

  // Form State
  const [flatNo, setFlatNo] = useState('');
  const [apartment, setApartment] = useState(params.placeName || '');
  const [locality, setLocality] = useState(
    params.locality || params.mandal || 'Ghatkesar mandal'
  );
  const [pincode, setPincode] = useState(params.pincode || '500088');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [isDefault, setIsDefault] = useState(true);

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSaveAddress = async () => {
    if (!flatNo.trim()) {
      setValidationError('Please enter your House / Flat / Door Number.');
      return;
    }
    if (!apartment.trim()) {
      setValidationError('Please enter your Building or Apartment Name.');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      setValidationError('Please enter a valid 6-digit PIN code.');
      return;
    }

    setValidationError(null);
    setSaving(true);

    try {
      const fullAddressString = `${flatNo.trim()}, ${apartment.trim()}, ${locality.trim()}${
        landmark.trim() ? `, Near ${landmark.trim()}` : ''
      }, Hyderabad - ${pincode.trim()}`;

      const newAddress: ActiveDeliveryAddress = {
        label,
        flatNo: flatNo.trim(),
        apartment: apartment.trim(),
        locality: locality.trim(),
        pincode: pincode.trim(),
        fullAddress: fullAddressString,
        landmark: landmark.trim() || undefined,
        instructions: instructions.trim() || undefined,
        latitude: lat,
        longitude: lng,
        isServiceable,
        zoneName: params.zoneName || 'Ghatkesar & Pocharam',
        areaName: params.areaName || 'Corridor Delivery Area',
        deliveryDay: params.deliveryDay || 'Sunday',
        deliveryPromise: params.deliveryPromise || 'Sunday by 6 PM',
        isDefault,
      };

      // 1. Save locally for instant availability
      await setActiveDeliveryAddress(newAddress);

      // 2. Sync to Supabase in background if logged in
      const supabaseId = await saveAddressToSupabase(newAddress);
      if (supabaseId) {
        newAddress.id = supabaseId;
        await setActiveDeliveryAddress(newAddress);
      }

      // Return to home screen with updated address
      router.replace('/' as any);
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Location Summary Header Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.iconCircle}>
                <MapPin size={20} color={Colors.primary} />
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {params.placeName || 'Pinned Delivery Location'}
                </Text>
                <Text style={styles.summarySubtitle} numberOfLines={2}>
                  {params.fullAddress || `${locality}, ${pincode}`}
                </Text>
              </View>
            </View>

            <View style={styles.serviceBadgeRow}>
              <View style={styles.serviceBadge}>
                <CheckCircle2 size={14} color={Colors.success} />
                <Text style={styles.serviceBadgeText}>
                  {params.deliveryPromise || 'Sunday by 6 PM'} Delivery
                </Text>
              </View>
              <View style={[styles.serviceBadge, styles.corridorBadge]}>
                <Truck size={14} color={Colors.primary} />
                <Text style={[styles.serviceBadgeText, { color: Colors.primary }]}>
                  Corridor Verified
                </Text>
              </View>
            </View>
          </View>

          {/* Validation Error Banner */}
          {validationError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={Colors.error} />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

          {/* Address Form */}
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>COMPLETE ADDRESS DETAILS</Text>

            {/* Flat / House No */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                House / Flat / Block / Floor No. <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 402, Block B or Villa 15"
                placeholderTextColor={Colors.textMuted}
                value={flatNo}
                onChangeText={setFlatNo}
                autoFocus={true}
              />
            </View>

            {/* Apartment / Building Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Apartment / Society / Building Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Singapore Township, Sanskruti"
                placeholderTextColor={Colors.textMuted}
                value={apartment}
                onChangeText={setApartment}
              />
            </View>

            {/* Street / Locality */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street / Locality / Mandal</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pocharam, Ghatkesar mandal"
                placeholderTextColor={Colors.textMuted}
                value={locality}
                onChangeText={setLocality}
              />
            </View>

            {/* Pincode & City */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>
                  PIN Code <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="500088"
                  placeholderTextColor={Colors.textMuted}
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value="Hyderabad"
                  editable={false}
                />
              </View>
            </View>

            {/* Landmark (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nearby Landmark (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Near Infosys Gate 2, Beside Community Hall"
                placeholderTextColor={Colors.textMuted}
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>

            {/* Address Label Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Save Address As</Text>
              <View style={styles.labelChipsRow}>
                {(['Home', 'Work', 'Other'] as const).map((type) => {
                  const isSelected = label === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() => setLabel(type)}
                      activeOpacity={0.7}
                    >
                      {type === 'Home' ? (
                        <Home
                          size={16}
                          color={isSelected ? Colors.textOnPrimary : Colors.textSecondary}
                        />
                      ) : type === 'Work' ? (
                        <Briefcase
                          size={16}
                          color={isSelected ? Colors.textOnPrimary : Colors.textSecondary}
                        />
                      ) : (
                        <Tag
                          size={16}
                          color={isSelected ? Colors.textOnPrimary : Colors.textSecondary}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Delivery Instructions */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Instructions (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Leave with security / Ring bell twice"
                placeholderTextColor={Colors.textMuted}
                value={instructions}
                onChangeText={setInstructions}
                multiline={true}
                numberOfLines={2}
              />
            </View>

            {/* Set as Default Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Set as default delivery address</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: Colors.borderDark, true: Colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveAddress}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Address & Deliver Here</Text>
                <ArrowRight size={18} color={Colors.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  serviceBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  corridorBadge: {
    backgroundColor: Colors.accentSoft,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: Colors.textSecondary,
  },
  textArea: {
    minHeight: 54,
    textAlignVertical: 'top',
  },
  labelChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.textOnPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  bottomBar: {
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.borderDark,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
});

