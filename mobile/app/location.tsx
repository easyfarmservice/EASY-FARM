import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  X,
  MapPin,
  Crosshair,
  Clock,
  Home,
  ChevronRight,
  AlertCircle,
  Building,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../src/constants/theme';
import {
  searchLocations,
  getCurrentDeviceLocation,
  reverseGeocodeLocation,
  getRecentSearches,
  saveRecentSearch,
  getSavedCustomerAddresses,
  LocationSearchResult,
  SavedCustomerAddress,
} from '../src/services/locationService';

export default function LocationScreen() {
  const router = useRouter();

  // Search State
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GPS State
  const [locatingGps, setLocatingGps] = useState(false);

  // Recent & Saved Addresses
  const [recentSearches, setRecentSearches] = useState<LocationSearchResult[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([]);

  // Request cancellation ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load recent & saved on mount
  useEffect(() => {
    loadRecentAndSaved();
  }, []);

  const loadRecentAndSaved = async () => {
    try {
      const [recent, saved] = await Promise.all([
        getRecentSearches(),
        getSavedCustomerAddresses(),
      ]);
      setRecentSearches(recent);
      setSavedAddresses(saved);
    } catch (err) {
      console.warn('Failed to load recent/saved addresses:', err);
    }
  };

  // Debounced Search Handler
  const handleQueryChange = (text: string) => {
    setQuery(text);
    setErrorMessage(null);

    // Cancel in-flight debounce timer
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel any ongoing network request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setHasSearched(false);
      return;
    }

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const matches = await searchLocations(trimmed, controller.signal);
        setResults(matches);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setErrorMessage('Unable to fetch address suggestions. Please try again.');
        }
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setSearching(false);
    setHasSearched(false);
    setErrorMessage(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Select Location -> Transition to Map Confirmation (Phase 3)
  const handleSelectLocation = async (item: LocationSearchResult) => {
    Keyboard.dismiss();
    await saveRecentSearch(item);

    router.push({
      pathname: '/confirm-map',
      params: {
        lat: item.latitude.toString(),
        lng: item.longitude.toString(),
        title: item.title,
        subtitle: item.subtitle,
        pincode: item.pincode || '',
        locality: item.locality || '',
      },
    });
  };

  // Use Current Device Location (GPS)
  const handleUseCurrentLocation = async () => {
    Keyboard.dismiss();
    setLocatingGps(true);
    setErrorMessage(null);

    try {
      const coords = await getCurrentDeviceLocation();
      const resolved = await reverseGeocodeLocation(coords.latitude, coords.longitude);

      const searchItem: LocationSearchResult = {
        id: `gps-${Date.now()}`,
        title: resolved.placeName,
        subtitle: `${resolved.locality}, ${resolved.mandal} - ${resolved.pincode}`,
        fullAddress: resolved.fullAddress,
        latitude: coords.latitude,
        longitude: coords.longitude,
        pincode: resolved.pincode,
        locality: resolved.locality,
      };

      await saveRecentSearch(searchItem);

      router.push({
        pathname: '/confirm-map',
        params: {
          lat: coords.latitude.toString(),
          lng: coords.longitude.toString(),
          title: resolved.placeName,
          subtitle: `${resolved.locality}, ${resolved.mandal}`,
          pincode: resolved.pincode,
          locality: resolved.locality,
        },
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to detect your current location. Please check your GPS permissions.'
      );
    } finally {
      setLocatingGps(false);
    }
  };

  // Select Saved Address
  const handleSelectSavedAddress = (saved: SavedCustomerAddress) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/confirm-map',
      params: {
        lat: saved.latitude.toString(),
        lng: saved.longitude.toString(),
        title: saved.label || 'Saved Address',
        subtitle: `${saved.locality}, ${saved.city} - ${saved.pincode}`,
        pincode: saved.pincode,
        locality: saved.locality,
        addressId: saved.id,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Search Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Where should we deliver?</Text>
            <Text style={styles.subtitle}>
              Search your apartment, building or area.
            </Text>
          </View>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchBox}>
          <Search size={20} color={Colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apartment, building or area"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus={true}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {searching ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.actionIcon} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch} style={styles.actionIcon}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Error Notice */}
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={Colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* GPS Current Location Option */}
      <TouchableOpacity
        style={styles.currentLocationRow}
        onPress={handleUseCurrentLocation}
        activeOpacity={0.75}
        disabled={locatingGps}
      >
        <View style={styles.gpsIconCircle}>
          {locatingGps ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Crosshair size={20} color={Colors.primary} />
          )}
        </View>
        <View style={styles.gpsTextContainer}>
          <Text style={styles.gpsTitle}>Use my current location</Text>
          <Text style={styles.gpsSubtitle}>
            {locatingGps ? 'Detecting high-precision GPS...' : 'Using device GPS coordinates'}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Main Content Area: Suggestions OR Recent / Saved Addresses */}
      {hasSearched ? (
        // Search Results List
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectLocation(item)}
              activeOpacity={0.7}
            >
              <View style={styles.resultIconCircle}>
                {item.isKnownCommunity ? (
                  <Sparkles size={18} color={Colors.primary} />
                ) : (
                  <Building size={18} color={Colors.primary} />
                )}
              </View>
              <View style={styles.resultTextContainer}>
                <View style={styles.resultTitleRow}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isKnownCommunity ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>Corridor</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.resultSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !searching ? (
              <View style={styles.emptyContainer}>
                <Building size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No matching locations found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching with your apartment name (e.g. Singapore Township),
                  society, street or corridor pincode (e.g. 500088, 501301).
                </Text>
              </View>
            ) : undefined
          }
        />
      ) : (
        // Saved, Recent Searches & Corridor Shortcuts
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Saved Addresses Section (if customer has any) */}
          {savedAddresses.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>SAVED ADDRESSES</Text>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={styles.resultItem}
                  onPress={() => handleSelectSavedAddress(addr)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.resultIconCircle, styles.savedIconCircle]}>
                    <Home size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTitle}>
                      {addr.label || 'Home'}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {addr.full_address || `${addr.locality}, ${addr.city}`}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Recent Searches Section */}
          {recentSearches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>RECENT SEARCHES</Text>
              {recentSearches.map((recent) => (
                <TouchableOpacity
                  key={recent.id}
                  style={styles.resultItem}
                  onPress={() => handleSelectLocation(recent)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.resultIconCircle, styles.recentIconCircle]}>
                    <Clock size={16} color={Colors.textSecondary} />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {recent.title}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {recent.subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Popular Corridor Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>POPULAR DELIVERY AREAS</Text>
            {[
              { name: 'Singapore Township', area: 'Pocharam', pin: '500088', lat: 17.4475, lng: 78.6534 },
              { name: 'Sanskruti Township', area: 'Pocharam', pin: '500088', lat: 17.4468, lng: 78.6540 },
              { name: 'Emerald Heights', area: 'Pocharam', pin: '500088', lat: 17.4520, lng: 78.6650 },
              { name: 'Ghatkesar Town Center', area: 'Ghatkesar', pin: '501301', lat: 17.4436, lng: 78.6823 },
              { name: 'Narapally Corridor', area: 'Narapally', pin: '500098', lat: 17.4190, lng: 78.6250 },
            ].map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.resultItem}
                onPress={() =>
                  handleSelectLocation({
                    id: `popular-${item.name}`,
                    title: item.name,
                    subtitle: `${item.area}, Hyderabad - ${item.pin}`,
                    fullAddress: `${item.name}, ${item.area}, Ghatkesar mandal, Hyderabad ${item.pin}`,
                    latitude: item.lat,
                    longitude: item.lng,
                    pincode: item.pin,
                    locality: item.area,
                    isKnownCommunity: true,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.resultIconCircle}>
                  <MapPin size={18} color={Colors.primary} />
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <Text style={styles.resultSubtitle}>{item.area} • {item.pin}</Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: Radius.full,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  actionIcon: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  gpsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gpsTextContainer: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
    marginBottom: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  resultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedIconCircle: {
    backgroundColor: '#dbeafe',
  },
  recentIconCircle: {
    backgroundColor: Colors.surfaceSubtle,
  },
  resultTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
});
