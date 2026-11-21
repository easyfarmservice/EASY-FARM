import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building2,
  ChevronRight,
} from 'lucide-react-native';
import {
  SERVICEABLE_COMMUNITIES,
  getNearestCommunity,
  isLocationServiceable,
} from '../constants/delivery';
import {
  getUserCurrentLocation,
  reverseGeocodeLocation,
  searchLocations,
  getPlaceCoordinates,
  LocationSearchResult,
  GOOGLE_MAPS_API_KEY,
} from '../services/locationService';

const { width } = Dimensions.get('window');
const WebViewComponent: any = WebView;

interface ZeptoMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onAddressSelect: (address: {
    formattedAddress: string;
    flatNumber: string;
    landmark: string;
    lat: number;
    lng: number;
    isServiceable: boolean;
  }) => void;
  onClose: () => void;
}

export function ZeptoMapPicker({
  initialLat = 17.4475,
  initialLng = 78.6534,
  onAddressSelect,
  onClose,
}: ZeptoMapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [addressLabel, setAddressLabel] = useState('Singapore Township, Pocharam');
  const [pincode, setPincode] = useState('500088');
  const [isServiceable, setIsServiceable] = useState(true);
  const [flatNumber, setFlatNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Pin bounce animation on drag
  const pinBounce = useRef(new Animated.Value(0)).current;

  const triggerPinBounce = () => {
    Animated.sequence([
      Animated.timing(pinBounce, { toValue: -16, duration: 140, useNativeDriver: true }),
      Animated.spring(pinBounce, { toValue: 0, friction: 4.5, useNativeDriver: true }),
    ]).start();
  };

  const resolveLocation = useCallback(async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const resolved = await reverseGeocodeLocation(lat, lng);
      const isServ = isLocationServiceable(lat, lng, resolved.pincode);
      setAddressLabel(resolved.placeName || resolved.fullAddress);
      setPincode(resolved.pincode);
      setIsServiceable(isServ);
    } catch {
      const nearest = getNearestCommunity(lat, lng);
      if (nearest && nearest.community) {
        setAddressLabel(`${nearest.community.name}, ${nearest.community.area}`);
        setPincode(nearest.community.pincode);
        setIsServiceable(isLocationServiceable(lat, lng, nearest.community.pincode));
      } else {
        setAddressLabel(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        setIsServiceable(false);
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

  const flyTo = (lat: number, lng: number, label?: string) => {
    setCoords({ lat, lng });
    if (label) setAddressLabel(label);
    resolveLocation(lat, lng);
    triggerPinBounce();
    const script = `if (window.map) { window.map.flyTo([${lat}, ${lng}], 16, { duration: 1 }); } true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const loc = await getUserCurrentLocation();
      setCoords({ lat: loc.latitude, lng: loc.longitude });
      resolveLocation(loc.latitude, loc.longitude);
      triggerPinBounce();

      // Update both map view and pulsating user GPS beacon
      const script = `
        if (window.setUserLocation) {
          window.setUserLocation(${loc.latitude}, ${loc.longitude});
        }
        if (window.map) {
          window.map.flyTo([${loc.latitude}, ${loc.longitude}], 16, { duration: 1.2 });
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    } catch (e) {
      console.warn('Locate Me error:', e);
    } finally {
      setIsLocating(false);
    }
  }, [resolveLocation]);

  // Center on device GPS on mount
  useEffect(() => {
    handleLocateMe();
  }, [handleLocateMe]);

  // Debounced search for societies, gates, and addresses
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(text);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSelectSearchResult = async (item: LocationSearchResult) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setSearchQuery('');

    let targetLat = item.latitude;
    let targetLng = item.longitude;

    // If result is from Google Places without direct coords, fetch geometry
    if (item.id.startsWith('google-')) {
      const coords = await getPlaceCoordinates(item.id);
      if (coords) {
        targetLat = coords.latitude;
        targetLng = coords.longitude;
      }
    }

    flyTo(targetLat, targetLng, item.title);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MOVE_START') {
        Animated.timing(pinBounce, { toValue: -18, duration: 120, useNativeDriver: true }).start();
      } else if (data.type === 'MOVE_END') {
        Animated.spring(pinBounce, { toValue: 0, friction: 4.5, useNativeDriver: true }).start();
        setCoords({ lat: data.lat, lng: data.lng });
        resolveLocation(data.lat, data.lng);
      }
    } catch (e) {
      console.warn('Map message error:', e);
    }
  };

  // HTML with Google Maps Tiles + Radar GPS Beacon + Leaflet Engine
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e2e8f0; }
          .leaflet-control-attribution { display: none !important; }

          /* Pulsating Current Location GPS Radar Beacon */
          @keyframes user-gps-radar {
            0% { transform: scale(0.6); opacity: 0.95; }
            70% { transform: scale(2.4); opacity: 0; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          .user-current-gps-marker {
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {
            center: [${initialLat}, ${initialLng}],
            zoom: 15,
            zoomControl: false
          });
          window.map = map;

          // Google Maps High-Definition Street Tiles
          var googleApiKey = "${GOOGLE_MAPS_API_KEY || ''}";
          var baseLayer;

          if (googleApiKey) {
            baseLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=' + googleApiKey, {
              maxZoom: 20,
              subdomains: ['0', '1', '2', '3'],
              attribution: 'Google'
            }).addTo(map);

            // Redundant Esri fallback if Google tile blocks
            baseLayer.on('tileerror', function() {
              L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19
              }).addTo(map);
            });
          } else {
            // Ultra-smooth Esri World Street Map
            baseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 19
            }).addTo(map);
          }

          // Service area corridor boundary highlight (Pocharam & Ghatkesar)
          L.circle([17.4475, 78.6590], {
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.12,
            radius: 6500,
            weight: 2,
            dashArray: '6, 6'
          }).addTo(map);

          // Pulsating Blue GPS Beacon for User's Current Location
          var userGpsMarker = null;

          window.setUserLocation = function(lat, lng) {
            var beaconHtml = [
              '<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">',
              '  <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.35); animation: user-gps-radar 2s infinite ease-out;"></div>',
              '  <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background-color: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>',
              '  <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background-color: #2563eb;"></div>',
              '</div>'
            ].join('');

            var beaconIcon = L.divIcon({
              className: 'user-current-gps-marker',
              html: beaconHtml,
              iconSize: [0, 0]
            });

            if (userGpsMarker) {
              userGpsMarker.setLatLng([lat, lng]);
            } else {
              userGpsMarker = L.marker([lat, lng], {
                icon: beaconIcon,
                zIndexOffset: 50
              }).addTo(map);

              userGpsMarker.bindTooltip(
                '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; color: #1e3a8a; padding: 2px 6px;">📍 You are here</div>',
                { direction: 'top', offset: [0, -14] }
              );
            }
          };

          map.on('movestart', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MOVE_START' }));
          });

          map.on('moveend', function() {
            var c = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MOVE_END', lat: c.lat, lng: c.lng }));
          });

          // Invalidate size immediately after DOM mount
          setTimeout(function() {
            map.invalidateSize();
          }, 200);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <X size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Select Delivery Address</Text>
          <Text style={styles.headerSubtitle}>Move map to place pin on your gate/door</Text>
        </View>
      </View>

      {/* Interactive Search Bar for Societies & Gates */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBox}>
          <Search size={18} color="#065f46" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apartment, society, gate, road..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
          />
          {isSearching && <ActivityIndicator size="small" color="#065f46" />}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
              style={{ padding: 4 }}
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Autocomplete Dropdown List */}
        {showDropdown && searchResults.length > 0 && (
          <View style={styles.dropdownCard}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchItem}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchItemIconBox}>
                    {item.isKnownCommunity ? (
                      <Building2 size={16} color="#059669" />
                    ) : (
                      <MapPin size={16} color="#2563eb" />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.searchItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.isKnownCommunity && (
                        <View style={styles.directPill}>
                          <Text style={styles.directPillText}>Doorstep</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.searchItemSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Map View Area */}
      <View style={styles.mapArea}>
        <WebViewComponent
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webview}
          scrollEnabled={false}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Proper SVG Delivery Location Pin (Zepto / Blinkit style with emerald teardrop & white ring) */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <Animated.View style={[styles.pinWrapper, { transform: [{ translateY: pinBounce }] }]}>
            {/* Floating "Deliver Here" Pill */}
            <View style={styles.pinPill}>
              <Text style={styles.pinPillText}>📍 Deliver Here</Text>
            </View>

            {/* Teardrop Location Pin SVG */}
            <View style={styles.pinSvgContainer}>
              <Svg width={42} height={52} viewBox="0 0 42 52">
                <Defs>
                  <LinearGradient id="deliveryPinGrad" x1="21" y1="0" x2="21" y2="52" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#059669" />
                    <Stop offset="1" stopColor="#064e3b" />
                  </LinearGradient>
                </Defs>
                {/* Teardrop Body */}
                <Path
                  d="M21 0C9.402 0 0 9.402 0 21C0 35.8 18.5 50.8 20.2 51.7C20.7 52 21.3 52 21.8 51.7C23.5 50.8 42 35.8 42 21C42 9.402 32.598 0 21 0Z"
                  fill="url(#deliveryPinGrad)"
                />
                {/* White Border */}
                <Path
                  d="M21 1.5C10.23 1.5 1.5 10.23 1.5 21C1.5 34.6 19 49 21 50.4C23 49 40.5 34.6 40.5 21C40.5 10.23 31.77 1.5 21 1.5Z"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                {/* White Outer Dot */}
                <Circle cx="21" cy="19" r="9" fill="#ffffff" />
                {/* Green Inner Target Dot */}
                <Circle cx="21" cy="19" r="5" fill="#047857" />
              </Svg>
            </View>

            {/* Ground Shadow */}
            <View style={styles.pinGroundShadow} />
          </Animated.View>
        </View>

        {/* Floating Locate Me Button */}
        <TouchableOpacity
          style={styles.locateMeBtn}
          onPress={handleLocateMe}
          disabled={isLocating}
          activeOpacity={0.85}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#065f46" />
          ) : (
            <>
              <Navigation size={15} color="#065f46" />
              <Text style={styles.locateMeText}>Locate Me</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Society Selection Chips */}
      <View style={styles.chipsRow}>
        <Text style={styles.chipsLabel}>Quick Pick:</Text>
        {SERVICEABLE_COMMUNITIES.slice(0, 4).map((c) => (
          <TouchableOpacity
            key={c.name}
            style={[styles.chip, addressLabel.includes(c.name) && styles.chipActive]}
            onPress={() => flyTo(c.lat, c.lng, c.name)}
          >
            <Text style={[styles.chipText, addressLabel.includes(c.name) && styles.chipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sliding Address Details Sheet */}
      <View style={styles.bottomSheet}>
        {/* Serviceability Badge */}
        <View style={[styles.badge, isServiceable ? styles.badgeGreen : styles.badgeRed]}>
          {isServiceable ? (
            <CheckCircle2 size={16} color="#059669" />
          ) : (
            <AlertCircle size={16} color="#dc2626" />
          )}
          <Text style={[styles.badgeText, isServiceable ? styles.badgeTextGreen : styles.badgeTextRed]}>
            {isServiceable
              ? 'Sunday Harvest Delivery Available (PIN ' + pincode + ')'
              : 'Outside our Sunday corridor — we deliver around Pocharam/Ghatkesar'}
          </Text>
        </View>

        {/* Resolved Address Name */}
        <View style={styles.addressRow}>
          <MapPin size={22} color="#065f46" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.addressTitle} numberOfLines={1}>
              {addressLabel}
            </Text>
            <Text style={styles.addressSubtitle}>Ghatkesar mandal, Hyderabad • PIN {pincode}</Text>
          </View>
          {isResolving && <ActivityIndicator size="small" color="#065f46" />}
        </View>

        {/* Flat / House Number Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Flat / House / Tower No. (e.g. Flat 302, Tower 4)"
            placeholderTextColor="#94a3b8"
            value={flatNumber}
            onChangeText={setFlatNumber}
          />
        </View>

        {/* Landmark / Instructions Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Landmark / Gate instructions (Optional)"
            placeholderTextColor="#94a3b8"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        {/* Confirm Address Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, !isServiceable && styles.confirmBtnDisabled]}
          disabled={!isServiceable}
          onPress={() => {
            onAddressSelect({
              formattedAddress: `${flatNumber ? flatNumber + ', ' : ''}${addressLabel}, ${pincode}`,
              flatNumber,
              landmark,
              lat: coords.lat,
              lng: coords.lng,
              isServiceable,
            });
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
            {isServiceable ? 'Save Address & Deliver Here' : 'Location Not Deliverable Yet'}
          </Text>
        </TouchableOpacity>

        {!isServiceable && (
          <TouchableOpacity
            style={styles.switchHubBtn}
            onPress={() => flyTo(17.4475, 78.6534, 'Singapore Township')}
            activeOpacity={0.8}
          >
            <Text style={styles.switchHubText}>📍 Switch to Singapore Township (Serviceable Hub)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  headerTitleBox: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  searchBarWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    zIndex: 100,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  dropdownCard: {
    position: 'absolute',
    top: 54,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: 260,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 200,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: width * 0.55,
  },
  searchItemSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  directPill: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  directPillText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '800',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48, // Aligns teardrop needle tip precisely at coordinate center
  },
  pinPill: {
    backgroundColor: '#064e3b',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  pinPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pinSvgContainer: {
    width: 42,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  pinGroundShadow: {
    width: 22,
    height: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -2,
  },
  locateMeBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  locateMeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  badgeGreen: {
    backgroundColor: '#ecfdf5',
  },
  badgeRed: {
    backgroundColor: '#fef2f2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  badgeTextGreen: {
    color: '#065f46',
  },
  badgeTextRed: {
    color: '#dc2626',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  inputRow: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  confirmBtn: {
    backgroundColor: '#065f46',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#065f46',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  switchHubBtn: {
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  switchHubText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 12,
  },
});
