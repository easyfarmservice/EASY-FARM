import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Edit3,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../src/constants/theme';
import {
  reverseGeocodeLocation,
  getCurrentDeviceLocation,
  ResolvedAddress,
} from '../src/services/locationService';
import {
  checkDeliveryServiceability,
  ServiceabilityResult,
} from '../src/services/serviceabilityService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamically import MapLibre to avoid crashes in non-native dev environments (e.g. Expo Go)
let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default;
  if (MapLibreGL && MapLibreGL.setAccessToken) {
    MapLibreGL.setAccessToken(null);
  }
} catch (e) {
  console.log('MapLibre native module loaded in mock/fallback mode:', e);
}

export default function ConfirmMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    title?: string;
    subtitle?: string;
    pincode?: string;
    locality?: string;
  }>();

  const initialLat = params.lat ? parseFloat(params.lat) : 17.4475;
  const initialLng = params.lng ? parseFloat(params.lng) : 78.6534;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  const [resolvedAddress, setResolvedAddress] = useState<ResolvedAddress>({
    placeName: params.title || 'Selected Location',
    locality: params.locality || 'Ghatkesar',
    mandal: 'Ghatkesar mandal',
    pincode: params.pincode || '500088',
    fullAddress: params.subtitle
      ? `${params.title || ''}, ${params.subtitle}`
      : 'Selected location in corridor',
    nearText: params.title ? `Near ${params.title}` : 'Near current pin',
    latitude: initialLat,
    longitude: initialLng,
  });

  const [serviceability, setServiceability] = useState<ServiceabilityResult>({
    available: true,
    zone_name: 'Ghatkesar & Pocharam',
    area_name: 'Active Corridor',
    delivery_fee: 0,
    minimum_order: 250,
    delivery_day: 'Sunday',
    delivery_promise: 'Sunday by 6 PM',
  });

  const [checking, setChecking] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const cameraRef = useRef<any>(null);
  const reverseGeocodeTimerRef = useRef<any>(null);

  // Initial check on load
  useEffect(() => {
    runServiceabilityCheck(initialLat, initialLng, params.pincode);
  }, []);

  const runServiceabilityCheck = async (
    lat: number,
    lng: number,
    pin?: string
  ) => {
    setChecking(true);
    try {
      const [svc, rev] = await Promise.all([
        checkDeliveryServiceability(lat, lng, pin),
        reverseGeocodeLocation(lat, lng),
      ]);
      setServiceability(svc);
      setResolvedAddress(rev);
    } catch (err) {
      console.warn('Location check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  // Called when map pan/drag stops
  const handleRegionDidChange = useCallback(async (feature: any) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
    const [newLng, newLat] = feature.geometry.coordinates;

    setCoords({ lat: newLat, lng: newLng });

    if (reverseGeocodeTimerRef.current) {
      clearTimeout(reverseGeocodeTimerRef.current);
    }

    reverseGeocodeTimerRef.current = setTimeout(() => {
      runServiceabilityCheck(newLat, newLng);
    }, 400);
  }, []);

  // Quick re-center to GPS
  const handleLocateMe = async () => {
    setDetectingGps(true);
    try {
      const current = await getCurrentDeviceLocation();
      setCoords({ lat: current.latitude, lng: current.longitude });

      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [current.longitude, current.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }

      await runServiceabilityCheck(current.latitude, current.longitude);
    } catch (err: any) {
      console.warn('GPS Locate Me error:', err?.message || err);
    } finally {
      setDetectingGps(false);
    }
  };

  // Confirm Location -> Navigate to Address Details Form (Phase 4)
  const handleProceedToAddressDetails = () => {
    router.push({
      pathname: '/address-details',
      params: {
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        placeName: resolvedAddress.placeName,
        locality: resolvedAddress.locality,
        mandal: resolvedAddress.mandal,
        pincode: resolvedAddress.pincode,
        fullAddress: resolvedAddress.fullAddress,
        nearText: resolvedAddress.nearText,
        isServiceable: serviceability.available ? '1' : '0',
        zoneName: serviceability.zone_name || '',
        areaName: serviceability.area_name || '',
        deliveryDay: serviceability.delivery_day || 'Sunday',
        deliveryPromise: serviceability.delivery_promise || 'Sunday by 6 PM',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Map View Area */}
      <View style={styles.mapContainer}>
        {MapLibreGL && MapLibreGL.MapView ? (
          <MapLibreGL.MapView
            style={styles.map}
            styleURL="https://tiles.openfreemap.org/styles/liberty"
            onRegionDidChange={handleRegionDidChange}
            compassEnabled={true}
            logoEnabled={false}
            attributionEnabled={true}
            attributionPosition={{ bottom: 8, right: 8 }}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: [initialLng, initialLat],
                zoomLevel: 15,
              }}
            />
          </MapLibreGL.MapView>
        ) : (
          // Visual map preview placeholder for Expo Go / fallback
          <View style={styles.mapPlaceholder}>
            <View style={styles.gridLineHorizontal} />
            <View style={styles.gridLineVertical} />
            <Text style={styles.mapPlaceholderText}>
              Interactive Map Active
            </Text>
            <Text style={styles.mapPlaceholderCoord}>
              {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
            </Text>
          </View>
        )}

        {/* Center Static Pin (Uber/Swiggy style fixed center pin) */}
        <View style={styles.centerPinWrapper} pointerEvents="none">
          <View style={styles.pinBubble}>
            <Text style={styles.pinBubbleText}>Order will be delivered here</Text>
          </View>
          <View style={styles.pinIconCircle}>
            <MapPin size={28} color={Colors.textOnPrimary} />
          </View>
          <View style={styles.pinShadow} />
        </View>

        {/* Locate Me Floating Button */}
        <TouchableOpacity
          style={styles.locateMeButton}
          onPress={handleLocateMe}
          activeOpacity={0.8}
          disabled={detectingGps}
        >
          {detectingGps ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Crosshair size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Confirmation Sheet */}
      <View style={styles.bottomSheet}>
        {/* Drag handle */}
        <View style={styles.handleBar} />

        {/* Serviceability Badge */}
        <View style={styles.badgeRow}>
          {checking ? (
            <View style={[styles.badge, styles.badgeNeutral]}>
              <ActivityIndicator size="small" color={Colors.textSecondary} />
              <Text style={styles.badgeTextNeutral}>Verifying delivery zone...</Text>
            </View>
          ) : serviceability.available ? (
            <View style={[styles.badge, styles.badgeSuccess]}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={styles.badgeTextSuccess}>
                Deliverable ({serviceability.delivery_promise || 'Sunday by 6 PM'})
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeError]}>
              <AlertTriangle size={16} color={Colors.error} />
              <Text style={styles.badgeTextError}>Outside Active Zone</Text>
            </View>
          )}
        </View>

        {/* Formatted Address Details */}
        <View style={styles.addressInfoBox}>
          <View style={styles.addressIconWrap}>
            <MapPin size={20} color={Colors.primary} />
          </View>
          <View style={styles.addressTextContainer}>
            <Text style={styles.placeTitle} numberOfLines={1}>
              {resolvedAddress.placeName}
            </Text>
            <Text style={styles.placeFullAddress} numberOfLines={2}>
              {resolvedAddress.fullAddress}
            </Text>
            <Text style={styles.pincodeTag}>
              PIN: {resolvedAddress.pincode || 'Corridor'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeAddressBtn}
            onPress={() => router.back()}
          >
            <Edit3 size={16} color={Colors.primary} />
            <Text style={styles.changeAddressText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Serviceability Message if outside */}
        {!serviceability.available && !checking ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              {serviceability.message ||
                "We don't deliver to this area yet. We deliver across the Uppal – Ghatkesar Growth Corridor every Sunday."}
            </Text>
          </View>
        ) : null}

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !serviceability.available && styles.confirmButtonDisabled,
          ]}
          onPress={handleProceedToAddressDetails}
          activeOpacity={0.85}
          disabled={!serviceability.available || checking}
        >
          <Text style={styles.confirmButtonText}>
            {serviceability.available
              ? 'Confirm Location & Enter Details'
              : 'Location Not Serviceable'}
          </Text>
          {serviceability.available ? (
            <ArrowRight size={18} color={Colors.textOnPrimary} />
          ) : null}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#a7f3d0',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#a7f3d0',
  },
  mapPlaceholderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 80,
  },
  mapPlaceholderCoord: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinBubble: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pinBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  pinIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  pinShadow: {
    width: 16,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  locateMeButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDark,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  badgeSuccess: {
    backgroundColor: Colors.successSoft,
  },
  badgeTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  badgeError: {
    backgroundColor: Colors.errorSoft,
  },
  badgeTextError: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  badgeNeutral: {
    backgroundColor: Colors.surfaceSubtle,
  },
  badgeTextNeutral: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  addressInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  addressIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  placeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeFullAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  pincodeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: Spacing.md,
  },
  warningText: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.borderDark,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
});
