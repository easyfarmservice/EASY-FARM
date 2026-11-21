import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import {
  MapPin,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Truck,
  Calendar,
  X,
  CheckCircle2,
  Check,
  ShieldCheck,
  ArrowLeft,
  Navigation,
  Bell,
  Mail,
  Phone,
  Home,
  Gift,
  User,
  Package,
  Clock,
  Flame,
  CheckCircle,
  RefreshCw,
  HelpCircle,
  Star,
  RotateCcw,
  Edit3,
  Lightbulb,
  MessageSquare,
} from 'lucide-react-native';
import { CartProvider, useCart } from '../src/context/CartContext';
import { INITIAL_PRODUCTS, ProductItem } from '../src/data/initialProducts';
import {
  fetchCatalogProducts,
  fetchBaskets,
  BasketItemData,
} from '../src/services/productService';
import { SafeStorage } from '../src/lib/storage';
import { supabase } from '../src/lib/supabase';
import { ZeptoMapPicker } from '../src/components/ZeptoMapPicker';
import { CartCheckoutModal } from '../src/components/CartCheckoutModal';
import { StapleBoxCustomizerModal } from '../src/components/StapleBoxCustomizerModal';
import { CustomBoxBuilderModal, CustomBoxPayload } from '../src/components/CustomBoxBuilderModal';
import { AnimatedSplashScreen } from '../src/components/AnimatedSplashScreen';
import { getNextDeliverySunday, SERVICEABLE_COMMUNITIES } from '../src/constants/delivery';
import { getCustomerOrders, CustomerOrder } from '../src/services/orderService';
import { saveAddressToSupabase } from '../src/services/addressStorage';
import { getUserCurrentLocation } from '../src/services/locationService';
import { fetchCustomerCoins, computeWeeklyStreak } from '../src/services/easyCoinsService';
import { WeeklyStreakView } from '../src/components/WeeklyStreakView';
import { OrderDetailModal } from '../src/components/OrderDetailModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const SHOP_CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Greens'];

/**
 * Resolves candidate local Next.js backend URLs for Expo Go (device + emulator + localhost).
 */
function getApiBaseUrls(): string[] {
  const candidates: string[] = [];
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const hostIp = hostUri.split(':')[0]?.trim();
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      candidates.push(`http://${hostIp}:3000`);
    }
  }

  candidates.push(
    'http://10.74.233.234:3000',
    'http://10.183.238.234:3000',
    'http://localhost:3000'
  );

  return Array.from(new Set(candidates));
}

/**
 * Posts JSON to the first reachable Easy Farm auth API endpoint with a 5s timeout per host.
 */
async function postToLocalAuthApi(
  path: '/api/auth/send-otp' | '/api/auth/verify-otp',
  payload: Record<string, any>
): Promise<{ reachable: boolean; ok: boolean; status: number; data: any }> {
  const baseUrls = getApiBaseUrls();
  for (const baseUrl of baseUrls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      clearTimeout(timer);
      return { reachable: true, ok: res.ok, status: res.status, data };
    } catch {
      clearTimeout(timer);
    }
  }
  return { reachable: false, ok: false, status: 0, data: null };
}

type ScreenType =
  | 'onboarding' // Screen 2: Welcome / Onboarding
  | 'login' // Screen 3: Login or Signup
  | 'otp' // Screen 4: Email OTP Verification
  | 'location_search' // Screen 5: Delivery Location Search
  | 'map_confirm' // Screen 6: Map Confirmation
  | 'address_details' // Screen 7: Add Address Details
  | 'main'; // Screens 8-10: Main App (Home, Shop, Orders, Rewards, Profile)

function MainAppFlow() {
  const { items, addToCart, setCartItem, removeFromCart, updateQuantity, getItemQuantity, totalItems, subtotal } = useCart();

  // Navigation states
  const [showSplash, setShowSplash] = useState(true); // Screen 1
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('onboarding');
  const [mainTab, setMainTab] = useState<'home' | 'shop' | 'orders' | 'rewards' | 'profile'>('home');
  const [showCheckout, setShowCheckout] = useState(false); // Screen 10
  const [showStapleCustomizer, setShowStapleCustomizer] = useState(false); // Staple Box 5 items + 3 swaps
  const [showCustomBuilder, setShowCustomBuilder] = useState(false); // Custom Box min 4 items builder
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  // Dynamic products & baskets from Supabase
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [baskets, setBaskets] = useState<BasketItemData[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Dynamic user & auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userCoins, setUserCoins] = useState<number>(125);
  const [userName, setUserName] = useState<string>('Easy Farm Member');
  const otpBoxRefs = React.useRef<Array<any>>([]);

  // Profile Action Modals & States
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRefundsModal, setShowRefundsModal] = useState(false);
  const [showSavedAddressModal, setShowSavedAddressModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSuggestProductModal, setShowSuggestProductModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Edit Profile Form State
  const [editNameInput, setEditNameInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Suggest Product Form State
  const [suggestCropName, setSuggestCropName] = useState('');
  const [suggestCropNotes, setSuggestCropNotes] = useState('');
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);

  // Notification Toggles State
  const [notifHarvestReminder, setNotifHarvestReminder] = useState(true);
  const [notifDeliveryUpdates, setNotifDeliveryUpdates] = useState(true);
  const [notifEasyCoins, setNotifEasyCoins] = useState(true);

  // Dynamic orders state
  const [ordersList, setOrdersList] = useState<CustomerOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<CustomerOrder | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);

  const openOrderDetail = (order: CustomerOrder) => {
    setSelectedDetailOrder(order);
    setShowOrderDetailModal(true);
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'active') {
      return ordersList.filter((o) => o.status !== 'delivered');
    }
    if (orderFilter === 'delivered') {
      return ordersList.filter((o) => o.status === 'delivered');
    }
    return ordersList;
  }, [ordersList, orderFilter]);

  const activeSundayOrder = useMemo(() => {
    return ordersList.find((o) => o.status !== 'delivered');
  }, [ordersList]);

  // Dynamic weekly streak calculation from confirmed database orders
  const streakInfo = useMemo(() => computeWeeklyStreak(ordersList), [ordersList]);

  // Dynamic Box Objects resolved from Supabase baskets table
  const stapleBox = useMemo(() => {
    const found = baskets.find((b) => (b.slug || '').includes('staple') || b.id.endsWith('1'));
    if (found) return found;
    return {
      id: '33333333-0000-0000-0000-000000000001',
      name: 'Staple Box',
      slug: 'staple-basket',
      description: '5 Fixed Essentials from local harvest',
      price: 250,
      compare_at_price: 320,
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',
      active: true,
      items: [
        { id: 'sb-1', productId: '22222222-0000-0000-0000-000000000001', name: 'Country Tomato', quantity: '1 kg', unit: 'kg', price: 35, image_url: '' },
        { id: 'sb-2', productId: '22222222-0000-0000-0000-000000000008', name: 'Red Onion', quantity: '1.5 kg', unit: 'kg', price: 45, image_url: '' },
        { id: 'sb-3', productId: '22222222-0000-0000-0000-000000000007', name: 'Potato', quantity: '2 kg', unit: 'kg', price: 35, image_url: '' },
        { id: 'sb-4', productId: '22222222-0000-0000-0000-000000000003', name: 'Fresh Palak (Spinach)', quantity: '2 bunches', unit: 'bunch', price: 25, image_url: '' },
        { id: 'sb-5', productId: '22222222-0000-0000-0000-000000000004', name: 'Lady Finger (Bhindi)', quantity: '0.5 kg', unit: 'kg', price: 40, image_url: '' },
      ],
    };
  }, [baskets]);

  const customBox = useMemo(() => {
    const found = baskets.find((b) => (b.slug || '').includes('custom') || b.id.endsWith('4'));
    if (found) return found;
    return {
      id: '33333333-0000-0000-0000-000000000004',
      name: 'Custom Box',
      slug: 'custom-basket',
      description: 'Build your own box from scratch. Pick whatever you like.',
      price: 0,
      compare_at_price: 0,
      image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80',
      active: true,
      items: [],
    };
  }, [baskets]);

  const customBoxCartItem = items.find((i) => i.product.id === customBox.id);
  const customBoxPriceInCart = customBoxCartItem ? customBoxCartItem.product.price : 0;

  // Address states
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.4475,
    lng: 78.6534,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(
    'Singapore Township, Ghatkesar, 500088'
  );
  const [flatNo, setFlatNo] = useState('302');
  const [buildingName, setBuildingName] = useState('Tower A');
  const [locality, setLocality] = useState('Singapore Township');
  const [landmark, setLandmark] = useState('Near Main Gate');
  const [deliveryNotes, setDeliveryNotes] = useState('Ring bell');
  const [savedAddresses, setSavedAddresses] = useState<
    Array<{ id: string; label: string; address: string }>
  >([
    {
      id: 'addr-1',
      label: 'Home',
      address: 'Singapore Township, Ghatkesar, 500088',
    },
    {
      id: 'addr-2',
      label: 'Office',
      address: 'Rainbow Vistas Rock Garden, Hitec City, 500018',
    },
  ]);

  const [selectedShopCat, setSelectedShopCat] = useState('All');
  const [shopSearch, setShopSearch] = useState('');

  const sundayInfo = getNextDeliverySunday();

  // Load dynamic data from Supabase & Storage on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // 1. Check saved session
        const savedUser = await SafeStorage.getItem('@easyfarm_logged_in_user');
        const savedName = await SafeStorage.getItem('@easyfarm_customer_name');
        if (savedUser) {
          // Check Supabase profiles for customer information
          let prof: any = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('email', savedUser)
              .maybeSingle();
            prof = data;
          } catch (pErr) {
            console.warn('Profile fetch notice:', pErr);
          }

          const validName =
            prof?.full_name && prof.full_name.trim() !== '' && prof.full_name !== 'Easy Farm Member'
              ? prof.full_name
              : savedName && savedName !== 'Easy Farm Member'
              ? savedName
              : null;

          if (validName) {
            setIsLoggedIn(true);
            setEmailInput(savedUser);
            setUserName(validName);
            await SafeStorage.setItem('@easyfarm_customer_name', validName);
            const storedPhone = await SafeStorage.getItem('@easyfarm_customer_phone');
            const resolvedPhone = prof?.phone || storedPhone || '';
            if (resolvedPhone && isMounted) {
              setPhoneInput(resolvedPhone);
              await SafeStorage.setItem('@easyfarm_customer_phone', resolvedPhone);
            }
            setCurrentScreen('main');
          } else {
            // Unregistered / incomplete customer profile -> force user to create account
            setIsLoggedIn(false);
            setEmailInput(savedUser);
            setAuthMode('signup');
            setCurrentScreen('login');
          }
        } else {
          setAuthMode('signup');
          setCurrentScreen('onboarding');
        }

        // Dynamically fetch Easy Coins balance from Supabase database
        try {
          const liveCoins = await fetchCustomerCoins(savedUser || undefined);
          if (isMounted) {
            setUserCoins(liveCoins);
          }
        } catch (coinsErr) {
          console.warn('Coins dynamic fetch note:', coinsErr);
        }

        const savedAddr = await SafeStorage.getItem('@easyfarm_saved_address');
        if (savedAddr) {
          setSelectedAddress(savedAddr);
        }

        // 2. Fetch live products and baskets from Supabase
        setIsLoadingCatalog(true);
        const [dbProds, dbBaskets] = await Promise.all([
          fetchCatalogProducts(),
          fetchBaskets(),
        ]);
        if (isMounted) {
          if (dbProds && dbProds.length > 0) {
            setProducts(dbProds);
          }
          if (dbBaskets && dbBaskets.length > 0) {
            setBaskets(dbBaskets);
          }
          setIsLoadingCatalog(false);
        }

        // 3. Fetch past orders from Supabase
        const orders = await getCustomerOrders(savedUser || undefined);
        if (isMounted) {
          setOrdersList(orders);
        }

        // 4. Fetch Supabase customer addresses
        try {
          const { data: dbAddresses } = await supabase
            .from('customer_addresses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (isMounted && dbAddresses && dbAddresses.length > 0) {
            setSavedAddresses(
              dbAddresses.map((a: any) => ({
                id: a.id,
                label: a.label || 'Home',
                address: a.full_address || `${a.apartment || ''}, ${a.locality || ''}, ${a.pincode || ''}`,
              }))
            );
          }
        } catch {
          // Keep resilient default addresses
        }
      } catch (e) {
        console.warn('Initial state load notice:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const orders = await getCustomerOrders(emailInput || undefined);
      setOrdersList(orders);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [emailInput]);

  // Filtered products for Screen 9
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        shopSearch.trim() === '' ||
        p.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(shopSearch.toLowerCase());
      if (!matchSearch) return false;
      if (selectedShopCat === 'All') return true;
      if (selectedShopCat === 'Greens') {
        return (
          p.category?.toLowerCase().includes('leafy') ||
          p.name.toLowerCase().includes('spinach') ||
          p.name.toLowerCase().includes('palak') ||
          p.name.toLowerCase().includes('methi') ||
          p.name.toLowerCase().includes('coriander') ||
          p.name.toLowerCase().includes('mint')
        );
      }
      if (selectedShopCat === 'Vegetables') {
        return (
          p.category?.toLowerCase().includes('root') ||
          p.category?.toLowerCase().includes('fresh') ||
          p.category?.toLowerCase().includes('gourd') ||
          p.name.toLowerCase().includes('tomato') ||
          p.name.toLowerCase().includes('potato') ||
          p.name.toLowerCase().includes('onion') ||
          p.name.toLowerCase().includes('carrot') ||
          p.name.toLowerCase().includes('brinjal') ||
          p.name.toLowerCase().includes('chilli')
        );
      }
      if (selectedShopCat === 'Fruits') {
        return (
          p.category?.toLowerCase().includes('fruit') ||
          p.category?.toLowerCase().includes('exotic') ||
          p.name.toLowerCase().includes('corn') ||
          p.name.toLowerCase().includes('lemon')
        );
      }
      return true;
    });
  }, [products, selectedShopCat, shopSearch]);

  const handleOrderSuccess = useCallback(async (orderId: string) => {
    setShowCheckout(false);
    setPlacedOrderId(orderId);
    await reloadOrders();
  }, [reloadOrders]);

  const handleAutoSyncCustomBox = useCallback(
    (box: CustomBoxPayload | null) => {
      if (box) {
        setCartItem(
          {
            ...box,
            slug: 'custom-basket',
            category: 'Farm Boxes',
          },
          1
        );
      } else {
        removeFromCart(customBox.id);
      }
    },
    [customBox.id, setCartItem, removeFromCart]
  );

  const handleProceedFromShop = useCallback(() => {
    setShowCheckout(true);
  }, []);

  // Resend OTP countdown effect
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const dispatchMobileOtp = async (
    trimmedEmail: string
  ): Promise<{ ok: boolean; notice?: string; error?: string }> => {
    // 1. Primary path: local Next.js backend (/api/auth/send-otp -> Resend API)
    const apiResult = await postToLocalAuthApi('/api/auth/send-otp', {
      email: trimmedEmail,
      type: authMode,
      name: fullNameInput.trim(),
      phone: phoneInput.trim(),
    });

    if (apiResult.reachable) {
      if (apiResult.ok && apiResult.data?.success) {
        return { ok: true, notice: apiResult.data.message };
      }
      if (apiResult.status === 429) {
        return {
          ok: false,
          error: apiResult.data?.error || 'Too many OTP requests. Please wait a moment.',
        };
      }
      if (apiResult.status >= 400 && apiResult.status < 500 && apiResult.data?.error) {
        return { ok: false, error: apiResult.data.error };
      }
    }

    // 2. Fallback path: Supabase Auth client (when local backend is unreachable or returned 5xx)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: authMode === 'signup',
        data: {
          full_name: fullNameInput.trim(),
          phone: phoneInput.trim(),
          role: 'customer',
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      console.warn('Supabase signInWithOtp note:', error.message);
      if (msg.includes('user not found') || msg.includes('signups not allowed') || msg.includes('signup disabled')) {
        return {
          ok: false,
          error: 'No registered account found with this email. Please sign up to create your account.',
        };
      }
      if (msg.includes('for security purposes') || msg.includes('only request this after')) {
        return {
          ok: true,
          notice: 'A verification code was recently sent to your email. Please enter that 6-digit code.',
        };
      }
      return {
        ok: false,
        error: error.message || 'Unable to send OTP. Please check your email.',
      };
    }

    return { ok: true };
  };

  const handleSendOtp = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your email address to continue.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (authMode === 'signup') {
      const cleanName = fullNameInput.trim();
      if (!cleanName || cleanName.length < 2) {
        Alert.alert('Name Required', 'Please enter your full name (at least 2 characters) to create an account.');
        return;
      }
      const cleanPhone = phoneInput.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        Alert.alert('Phone Number Required', 'Please enter a valid 10-digit mobile number for harvest delivery updates.');
        return;
      }
    }

    if (authMode === 'login') {
      setIsSendingOtp(true);
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .ilike('email', trimmedEmail)
          .maybeSingle();

        if (!prof || !prof.full_name || prof.full_name.trim() === '' || prof.full_name === 'Easy Farm Member') {
          setIsSendingOtp(false);
          Alert.alert(
            'Account Not Found',
            'No registered account was found with this email. Please sign up to create your customer account with your full name and phone number.',
            [
              {
                text: 'Create Account',
                onPress: () => {
                  setAuthMode('signup');
                },
              },
            ]
          );
          setAuthMode('signup');
          return;
        }
      } catch (checkErr) {
        console.warn('Profile existence check notice:', checkErr);
      } finally {
        setIsSendingOtp(false);
      }
    }

    setEmailInput(trimmedEmail);
    setIsSendingOtp(true);
    try {
      const res = await dispatchMobileOtp(trimmedEmail);
      if (!res.ok) {
        Alert.alert('Notice', res.error || 'Unable to send OTP. Please check your email.');
        return;
      }
      setOtpInput(['', '', '', '', '', '']);
      setResendTimer(45);
      setCurrentScreen('otp');
      if (res.notice && res.notice.includes('recently sent')) {
        Alert.alert('Check Your Email', res.notice);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect to authentication server.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    const trimmedEmail = emailInput.trim().toLowerCase();
    setIsSendingOtp(true);
    try {
      const res = await dispatchMobileOtp(trimmedEmail);
      if (!res.ok) {
        Alert.alert('Notice', res.error || 'Failed to resend code.');
      } else {
        setResendTimer(45);
        Alert.alert(
          'Code Sent',
          res.notice || `A fresh 6-digit code has been sent to ${trimmedEmail}`
        );
      }
    } catch {
      Alert.alert('Notice', 'Failed to resend OTP. Please try again in a moment.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpInput.join('').trim();
    if (code.length !== 6) {
      Alert.alert('Incomplete OTP', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    const trimmedEmail = emailInput.trim().toLowerCase();
    try {
      let verifiedUser: any = null;
      let lastErrorMessage = '';

      // Tier 1: Direct Supabase OTP verification across all token types
      for (const otpType of ['magiclink', 'email', 'signup'] as const) {
        const attempt = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: code,
          type: otpType,
        });
        if (!attempt.error && attempt.data?.user) {
          verifiedUser = attempt.data.user;
          break;
        }
        if (attempt.error?.message) {
          lastErrorMessage = attempt.error.message;
        }
      }

      // Tier 2: Backend /api/auth/verify-otp fallback
      if (!verifiedUser) {
        const apiResult = await postToLocalAuthApi('/api/auth/verify-otp', {
          email: trimmedEmail,
          otp: code,
        });
        if (apiResult.reachable && apiResult.ok && apiResult.data?.success && apiResult.data?.user) {
          verifiedUser = apiResult.data.user;
          if (apiResult.data.session?.access_token && apiResult.data.session?.refresh_token) {
            await supabase.auth
              .setSession({
                access_token: apiResult.data.session.access_token,
                refresh_token: apiResult.data.session.refresh_token,
              })
              .catch(() => {});
          }
        } else if (apiResult.reachable && apiResult.data?.error) {
          lastErrorMessage = apiResult.data.error;
        }
      }

      if (!verifiedUser) {
        Alert.alert(
          'Invalid Code',
          lastErrorMessage || 'Invalid or expired OTP code. Please check your email.'
        );
        return;
      }

      await SafeStorage.setItem('@easyfarm_logged_in_user', trimmedEmail);

      // Dynamic profile lookup / creation in Supabase
      try {
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .ilike('email', trimmedEmail)
          .maybeSingle();

        const storedName = await SafeStorage.getItem('@easyfarm_customer_name');
        const resolvedName =
          fullNameInput.trim() ||
          (existingProf?.full_name && existingProf.full_name !== 'Easy Farm Member' ? existingProf.full_name : null) ||
          (storedName && storedName !== 'Easy Farm Member' ? storedName : null);

        const storedPhone = await SafeStorage.getItem('@easyfarm_customer_phone');
        const resolvedPhone = phoneInput.trim() || existingProf?.phone || storedPhone || '';

        if (!resolvedName) {
          Alert.alert('Customer Name Required', 'Please provide your full name to complete your account registration.');
          setAuthMode('signup');
          setCurrentScreen('login');
          return;
        }

        setUserName(resolvedName);
        await SafeStorage.setItem('@easyfarm_customer_name', resolvedName);

        if (resolvedPhone) {
          setPhoneInput(resolvedPhone);
          await SafeStorage.setItem('@easyfarm_customer_phone', resolvedPhone);
        }

        const profilePayload: any = {
          email: trimmedEmail,
          full_name: resolvedName,
          phone: resolvedPhone,
          updated_at: new Date().toISOString(),
        };
        if (verifiedUser?.id) {
          profilePayload.id = verifiedUser.id;
          profilePayload.auth_user_id = verifiedUser.id;
        }

        await supabase.from('profiles').upsert(profilePayload);
      } catch (profileErr) {
        console.warn('Profile sync note:', profileErr);
      }
      setIsLoggedIn(true);

      // Refresh dynamic Easy Coins from Supabase for this verified user
      try {
        const liveCoins = await fetchCustomerCoins(trimmedEmail);
        setUserCoins(liveCoins);
      } catch (coinsErr) {
        console.warn('Post-login coins fetch note:', coinsErr);
      }

      await reloadOrders();
      setCurrentScreen('map_confirm');
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Failed to verify code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSignOut = async () => {
    await SafeStorage.removeItem('@easyfarm_logged_in_user');
    setIsLoggedIn(false);
    setEmailInput('');
    setFullNameInput('');
    setPhoneInput('');
    setOtpInput(['', '', '', '', '', '']);
    setCurrentScreen('login');
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await getUserCurrentLocation();
      setMapCoords({ lat: loc.latitude, lng: loc.longitude });
      setSelectedAddress(loc.formattedAddress);
      setLocality(loc.locality);
      setCurrentScreen('map_confirm');
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Unable to detect GPS position.');
      setCurrentScreen('map_confirm');
    } finally {
      setIsLocating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCREEN 1: SPLASH SCREEN (FLASH WHITE LOGO ON ENTERING APP)
  // ─────────────────────────────────────────────────────────────
  if (showSplash) {
    return <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 2: WELCOME / ONBOARDING
  // ─────────────────────────────────────────────────────────────
  if (currentScreen === 'onboarding') {
    return (
      <SafeAreaView style={styles.whiteScreen}>
        <StatusBar style="dark" />
        <View style={styles.onboardingHeader}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              setAuthMode('signup');
              setCurrentScreen('login');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.onboardingBody}>
          <Image
            source={require('../assets/custom-box.jpg')}
            style={styles.onboardingHeroImg}
            resizeMode="cover"
          />

          <View style={styles.dotRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <Text style={styles.onboardingTitle}>Fresh Vegetables{'\n'}Delivered Fresh</Text>
          <Text style={styles.onboardingSub}>Farm to home, with care.</Text>
        </View>

        <View style={styles.onboardingBottom}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setAuthMode('signup');
              setCurrentScreen('login');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started ➔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 3: LOGIN OR SIGNUP
  // ─────────────────────────────────────────────────────────────
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.whiteScreen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authLogoWrap}>
            <Image
              source={require('../assets/easyfarm-logo.png')}
              style={styles.authLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.authWelcomeTitle}>
            {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.authWelcomeSub}>
            {authMode === 'signup'
              ? 'Enter your customer details to start farm deliveries.'
              : 'Log in to your registered Easy Farm account.'}
          </Text>

          {/* Toggle SignUp / Login */}
          <View style={styles.authTabWrap}>
            <TouchableOpacity
              style={[styles.authTab, authMode === 'signup' && styles.authTabActive]}
              onPress={() => setAuthMode('signup')}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
              onPress={() => setAuthMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Field 1: Full Name */}
          {authMode === 'signup' && (
            <View style={styles.authInputWrap}>
              <User size={18} color="#94a3b8" />
              <TextInput
                style={styles.authInput}
                placeholder="Full Name (required)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                value={fullNameInput}
                onChangeText={setFullNameInput}
              />
            </View>
          )}

          {/* Email Input */}
          <View style={styles.authInputWrap}>
            <Mail size={18} color="#94a3b8" />
            <TextInput
              style={styles.authInput}
              placeholder={authMode === 'signup' ? 'Email Address (required)' : 'Registered Email Address'}
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={setEmailInput}
            />
          </View>

          {/* Sign Up Field 2: 10-digit Mobile Number */}
          {authMode === 'signup' && (
            <View style={styles.authInputWrap}>
              <Phone size={18} color="#94a3b8" />
              <TextInput
                style={styles.authInput}
                placeholder="10-digit Mobile Number (required)"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneInput}
                onChangeText={setPhoneInput}
              />
            </View>
          )}

          {/* Continue with Email Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSendOtp}
            activeOpacity={0.85}
            disabled={isSendingOtp}
          >
            {isSendingOtp ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {authMode === 'signup' ? 'Create Account & Send OTP ➔' : 'Send Login OTP ➔'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Helpful Switcher */}
          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center', paddingVertical: 6 }}
            onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700' }}>
              {authMode === 'signup'
                ? 'Already have an account? Sign In'
                : "New to Easy Farm? Create an Account"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.authLegalText}>
            By continuing, you agree to our{' '}
            <Text style={{ fontWeight: '700', color: '#065f46' }}>Terms & Conditions</Text> and{' '}
            <Text style={{ fontWeight: '700', color: '#065f46' }}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 4: EMAIL OTP VERIFICATION
  // ─────────────────────────────────────────────────────────────
  if (currentScreen === 'otp') {
    return (
      <SafeAreaView style={styles.whiteScreen}>
        <StatusBar style="dark" />
        <View style={styles.authScroll}>
          <View style={styles.otpIconWrap}>
            <Mail size={40} color="#059669" />
          </View>

          <Text style={styles.otpTitle}>Verify your email</Text>
          <Text style={styles.otpSub}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>
              {emailInput}
            </Text>
          </Text>

          {/* 6 OTP Boxes (Empty on start, auto-advancing) */}
          <View style={styles.otpBoxesRow}>
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <TextInput
                key={idx}
                ref={(el) => {
                  otpBoxRefs.current[idx] = el;
                }}
                style={[
                  styles.otpBox,
                  otpInput[idx] ? styles.otpBoxFilled : null,
                ]}
                maxLength={1}
                keyboardType="number-pad"
                value={otpInput[idx]}
                onChangeText={(val) => {
                  const copy = [...otpInput];
                  copy[idx] = val;
                  setOtpInput(copy);
                  if (val && idx < 5) {
                    otpBoxRefs.current[idx + 1]?.focus();
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !otpInput[idx] && idx > 0) {
                    otpBoxRefs.current[idx - 1]?.focus();
                  }
                }}
              />
            ))}
          </View>

          {/* Resend Countdown / Action */}
          {resendTimer > 0 ? (
            <Text style={styles.resendText}>
              Resend OTP in 00:{String(resendTimer).padStart(2, '0')}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOtp} disabled={isSendingOtp} style={{ marginBottom: 24 }}>
              <Text style={[styles.resendText, { textDecorationLine: 'underline', color: '#065f46' }]}>
                {isSendingOtp ? 'Sending fresh code...' : 'Resend OTP to Email'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleVerifyOtp}
            activeOpacity={0.85}
            disabled={isVerifyingOtp}
          >
            {isVerifyingOtp ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 16 }}
            onPress={() => setCurrentScreen('login')}
            activeOpacity={0.7}
          >
            <Text style={styles.backLinkText}>Back to Email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 5 & 6: DIRECT MAP PICKER & GPS AUTO-FETCH
  // (No saved address clutter - auto fetches current GPS & validates serviceability)
  // ─────────────────────────────────────────────────────────────
  if (currentScreen === 'location_search' || currentScreen === 'map_confirm') {
    return (
      <SafeAreaView style={styles.whiteScreen}>
        <StatusBar style="dark" />
        <ZeptoMapPicker
          initialLat={mapCoords.lat}
          initialLng={mapCoords.lng}
          onAddressSelect={(res) => {
            setSelectedAddress(res.formattedAddress);
            if (res.landmark) setLocality(res.landmark);
            if (res.flatNumber) setFlatNo(res.flatNumber);

            // Save address to Supabase
            saveAddressToSupabase(
              {
                label: 'Home',
                flatNo: res.flatNumber || 'Flat',
                apartment: res.landmark || 'Apartment',
                locality: res.landmark || 'Pocharam',
                pincode: '500088',
                fullAddress: res.formattedAddress,
                latitude: res.lat,
                longitude: res.lng,
                isServiceable: res.isServiceable,
              },
              emailInput
            );

            setCurrentScreen('main');
          }}
          onClose={() => setCurrentScreen('main')}
        />
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN 7: ADD ADDRESS DETAILS
  // ─────────────────────────────────────────────────────────────
  if (currentScreen === 'address_details') {
    return (
      <SafeAreaView style={styles.whiteScreen}>
        <StatusBar style="dark" />
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('map_confirm')} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Add Address Details</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.addrSelectedCard}>
            <Home size={22} color="#065f46" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.addrSelectedTitle}>Home</Text>
              <Text style={styles.addrSelectedText}>{selectedAddress}</Text>
              <View style={styles.deliverySlotPill}>
                <Text style={styles.deliverySlotText}>Delivery: Sunday by 6 PM</Text>
              </View>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Flat / House No. *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 302"
            placeholderTextColor="#94a3b8"
            value={flatNo}
            onChangeText={setFlatNo}
          />

          <Text style={styles.fieldLabel}>Building / Apartment *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Tower A"
            placeholderTextColor="#94a3b8"
            value={buildingName}
            onChangeText={setBuildingName}
          />

          <Text style={styles.fieldLabel}>Locality / Street *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Singapore Township"
            placeholderTextColor="#94a3b8"
            value={locality}
            onChangeText={setLocality}
          />

          <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Near Main Gate"
            placeholderTextColor="#94a3b8"
            value={landmark}
            onChangeText={setLandmark}
          />

          <Text style={styles.fieldLabel}>Delivery Notes (Optional)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Ring bell"
            placeholderTextColor="#94a3b8"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24 }]}
            onPress={async () => {
              const full = `${flatNo ? flatNo + ', ' : ''}${buildingName ? buildingName + ', ' : ''}${locality}`;
              setSelectedAddress(full);
              await SafeStorage.setItem('@easyfarm_saved_address', full);

              // Sync to Supabase customer_addresses
              await saveAddressToSupabase(
                {
                  label: 'Home',
                  flatNo,
                  apartment: buildingName,
                  locality,
                  pincode: '500088',
                  fullAddress: full,
                  latitude: 17.4475,
                  longitude: 78.6534,
                  isServiceable: true,
                },
                emailInput
              );

              setCurrentScreen('main');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Save Address & Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREENS 8, 9, 10: MAIN STORE
  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Screen 1: Animated Splash Screen */}
      {showSplash && <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />}

      {/* TOP HEADER (Screen 8 & 9) */}
      <View style={styles.mainHeader}>
        <TouchableOpacity
          style={styles.deliverToWrap}
          onPress={() => setCurrentScreen('map_confirm')}
          activeOpacity={0.8}
        >
          <MapPin size={16} color="#065f46" />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.deliverToTag}>DELIVER TO HOME</Text>
              <ChevronDown size={11} color="#065f46" />
            </View>
            <Text style={styles.deliverToAddr} numberOfLines={1}>
              {selectedAddress.split(',')[0]}
            </Text>
          </View>
        </TouchableOpacity>

        {/* TOP RIGHT: Easy Coins pill placed directly to the left of the notification bell */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCoinsPill}
            onPress={() => setMainTab('rewards')}
            activeOpacity={0.85}
          >
            <Text style={styles.headerCoinsIcon}>🪙</Text>
            <Text style={styles.headerCoinsText}>
              <Text style={{ fontWeight: '800' }}>{userCoins}</Text> Easy Coins
            </Text>
            <ChevronRight size={13} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => Alert.alert('Next Delivery', `${sundayInfo.dateString}\nHarvest schedule is active!`)}
            activeOpacity={0.8}
          >
            <Bell size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCREEN 8: HOME SCREEN ── */}
      {mainTab === 'home' && (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View style={styles.homeHeroBanner}>
            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>Freshness, delivered differently.</Text>
              <Text style={styles.heroSub}>Your weekly essentials, delivered fresh every Sunday.</Text>
            </View>
            <Image
              source={require('../assets/hero-vegetables.png')}
              style={styles.heroBannerImg}
              resizeMode="contain"
            />
          </View>

          {/* Dynamic Baskets Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.homeSectionTitle}>Farm Harvest Boxes</Text>
            <TouchableOpacity onPress={() => setMainTab('shop')}>
              <Text style={styles.seeAllText}>Explore All</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Farm Harvest Boxes */}
          <View style={styles.basketsRow}>
            {/* 1. Staple Box Card (with database fixed veggies + 3 swaps, NO veggie emojis) */}
            <TouchableOpacity
              style={styles.basketCard}
              onPress={() => setShowStapleCustomizer(true)}
              activeOpacity={0.88}
            >
              <Image
                source={require('../assets/staple-box.jpg')}
                style={styles.basketImg}
                resizeMode="cover"
              />
              <View style={styles.basketBadgeRow}>
                <Text style={styles.basketTitle}>Staple Box</Text>
                <View style={styles.fixedPill}>
                  <Text style={styles.fixedPillText}>5 ITEMS • 3 SWAPS</Text>
                </View>
              </View>

              {/* Fixed Veggies List directly matching the database without emojis */}
              <View style={styles.fixedVeggiesList}>
                {(stapleBox.items && stapleBox.items.length > 0
                  ? stapleBox.items
                  : [
                      { name: 'Country Tomato', quantity: '1 kg' },
                      { name: 'Red Onion', quantity: '1.5 kg' },
                      { name: 'Potato', quantity: '2 kg' },
                      { name: 'Fresh Palak (Spinach)', quantity: '2 bunches' },
                      { name: 'Lady Finger (Bhindi)', quantity: '0.5 kg' },
                    ]
                ).map((v, idx) => (
                  <Text key={idx} style={styles.fixedVeggieItem} numberOfLines={1}>
                    {v.name} • {v.quantity}
                  </Text>
                ))}
              </View>

              <View style={styles.basketFooter}>
                <View>
                  <Text style={styles.basketPrice}>₹{stapleBox.price}</Text>
                  <Text style={styles.basketMarketPrice}>
                    ₹{stapleBox.compare_at_price || Math.round(stapleBox.price * 1.25)}
                  </Text>
                </View>

                {getItemQuantity(stapleBox.id) === 0 ? (
                  <TouchableOpacity
                    style={styles.boxActionBtn}
                    onPress={() => setShowStapleCustomizer(true)}
                    activeOpacity={0.85}
                  >
                    <Plus size={13} color="#ffffff" />
                    <Text style={styles.boxActionBtnText}>Customize & Add</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.boxStepper}>
                    <TouchableOpacity
                      style={styles.boxStepBtn}
                      onPress={() => updateQuantity(stapleBox.id, getItemQuantity(stapleBox.id) - 1)}
                    >
                      <Minus size={11} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.boxQtyText}>{getItemQuantity(stapleBox.id)}</Text>
                    <TouchableOpacity
                      style={styles.boxStepBtn}
                      onPress={() => updateQuantity(stapleBox.id, getItemQuantity(stapleBox.id) + 1)}
                    >
                      <Plus size={11} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* 2. Custom Box Card (Min 4 crops builder, initially ₹0, NO emojis) */}
            <TouchableOpacity
              style={styles.basketCard}
              onPress={() => setMainTab('shop')}
              activeOpacity={0.88}
            >
              <Image
                source={require('../assets/custom-box.jpg')}
                style={styles.basketImg}
                resizeMode="cover"
              />
              <View style={styles.basketBadgeRow}>
                <Text style={styles.basketTitle}>Custom Box</Text>
                <View style={[styles.fixedPill, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.fixedPillText, { color: '#b45309' }]}>MIN 4 CROPS</Text>
                </View>
              </View>

              {/* Highlights for Custom Box without emojis */}
              <View style={styles.fixedVeggiesList}>
                <Text style={styles.fixedVeggieItem} numberOfLines={1}>• Pick any fresh vegetables</Text>
                <Text style={styles.fixedVeggieItem} numberOfLines={1}>• Custom weights: 250g, 500g, 1kg, 2kg</Text>
                <Text style={styles.fixedVeggieItem} numberOfLines={1}>• Min 4 items required to build</Text>
                <Text style={styles.fixedVeggieItem} numberOfLines={1}>• Pay only for what you pick</Text>
                <Text style={styles.fixedVeggieItem} numberOfLines={1}>• Harvested fresh on Sunday</Text>
              </View>

              <View style={styles.basketFooter}>
                <View>
                  <Text style={styles.basketPrice}>
                    {getItemQuantity(customBox.id) > 0 ? `₹${customBoxPriceInCart}` : '₹0'}
                  </Text>
                  <Text style={styles.basketMarketPrice}>
                    {getItemQuantity(customBox.id) > 0 ? 'Custom Box' : 'Starts at ₹0'}
                  </Text>
                </View>

                {getItemQuantity(customBox.id) === 0 ? (
                  <TouchableOpacity
                    style={styles.boxActionBtn}
                    onPress={() => setMainTab('shop')}
                    activeOpacity={0.85}
                  >
                    <Plus size={13} color="#ffffff" />
                    <Text style={styles.boxActionBtnText}>Select Veggies</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.boxStepper}>
                    <TouchableOpacity
                      style={styles.boxStepBtn}
                      onPress={() => updateQuantity(customBox.id, getItemQuantity(customBox.id) - 1)}
                    >
                      <Minus size={11} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.boxQtyText}>{getItemQuantity(customBox.id)}</Text>
                    <TouchableOpacity
                      style={styles.boxStepBtn}
                      onPress={() => updateQuantity(customBox.id, getItemQuantity(customBox.id) + 1)}
                    >
                      <Plus size={11} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* ── WEEKLY STREAK HERO CARD (Home Screen Preview matching design mockup) ── */}
          <TouchableOpacity
            style={styles.homeStreakCard}
            onPress={() => setMainTab('rewards')}
            activeOpacity={0.9}
          >
            {/* Subtle leaf accent */}
            <View style={styles.homeStreakDecoLeaf} />

            <View style={styles.homeStreakLeft}>
              <View style={styles.homeStreakBadge}>
                <Text style={styles.homeStreakBadgeStar}>⭐</Text>
                <Text style={styles.homeStreakBadgeText}>Weekly Streak</Text>
              </View>
              <Text style={styles.homeStreakTitle}>
                {(typeof streakInfo.currentStreak === 'number' ? streakInfo.currentStreak : 0) === 0
                  ? 'Start your streak\nwith Easy Farm!'
                  : 'Keep ordering\nwith Easy Farm!'}
              </Text>
              <Text style={styles.homeStreakSub}>
                {(typeof streakInfo.currentStreak === 'number' ? streakInfo.currentStreak : 0) === 0
                  ? 'Complete your 1st order to start your weekly streak.'
                  : 'Complete 1 weekly order to maintain your streak.'}
              </Text>
            </View>

            <View style={styles.homeStreakDivider} />

            <View style={styles.homeStreakRight}>
              <Text style={styles.homeStreakCount}>
                {typeof streakInfo.currentStreak === 'number' ? streakInfo.currentStreak : 0}
              </Text>
              <Text style={styles.homeStreakUnit}>
                {(typeof streakInfo.currentStreak === 'number' ? streakInfo.currentStreak : 0) === 1 ? 'Week' : 'Weeks'}
              </Text>
              <Text style={styles.homeStreakLabel}>Current Streak</Text>
              <View style={styles.homeStreakLink}>
                <Text style={styles.homeStreakLinkText}>Journey ›</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* How Easy Farm Works */}
          <View style={styles.howWorksCard}>
            <Text style={styles.howWorksTitle}>How Easy Farm Works</Text>
            <View style={styles.howWorksSteps}>
              <View style={styles.stepCol}>
                <View style={styles.stepCircle}>
                  <ShoppingBag size={18} color="#065f46" />
                </View>
                <Text style={styles.stepLabel}>Select Basket</Text>
              </View>
              <Text style={styles.stepArrow}>➔</Text>
              <View style={styles.stepCol}>
                <View style={styles.stepCircle}>
                  <Package size={18} color="#065f46" />
                </View>
                <Text style={styles.stepLabel}>We Deliver</Text>
              </View>
              <Text style={styles.stepArrow}>➔</Text>
              <View style={styles.stepCol}>
                <View style={styles.stepCircle}>
                  <CheckCircle size={18} color="#065f46" />
                </View>
                <Text style={styles.stepLabel}>Enjoy Fresh</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Floating Cart Dock for Home Tab */}
      {mainTab === 'home' && totalItems > 0 && (
        <View style={styles.floatingCartBarWrap}>
          <TouchableOpacity
            style={styles.floatingCartBar}
            onPress={() => setShowCheckout(true)}
            activeOpacity={0.9}
          >
            <ShoppingBag size={18} color="#ffffff" />
            <Text style={styles.floatingCartText}>
              View Cart • ₹{subtotal} • {totalItems} items
            </Text>
            <ChevronRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── SCREEN 9: SHOP / PRODUCT CATALOG & AUTOMATIC CUSTOM BOX BUILDER ── */}
      <View style={{ flex: 1, display: mainTab === 'shop' ? 'flex' : 'none' }}>
        <CustomBoxBuilderModal
          inline
          visible={true}
          customBoxId={customBox.id}
          products={products}
          onAutoSyncCustomBox={handleAutoSyncCustomBox}
          onProceedToOrder={handleProceedFromShop}
          resetKey={placedOrderId}
        />
      </View>

      {/* ── TAB: DYNAMIC ORDERS ── */}
      {mainTab === 'orders' && (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} showsVerticalScrollIndicator={false}>
          {/* Orders Top Header */}
          <View style={styles.ordersHeaderRow}>
            <View>
              <Text style={styles.ordersHeaderTitle}>My Farm Orders</Text>
              <Text style={styles.ordersHeaderSubtitle}>
                {ordersList.length} {ordersList.length === 1 ? 'harvest order' : 'harvest orders'} placed
              </Text>
            </View>
            <TouchableOpacity onPress={reloadOrders} style={styles.ordersRefreshBtn} activeOpacity={0.7}>
              <RefreshCw size={15} color="#065f46" />
              <Text style={styles.ordersRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.orderFilterRow}>
            <TouchableOpacity
              style={[styles.orderFilterPill, orderFilter === 'all' && styles.orderFilterPillActive]}
              onPress={() => setOrderFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.orderFilterPillText, orderFilter === 'all' && styles.orderFilterPillTextActive]}>
                All Orders ({ordersList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.orderFilterPill, orderFilter === 'active' && styles.orderFilterPillActive]}
              onPress={() => setOrderFilter('active')}
              activeOpacity={0.7}
            >
              <Text style={[styles.orderFilterPillText, orderFilter === 'active' && styles.orderFilterPillTextActive]}>
                Active Sunday ({ordersList.filter((o) => o.status !== 'delivered').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.orderFilterPill, orderFilter === 'delivered' && styles.orderFilterPillActive]}
              onPress={() => setOrderFilter('delivered')}
              activeOpacity={0.7}
            >
              <Text style={[styles.orderFilterPillText, orderFilter === 'delivered' && styles.orderFilterPillTextActive]}>
                Past ({ordersList.filter((o) => o.status === 'delivered').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Sunday Harvest Live Tracker Card */}
          {activeSundayOrder && orderFilter !== 'delivered' && (
            <TouchableOpacity
              style={styles.activeHarvestHeroCard}
              onPress={() => openOrderDetail(activeSundayOrder)}
              activeOpacity={0.9}
            >
              <View style={styles.activeHarvestHeader}>
                <View style={styles.activeHarvestBadge}>
                  <Sparkles size={13} color="#065f46" />
                  <Text style={styles.activeHarvestBadgeText}>LIVE SUNDAY HARVEST</Text>
                </View>
                <Text style={styles.activeHarvestSlotText}>
                  Arriving {activeSundayOrder.deliveryDate} by 6:30 PM
                </Text>
              </View>

              <Text style={styles.activeHarvestOrderTitle}>
                Order #{activeSundayOrder.orderNumber}
              </Text>
              <Text style={styles.activeHarvestDestText} numberOfLines={1}>
                📍 Delivering to {activeSundayOrder.address?.apartment || activeSundayOrder.address?.locality || 'Pocharam'}
              </Text>

              {/* 4-Step Tracker Timeline */}
              <View style={styles.trackerTimelineWrap}>
                <View style={styles.trackerLineBackdrop} />
                <View style={styles.trackerStepsRow}>
                  {/* Step 1: Confirmed */}
                  <View style={styles.trackerStepItem}>
                    <View style={[styles.trackerStepCircle, styles.trackerStepDone]}>
                      <Check size={12} color="#ffffff" />
                    </View>
                    <Text style={styles.trackerStepLabelActive}>Reserved</Text>
                    <Text style={styles.trackerStepSub}>Confirmed</Text>
                  </View>

                  {/* Step 2: Harvesting */}
                  <View style={styles.trackerStepItem}>
                    <View
                      style={[
                        styles.trackerStepCircle,
                        activeSundayOrder.status === 'harvested' ||
                        activeSundayOrder.status === 'packed' ||
                        activeSundayOrder.status === 'out_for_delivery' ||
                        activeSundayOrder.status === 'delivered'
                          ? styles.trackerStepDone
                          : styles.trackerStepCurrent,
                      ]}
                    >
                      <Text style={{ fontSize: 10, color: '#ffffff' }}>🌿</Text>
                    </View>
                    <Text style={styles.trackerStepLabel}>Harvesting</Text>
                    <Text style={styles.trackerStepSub}>Sunday 6 AM</Text>
                  </View>

                  {/* Step 3: Packed */}
                  <View style={styles.trackerStepItem}>
                    <View
                      style={[
                        styles.trackerStepCircle,
                        activeSundayOrder.status === 'packed' ||
                        activeSundayOrder.status === 'out_for_delivery' ||
                        activeSundayOrder.status === 'delivered'
                          ? styles.trackerStepDone
                          : styles.trackerStepUpcoming,
                      ]}
                    >
                      <Package size={11} color={activeSundayOrder.status === 'packed' ? '#ffffff' : '#94a3b8'} />
                    </View>
                    <Text style={styles.trackerStepLabel}>Sorted</Text>
                    <Text style={styles.trackerStepSub}>Eco Crates</Text>
                  </View>

                  {/* Step 4: Out for Delivery */}
                  <View style={styles.trackerStepItem}>
                    <View
                      style={[
                        styles.trackerStepCircle,
                        activeSundayOrder.status === 'out_for_delivery' || activeSundayOrder.status === 'delivered'
                          ? styles.trackerStepDone
                          : styles.trackerStepUpcoming,
                      ]}
                    >
                      <Truck size={11} color={activeSundayOrder.status === 'out_for_delivery' ? '#ffffff' : '#94a3b8'} />
                    </View>
                    <Text style={styles.trackerStepLabel}>Dispatch</Text>
                    <Text style={styles.trackerStepSub}>Van en route</Text>
                  </View>
                </View>
              </View>

              <View style={styles.activeHarvestTapCtaRow}>
                <Text style={styles.activeHarvestTapCtaText}>Tap for full live tracking & farm details</Text>
                <ChevronRight size={14} color="#065f46" />
              </View>
            </TouchableOpacity>
          )}

          {isLoadingOrders ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#065f46" />
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 10 }}>Syncing orders from farm database...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyOrdersCard}>
              <View style={styles.emptyOrdersHalo}>
                <Package size={42} color="#065f46" />
              </View>
              <Text style={styles.emptyOrdersTitle}>
                {orderFilter === 'delivered' ? 'No Past Deliveries' : 'No Active Sunday Orders'}
              </Text>
              <Text style={styles.emptyOrdersSub}>
                Vegetables are freshly harvested every Sunday morning for residents of Pocharam & Ghatkesar. Reserve your harvest box before Saturday 8:00 PM!
              </Text>
              <View style={styles.emptyNextSundayPill}>
                <Clock size={12} color="#065f46" />
                <Text style={styles.emptyNextSundayText}>Next Harvest: This Sunday (4 PM – 6:30 PM)</Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 18, paddingHorizontal: 24 }]}
                onPress={() => setMainTab('shop')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Build Custom Harvest Box ➔</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((ord) => {
              const customCropItems = ord.items.flatMap((i) => i.customizedItems || []);
              const hasCustomCrops = customCropItems.length > 0;
              const cropNamesPreview = hasCustomCrops
                ? customCropItems.map((c) => c.name).filter(Boolean).slice(0, 4).join(', ') + (customCropItems.length > 4 ? ` +${customCropItems.length - 4} more` : '')
                : ord.items.map((i) => i.name).slice(0, 2).join(', ');

              const statusColor =
                ord.status === 'delivered'
                  ? { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', label: 'Delivered' }
                  : ord.status === 'out_for_delivery'
                  ? { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: '🚚 Out for Delivery' }
                  : ord.status === 'packed'
                  ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: '📦 Packed & Ready' }
                  : ord.status === 'harvested'
                  ? { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4', label: '🌿 Harvested' }
                  : { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: '✓ Confirmed for Sunday' };

              return (
                <TouchableOpacity
                  key={ord.id}
                  style={styles.cleanOrderCard}
                  onPress={() => openOrderDetail(ord)}
                  activeOpacity={0.88}
                >
                  {/* Card Header: Order # + Status Pill */}
                  <View style={styles.cleanOrderTopBar}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cleanOrderNum}>Order #{ord.orderNumber}</Text>
                      <View style={styles.cleanOrderDateRow}>
                        <Clock size={11} color="#64748b" />
                        <Text style={styles.cleanOrderDateSub}>
                          {ord.deliveryDate} • {ord.deliverySlot}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cleanStatusPill, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
                      <Text style={[styles.cleanStatusPillText, { color: statusColor.text }]}>
                        {statusColor.label}
                      </Text>
                    </View>
                  </View>

                  {/* Out for Delivery Quick OTP Callout */}
                  {ord.status === 'out_for_delivery' && (
                    <View style={styles.cleanOtpCallout}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cleanOtpCalloutTitle}>🚚 DELIVERY IN PROGRESS</Text>
                        <Text style={styles.cleanOtpCalloutSub}>
                          {ord.deliveryOtp ? 'Handover OTP ready for driver' : 'OTP dispatched to registered email'}
                        </Text>
                      </View>
                      {ord.deliveryOtp ? (
                        <View style={styles.cleanOtpCalloutBadge}>
                          <Text style={styles.cleanOtpCalloutBadgeText}>{ord.deliveryOtp}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Order Content Summary */}
                  <View style={styles.cleanOrderInfoBlock}>
                    <View style={styles.cleanInfoRow}>
                      <Package size={13} color="#065f46" />
                      <Text style={styles.cleanInfoText} numberOfLines={1}>
                        <Text style={{ fontWeight: '700', color: '#1e293b' }}>
                          {ord.items.length} {ord.items.length === 1 ? 'Farm Box' : 'Farm Boxes'}
                        </Text>
                        {cropNamesPreview ? ` • ${cropNamesPreview}` : ''}
                      </Text>
                    </View>

                    <View style={styles.cleanInfoRow}>
                      <MapPin size={13} color="#065f46" />
                      <Text style={styles.cleanInfoText} numberOfLines={1}>
                        {ord.address?.flatNo ? `Flat ${ord.address.flatNo}, ` : ''}
                        {ord.address?.apartment || ord.address?.locality || 'Pocharam / Ghatkesar'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Bottom Bar: Amount + Track & Details CTA */}
                  <View style={styles.cleanOrderBottomBar}>
                    <View>
                      <Text style={styles.cleanOrderPrice}>₹{ord.total}</Text>
                      <Text style={styles.cleanOrderPaySub}>
                        ✓ Paid via {ord.paymentMethod}
                      </Text>
                    </View>

                    <View style={styles.trackDetailsBtn}>
                      <Text style={styles.trackDetailsBtnText}>Track & Details</Text>
                      <ChevronRight size={14} color="#065f46" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* ── TAB: REWARDS (WEEKLY STREAK & EASY COINS) ── */}
      {mainTab === 'rewards' && (
        <WeeklyStreakView
          streakInfo={streakInfo}
          userCoins={userCoins}
          onBack={() => setMainTab('home')}
          onOpenCheckout={() => setMainTab('shop')}
        />
      )}

      {/* ── TAB: PROFILE & ACCOUNT ACTIONS ── */}
      {mainTab === 'profile' && (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} showsVerticalScrollIndicator={false}>
          {/* Top Profile Hero Card */}
          <View style={styles.profileHeroCard}>
            <View style={styles.profileAvatarBox}>
              <Text style={styles.profileAvatarText}>
                {(userName && userName !== 'Easy Farm Member'
                  ? userName
                  : emailInput || 'Customer'
                )
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.profileNameText} numberOfLines={1}>
                  {userName && userName !== 'Easy Farm Member'
                    ? userName
                    : emailInput
                    ? emailInput
                        .split('@')[0]
                        .replace(/[._\-+]/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Customer'}
                </Text>
                <TouchableOpacity
                  style={styles.editProfilePill}
                  onPress={() => {
                    setEditNameInput(userName);
                    setEditPhoneInput(phoneInput || '9876543210');
                    setShowEditProfileModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit3 size={11} color="#065f46" />
                  <Text style={styles.editProfilePillText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.profileEmailText} numberOfLines={1}>
                {emailInput || 'customer@easyfarm.co.in'}
              </Text>

              {/* Badges Row */}
              <View style={styles.profileBadgesRow}>
                <View style={styles.profileBadgeCoins}>
                  <Text style={styles.profileBadgeCoinsText}>🪙 {userCoins} Easy Coins</Text>
                </View>
                <View style={styles.profileBadgeStreak}>
                  <Text style={styles.profileBadgeStreakText}>🔥 {streakInfo.currentStreak}w Streak</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── SECTION 1: ORDERS & DELIVERIES ── */}
          <View style={styles.profileSectionWrap}>
            <Text style={styles.profileSectionLabel}>ORDERS & DELIVERIES</Text>
            <View style={styles.profileMenuCard}>
              {/* 1. Your Orders */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => setMainTab('orders')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <Package size={18} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Your Orders</Text>
                  <Text style={styles.actionSubtitle}>Track active Sunday harvest & past deliveries</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* 2. Your Refunds */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => setShowRefundsModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#fffbeb' }]}>
                  <RotateCcw size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Your Refunds</Text>
                  <Text style={styles.actionSubtitle}>Refund claims, wallet credits & 100% guarantee</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* 3. Saved Addresses */}
              <TouchableOpacity
                style={[styles.profileActionRow, { borderBottomWidth: 0 }]}
                onPress={() => setShowSavedAddressModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <MapPin size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Saved Addresses</Text>
                  <Text style={styles.actionSubtitle}>Doorstep pin, flat no. & gate instructions</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SECTION 2: ACCOUNT & NOTIFICATIONS ── */}
          <View style={styles.profileSectionWrap}>
            <Text style={styles.profileSectionLabel}>ACCOUNT & PREFERENCES</Text>
            <View style={styles.profileMenuCard}>
              {/* 4. Edit Profile */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => {
                  setEditNameInput(userName);
                  setEditPhoneInput(phoneInput || '9876543210');
                  setShowEditProfileModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#f3e8ff' }]}>
                  <Edit3 size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSubtitle}>Full name, phone number, and preferences</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* 5. Notifications */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => setShowNotificationsModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#ffe4e6' }]}>
                  <Bell size={18} color="#e11d48" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Notifications</Text>
                  <Text style={styles.actionSubtitle}>Harvest reminders & Sunday delivery alerts</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* 6. Suggest Products */}
              <TouchableOpacity
                style={[styles.profileActionRow, { borderBottomWidth: 0 }]}
                onPress={() => setShowSuggestProductModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#ccfbf1' }]}>
                  <Lightbulb size={18} color="#0d9488" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Suggest Products</Text>
                  <Text style={styles.actionSubtitle}>Tell us what crops or greens you want us to grow</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SECTION 3: HELP & FEEDBACK ── */}
          <View style={styles.profileSectionWrap}>
            <Text style={styles.profileSectionLabel}>HELP & FEEDBACK</Text>
            <View style={styles.profileMenuCard}>
              {/* 7. Rate & Review Easy Farm */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => setShowReviewModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#fef9c3' }]}>
                  <Star size={18} color="#ca8a04" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Rate & Review Easy Farm</Text>
                  <Text style={styles.actionSubtitle}>Share your feedback on vegetable quality</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* 8. Help & Support */}
              <TouchableOpacity
                style={styles.profileActionRow}
                onPress={() => setShowHelpModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <HelpCircle size={18} color="#065f46" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>Help & Support</Text>
                  <Text style={styles.actionSubtitle}>WhatsApp helpline, call & Sunday delivery FAQs</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Welcome Tour */}
              <TouchableOpacity
                style={[styles.profileActionRow, { borderBottomWidth: 0 }]}
                onPress={() => setCurrentScreen('onboarding')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: '#f1f5f9' }]}>
                  <Sparkles size={18} color="#64748b" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.actionTitle}>View Welcome Tour</Text>
                  <Text style={styles.actionSubtitle}>Explore Easy Farm harvest model</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SECTION 4: SIGN OUT ── */}
          <View style={[styles.profileSectionWrap, { marginBottom: 32 }]}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <ArrowLeft size={18} color="#e11d48" />
              <Text style={styles.signOutBtnText}>Sign Out & Switch Account</Text>
            </TouchableOpacity>
            <Text style={styles.appVersionText}>Easy Farm v1.0.0 • Farm to Doorstep in Pocharam & Ghatkesar</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── BOTTOM NAVIGATION ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('home')}
          activeOpacity={0.8}
        >
          <Home size={22} color={mainTab === 'home' ? '#065f46' : '#94a3b8'} />
          <Text style={[styles.navText, mainTab === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('shop')}
          activeOpacity={0.8}
        >
          <ShoppingBag size={22} color={mainTab === 'shop' ? '#065f46' : '#94a3b8'} />
          <Text style={[styles.navText, mainTab === 'shop' && styles.navTextActive]}>Shop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('orders')}
          activeOpacity={0.8}
        >
          <Package size={22} color={mainTab === 'orders' ? '#065f46' : '#94a3b8'} />
          <Text style={[styles.navText, mainTab === 'orders' && styles.navTextActive]}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('rewards')}
          activeOpacity={0.8}
        >
          <Gift size={22} color={mainTab === 'rewards' ? '#065f46' : '#94a3b8'} />
          <Text style={[styles.navText, mainTab === 'rewards' && styles.navTextActive]}>Rewards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('profile')}
          activeOpacity={0.8}
        >
          <User size={22} color={mainTab === 'profile' ? '#065f46' : '#94a3b8'} />
          <Text style={[styles.navText, mainTab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Staple Box Step-by-Step Customizer (5 Essentials + 3 Swaps, all from Database) */}
      <StapleBoxCustomizerModal
        visible={showStapleCustomizer}
        onClose={() => setShowStapleCustomizer(false)}
        initialItems={stapleBox.items}
        allProducts={products}
        boxPrice={stapleBox.price}
        onAddToCart={(customizedItems, swapsCount, finalPrice) => {
          addToCart(
            {
              id: stapleBox.id,
              name: stapleBox.name,
              slug: stapleBox.slug || 'staple-basket',
              price: finalPrice,
              market_price: stapleBox.compare_at_price || Math.round(finalPrice * 1.25),
              unit: 'box',
              image_url:
                stapleBox.image_url ||
                'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80',
              category: 'Farm Boxes',
              customizedItems,
            },
            1
          );
          Alert.alert(
            'Staple Box Added!',
            `Added 1 Staple Box with 5 fresh harvest items (${swapsCount} swap${swapsCount === 1 ? '' : 's'} made) to your cart.`
          );
        }}
      />

      {/* Custom Box Step-by-Step Builder (Min 4 crops, initially ₹0, dynamic database pricing) */}
      <CustomBoxBuilderModal
        visible={showCustomBuilder}
        onClose={() => setShowCustomBuilder(false)}
        products={products}
        onAddToCart={(customBoxItem) => {
          addToCart(
            {
              id: customBoxItem.id,
              name: customBoxItem.name,
              slug: 'custom-basket',
              price: customBoxItem.price,
              market_price: customBoxItem.market_price || Math.round(customBoxItem.price * 1.25),
              unit: 'box',
              image_url: customBoxItem.image_url,
              category: 'Farm Boxes',
              customizedItems: customBoxItem.customizedItems,
            },
            1
          );
          Alert.alert(
            'Custom Box Added!',
            `Added 1 Custom Harvest Box with ${customBoxItem.customizedItems.length} fresh crops (₹${customBoxItem.price}) to your cart.`
          );
        }}
      />

      {/* ── SCREEN 10: CART & CHECKOUT MODAL ── */}
      <Modal visible={showCheckout} animationType="slide">
        <CartCheckoutModal
          currentAddress={selectedAddress}
          customerName={userName || fullNameInput || 'Easy Farm Member'}
          customerPhone={phoneInput}
          customerEmail={emailInput}
          availableCoins={userCoins}
          addressItem={{
            label: 'Home',
            flatNo: flatNo || (selectedAddress ? selectedAddress.split(',')[0]?.trim() : 'Flat 302'),
            apartment: buildingName || locality || 'Tower A',
            locality: locality || 'Singapore Township',
            pincode: '500088',
            fullAddress: selectedAddress || `${flatNo}, ${buildingName}, ${locality}`,
            latitude: mapCoords.lat,
            longitude: mapCoords.lng,
            isServiceable: true,
          }}
          onUpdateCoins={(newBal) => {
            setUserCoins(newBal);
            SafeStorage.setItem('@easyfarm_user_coins', String(newBal));
          }}
          onOpenMap={() => {
            setShowCheckout(false);
            setCurrentScreen('map_confirm');
          }}
          onClose={() => setShowCheckout(false)}
          onOrderSuccess={handleOrderSuccess}
        />
      </Modal>

      {/* Order Success Popup */}
      {placedOrderId && (
        <Modal transparent animationType="fade" visible={Boolean(placedOrderId)}>
          <View style={styles.successBackdrop}>
            <View style={styles.successCard}>
              <CheckCircle2 size={48} color="#059669" />
              <Text style={styles.successTitle}>Order Confirmed!</Text>
              <Text style={styles.successId}>Order #{placedOrderId}</Text>
              <Text style={styles.successDesc}>
                Fresh vegetables reserved for Sunday harvest. Delivered to{' '}
                <Text style={{ fontWeight: '800' }}>{selectedAddress.split(',')[0]}</Text> by 6 PM.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setPlacedOrderId(null);
                  setMainTab('orders');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>View in Orders ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── PROFILE MODAL 1: EDIT PROFILE ── */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Edit Profile</Text>
                <Text style={styles.modalSheetSubtitle}>Update your personal & delivery details</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowEditProfileModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInputBox}
                  value={editNameInput}
                  onChangeText={setEditNameInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone</Text>
                <TextInput
                  style={styles.textInputBox}
                  value={editPhoneInput}
                  onChangeText={setEditPhoneInput}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Email (Linked)</Text>
                <View style={[styles.textInputBox, { backgroundColor: '#f1f5f9', justifyContent: 'center' }]}>
                  <Text style={{ color: '#64748b', fontSize: 14 }}>{emailInput || 'customer@easyfarm.co.in'}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Email is locked to your Easy Farm order history.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={async () => {
                const trimmedName = editNameInput.trim();
                if (trimmedName) {
                  setUserName(trimmedName);
                  await SafeStorage.setItem('@easyfarm_customer_name', trimmedName);
                }
                if (editPhoneInput.trim()) {
                  setPhoneInput(editPhoneInput.trim());
                  await SafeStorage.setItem('@easyfarm_customer_phone', editPhoneInput.trim());
                }
                setShowEditProfileModal(false);
                Alert.alert('Profile Updated', 'Your profile details have been saved.');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 2: SAVED ADDRESSES ── */}
      <Modal visible={showSavedAddressModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Saved Addresses</Text>
                <Text style={styles.modalSheetSubtitle}>Doorstep delivery location for Sunday harvest</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowSavedAddressModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.savedAddressCard}>
                <View style={styles.savedAddressBadgeRow}>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT SUNDAY DROP</Text>
                  </View>
                  <MapPin size={16} color="#059669" />
                </View>
                <Text style={styles.savedAddressTitle}>
                  {selectedAddress.split(',')[0]}
                </Text>
                <Text style={styles.savedAddressDetails}>
                  {selectedAddress}
                </Text>
                {(Boolean(flatNo) || Boolean(landmark)) && (
                  <View style={styles.savedFlatBadge}>
                    <Text style={styles.savedFlatText}>
                      🏠 {[flatNo ? `Flat ${flatNo}` : '', landmark].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                )}
                <View style={styles.sundaySlotPill}>
                  <Clock size={12} color="#065f46" />
                  <Text style={styles.sundaySlotPillText}>Slot: Sunday 4:00 PM – 6:30 PM</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => {
                setShowSavedAddressModal(false);
                setCurrentScreen('map_confirm');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>📍 Change / Pick on Google Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 3: YOUR REFUNDS ── */}
      <Modal visible={showRefundsModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Your Refunds</Text>
                <Text style={styles.modalSheetSubtitle}>Zero-questions-asked freshness guarantee</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowRefundsModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Guarantee Banner */}
              <View style={styles.refundGuaranteeCard}>
                <ShieldCheck size={28} color="#059669" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.refundGuaranteeTitle}>100% Farm Freshness Guarantee</Text>
                  <Text style={styles.refundGuaranteeDesc}>
                    Every crop is harvested fresh on Sunday morning. If any vegetable is damaged, bruised, or not up to standard, we refund or replace within 24 hours.
                  </Text>
                </View>
              </View>

              <View style={styles.refundHistoryBox}>
                <Text style={styles.refundHistoryTitle}>Active Claims & History</Text>
                <View style={styles.refundEmptyBox}>
                  <CheckCircle size={28} color="#10b981" />
                  <Text style={styles.refundEmptyText}>No active refund claims</Text>
                  <Text style={styles.refundEmptySub}>All your harvested boxes have arrived in fresh condition!</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16, backgroundColor: '#059669' }]}
              onPress={() => {
                Linking.openURL(
                  'https://wa.me/919876543210?text=Hi%20Easy%20Farm%20Team,%20I%20would%20like%20to%20request%20a%20refund%20or%20replacement%20for%20my%20order.'
                );
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>💬 Request Refund on WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 4: NOTIFICATIONS ── */}
      <Modal visible={showNotificationsModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Notifications</Text>
                <Text style={styles.modalSheetSubtitle}>Stay updated on harvest & Sunday deliveries</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowNotificationsModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 12 }}>
              {/* Toggle 1 */}
              <View style={styles.notifToggleRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.notifToggleTitle}>Sunday Harvest Reminder</Text>
                  <Text style={styles.notifToggleSub}>
                    Alerts on Friday & Saturday before orders close for Sunday morning harvest.
                  </Text>
                </View>
                <Switch
                  value={notifHarvestReminder}
                  onValueChange={setNotifHarvestReminder}
                  trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                  thumbColor={notifHarvestReminder ? '#059669' : '#f8fafc'}
                />
              </View>

              {/* Toggle 2 */}
              <View style={styles.notifToggleRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.notifToggleTitle}>Delivery & Gate Updates</Text>
                  <Text style={styles.notifToggleSub}>
                    Live SMS & push alerts when our delivery van enters your society gate.
                  </Text>
                </View>
                <Switch
                  value={notifDeliveryUpdates}
                  onValueChange={setNotifDeliveryUpdates}
                  trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                  thumbColor={notifDeliveryUpdates ? '#059669' : '#f8fafc'}
                />
              </View>

              {/* Toggle 3 */}
              <View style={[styles.notifToggleRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.notifToggleTitle}>Easy Coins & Streak Rewards</Text>
                  <Text style={styles.notifToggleSub}>
                    Celebrate weekly delivery streaks and bonus coin credits.
                  </Text>
                </View>
                <Switch
                  value={notifEasyCoins}
                  onValueChange={setNotifEasyCoins}
                  trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                  thumbColor={notifEasyCoins ? '#059669' : '#f8fafc'}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12 }]}
              onPress={() => {
                setShowNotificationsModal(false);
                Alert.alert('Preferences Saved', 'Your notification settings have been updated.');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 5: SUGGEST PRODUCTS ── */}
      <Modal visible={showSuggestProductModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Suggest Products</Text>
                <Text style={styles.modalSheetSubtitle}>Tell us what crops you want us to grow</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setShowSuggestProductModal(false);
                  setSuggestSubmitted(false);
                }}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {suggestSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <CheckCircle2 size={48} color="#059669" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 14 }}>
                  Suggestion Received!
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                  Thank you! Our agricultural planning team will evaluate this crop for upcoming harvest batches in Pocharam.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vegetable / Crop Name *</Text>
                  <TextInput
                    style={styles.textInputBox}
                    value={suggestCropName}
                    onChangeText={setSuggestCropName}
                    placeholder="e.g. Gongura, Baby Corn, Zucchini, Dragon Fruit"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes / Preferred Pack Size</Text>
                  <TextInput
                    style={[styles.textInputBox, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                    value={suggestCropNotes}
                    onChangeText={setSuggestCropNotes}
                    multiline
                    placeholder="e.g. Prefer pesticide-free 500g weekly pack..."
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.suggestTipBox}>
                  <Lightbulb size={16} color="#0d9488" />
                  <Text style={styles.suggestTipText}>
                    Crops requested by 5+ neighbors in your community get prioritized in our next seasonal crop rotation!
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={() => {
                    if (!suggestCropName.trim()) {
                      Alert.alert('Please enter crop name', 'Tell us which vegetable or green you would like us to harvest.');
                      return;
                    }
                    setSuggestSubmitted(true);
                    setTimeout(() => {
                      setShowSuggestProductModal(false);
                      setSuggestSubmitted(false);
                      setSuggestCropName('');
                      setSuggestCropNotes('');
                    }, 1800);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Submit Suggestion ➔</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 6: RATE & REVIEW ── */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Rate & Review Easy Farm</Text>
                <Text style={styles.modalSheetSubtitle}>Share your feedback & earn +20 Easy Coins</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewSubmitted(false);
                }}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {reviewSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <CheckCircle2 size={48} color="#059669" />
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 14 }}>
                  Thank You for Your Review!
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                  +20 Easy Coins credited to your rewards wallet.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                {/* 5-Star Rating */}
                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setReviewRating(star)}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={32}
                          color="#eab308"
                          fill={star <= reviewRating ? '#eab308' : 'transparent'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#065f46', marginTop: 8 }}>
                    {reviewRating === 5
                      ? '⭐⭐⭐⭐⭐ Farm Fresh & Super Crisp!'
                      : reviewRating === 4
                      ? '⭐⭐⭐⭐ Good Quality & On-time'
                      : reviewRating === 3
                      ? '⭐⭐⭐ Average Experience'
                      : 'Needs Improvement'}
                  </Text>
                </View>

                {/* Feedback Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Detailed Feedback (Optional)</Text>
                  <TextInput
                    style={[styles.textInputBox, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    placeholder="Tell us about the freshness, taste, and packaging of your harvest..."
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.reviewCoinRewardBox}>
                  <Text style={styles.reviewCoinRewardText}>🪙 Earn 20 Easy Coins upon submission!</Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={() => {
                    setReviewSubmitted(true);
                    const newBal = userCoins + 20;
                    setUserCoins(newBal);
                    SafeStorage.setItem('@easyfarm_user_coins', String(newBal));
                    setTimeout(() => {
                      setShowReviewModal(false);
                      setReviewSubmitted(false);
                      setReviewComment('');
                    }, 1800);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Submit Review & Claim Coins</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── PROFILE MODAL 7: HELP & SUPPORT ── */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Help & Support</Text>
                <Text style={styles.modalSheetSubtitle}>Pocharam & Ghatkesar local farm dispatch desk</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setShowHelpModal(false)}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* WhatsApp Support Row */}
              <TouchableOpacity
                style={styles.helpContactCard}
                onPress={() => {
                  Linking.openURL(
                    'https://wa.me/919876543210?text=Hi%20Easy%20Farm%20Support,%20I%20need%20help%20with%20my%20Sunday%20order.'
                  );
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.helpIconCircle, { backgroundColor: '#dcfce7' }]}>
                  <MessageSquare size={20} color="#16a34a" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.helpContactTitle}>WhatsApp Farm Support</Text>
                  <Text style={styles.helpContactSubtitle}>Instant reply • Active 8 AM – 8 PM</Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Call Support Row */}
              <TouchableOpacity
                style={styles.helpContactCard}
                onPress={() => {
                  Linking.openURL('tel:+919876543210');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.helpIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <Phone size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.helpContactTitle}>Direct Farm Helpline</Text>
                  <Text style={styles.helpContactSubtitle}>+91 98765 43210 • Dispatch Desk</Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Email Support Row */}
              <TouchableOpacity
                style={styles.helpContactCard}
                onPress={() => {
                  Linking.openURL('mailto:support@easyfarm.in');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.helpIconCircle, { backgroundColor: '#f3e8ff' }]}>
                  <Mail size={20} color="#7c3aed" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.helpContactTitle}>Email Support</Text>
                  <Text style={styles.helpContactSubtitle}>support@easyfarm.in</Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* FAQs Section */}
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 10, letterSpacing: 0.5 }}>
                  FREQUENTLY ASKED QUESTIONS
                </Text>

                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>When is the harvest delivered?</Text>
                  <Text style={styles.faqAnswer}>
                    Every Sunday between 4:00 PM and 6:30 PM. Crops are picked from local farms Sunday morning.
                  </Text>
                </View>

                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>Can I customize my vegetable box?</Text>
                  <Text style={styles.faqAnswer}>
                    Yes! In the Shop tab, select "Build Your Custom Box" to pick any vegetables with custom quantities (250g, 500g, 1kg, bunches).
                  </Text>
                </View>

                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>What if some vegetables are not fresh?</Text>
                  <Text style={styles.faqAnswer}>
                    We back every delivery with our 100% Freshness Guarantee. Claim a refund or replacement within 24 hours via WhatsApp.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ORDER DETAIL & LIVE TRACKING MODAL ── */}
      <OrderDetailModal
        visible={showOrderDetailModal}
        order={selectedDetailOrder}
        onClose={() => setShowOrderDetailModal(false)}
        onReorder={(reorderOrder) => {
          setShowOrderDetailModal(false);
          reorderOrder.items.forEach((it) => {
            addToCart(
              {
                id: it.id,
                name: it.name,
                slug: it.name.toLowerCase().replace(/\s+/g, '-'),
                price: it.price,
                market_price: Math.round(it.price * 1.25),
                unit: it.unit || 'box',
                image_url: it.image_url || '',
                category: 'Farm Boxes',
                customizedItems: it.customizedItems,
              },
              it.quantity || 1
            );
          });
          Alert.alert(
            'Items Added to Cart',
            `Added items from Order #${reorderOrder.orderNumber} to your cart.`,
            [
              { text: 'Go to Cart', onPress: () => setShowCheckout(true) },
              { text: 'Shop More', onPress: () => setMainTab('shop') },
            ]
          );
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <CartProvider>
      <MainAppFlow />
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  whiteScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    backgroundColor: '#065f46',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#065f46',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    width: '100%',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  onboardingHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  onboardingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  onboardingHeroImg: {
    width: width * 0.85,
    height: width * 0.75,
    borderRadius: 24,
    marginBottom: 28,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#065f46',
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 32,
  },
  onboardingSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  onboardingBottom: {
    padding: 24,
  },
  authScroll: {
    padding: 24,
    alignItems: 'center',
  },
  authLogoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authLogo: {
    width: 60,
    height: 60,
  },
  authWelcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  authWelcomeSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20,
  },
  authTabWrap: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  authTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  authTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  authTabTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  authInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  authInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  authLegalText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
  },
  authSupportBtn: {
    marginTop: 24,
  },
  authSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  otpIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  otpSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 24,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  otpBoxFilled: {
    borderColor: '#065f46',
    backgroundColor: '#ecfdf5',
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 24,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerLogoSmall: {
    width: 80,
    height: 30,
  },
  locTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  locSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  useCurrentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
  },
  useCurrentLocText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 10,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  recentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  recentSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  savedAddrCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  savedAddrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  savedAddrTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  savedAddrSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  mapThumb: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  mapThumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  addrSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  addrSelectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  addrSelectedText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deliverySlotPill: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  deliverySlotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deliverToWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    marginRight: 8,
  },
  deliverToTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  deliverToAddr: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCoinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9ee',
    borderWidth: 1,
    borderColor: '#f5e6b3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headerCoinsIcon: {
    fontSize: 13,
  },
  headerCoinsText: {
    fontSize: 11.5,
    color: '#1e293b',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  homeHeroBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    height: 140,
  },
  heroTextBox: {
    padding: 16,
    width: '65%',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 22,
  },
  heroSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 16,
  },
  heroBannerImg: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 150,
    height: 150,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  homeSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  basketsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  basketCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    paddingBottom: 10,
  },
  basketImg: {
    width: '100%',
    height: 90,
  },
  basketTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  basketSub: {
    fontSize: 10,
    color: '#64748b',
    paddingHorizontal: 10,
    height: 28,
  },
  basketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  basketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  fixedPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fixedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  fixedVeggiesList: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fixedVeggieItem: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 14,
  },
  basketMarketPrice: {
    fontSize: 9,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  boxActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 2,
  },
  boxActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  boxStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    borderRadius: 8,
    padding: 2,
  },
  boxStepBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxQtyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  basketPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065f46',
  },
  basketAddBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  basketAddText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  /* Weekly Streak Card matching uploaded mockup */
  homeStreakCard: {
    backgroundColor: '#edf6ec',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8ecd5',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  homeStreakDecoLeaf: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 65,
    height: 65,
    backgroundColor: '#dbeedd',
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    transform: [{ rotate: '20deg' }],
    opacity: 0.8,
  },
  homeStreakLeft: {
    flex: 1,
    paddingRight: 8,
  },
  homeStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  homeStreakBadgeStar: {
    fontSize: 10,
  },
  homeStreakBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#064e3b',
  },
  homeStreakTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064e3b',
    lineHeight: 23,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  homeStreakSub: {
    fontSize: 11,
    color: '#4b6354',
    lineHeight: 15,
    marginTop: 4,
  },
  homeStreakDivider: {
    width: 1,
    height: 75,
    backgroundColor: '#d1e5ce',
    marginHorizontal: 12,
  },
  homeStreakRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  homeStreakCount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#064e3b',
    lineHeight: 44,
  },
  homeStreakUnit: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
    marginTop: -2,
  },
  homeStreakLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#52795d',
    marginTop: 2,
  },
  homeStreakLink: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  homeStreakLinkText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065f46',
  },
  howWorksCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  howWorksTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  howWorksSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  stepArrow: {
    color: '#cbd5e1',
    fontWeight: '800',
  },
  shopSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  shopSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  shopHeaderBox: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  shopHeaderTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  shopHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  shopHeaderSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  shopHeaderTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  shopFeaturedContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  customBoxHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  customBoxImgWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  customBoxImg: {
    width: '100%',
    height: '100%',
  },
  customBoxBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  customBoxBody: {
    padding: 16,
  },
  customBoxCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  tapToOpenBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tapToOpenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  stepDescText: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  customBoxCardDesc: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  benefitsGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: {
    fontSize: 18,
  },
  benefitTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  benefitSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  customBoxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  customBoxPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#064e3b',
  },
  customBoxPriceSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  customBoxCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#065f46',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  customBoxCtaBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
  },
  seasonalSection: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  seasonalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  seasonalSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  seasonalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seasonalCropCard: {
    width: (width - 42) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  seasonalCropImg: {
    width: '100%',
    height: 85,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  seasonalCropName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  seasonalCropRate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
    marginTop: 2,
  },
  seasonalPortionBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  seasonalPortionBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065f46',
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  guaranteeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#064e3b',
  },
  guaranteeSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  shopCatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  shopCatPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  shopCatPillActive: {
    backgroundColor: '#065f46',
  },
  shopCatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  shopCatTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  shopGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginRight: 16,
    marginBottom: 16,
  },
  prodImgWrap: {
    width: '100%',
    height: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  prodImg: {
    width: '100%',
    height: '100%',
  },
  prodName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  prodUnit: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  prodMarket: {
    fontSize: 10,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  prodBtnWrap: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  prodAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#065f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065f46',
    borderRadius: 10,
    padding: 2,
  },
  prodStepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodQty: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  floatingCartBarWrap: {
    position: 'absolute',
    bottom: 65,
    left: 16,
    right: 16,
  },
  floatingCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#065f46',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#065f46',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCartText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  /* ── MODERN ORDERS INTERFACE STYLES ── */
  ordersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  ordersHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  ordersHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  ordersRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  ordersRefreshText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  orderFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  orderFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderFilterPillActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46',
  },
  orderFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  orderFilterPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  activeHarvestHeroCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    shadowColor: '#065f46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  activeHarvestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeHarvestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeHarvestBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  activeHarvestSlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  activeHarvestOrderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  activeHarvestDestText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    marginBottom: 16,
  },
  trackerTimelineWrap: {
    position: 'relative',
    marginTop: 8,
  },
  trackerLineBackdrop: {
    position: 'absolute',
    top: 13,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  trackerStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackerStepItem: {
    alignItems: 'center',
    width: 64,
  },
  trackerStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  trackerStepDone: {
    backgroundColor: '#059669',
  },
  trackerStepCurrent: {
    backgroundColor: '#059669',
    borderWidth: 3,
    borderColor: '#a7f3d0',
  },
  trackerStepUpcoming: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  trackerStepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  trackerStepLabelActive: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    textAlign: 'center',
  },
  trackerStepSub: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 1,
  },
  emptyOrdersCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyOrdersHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyOrdersSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  emptyNextSundayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 16,
  },
  emptyNextSundayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  /* Clean Streamlined Order Cards */
  cleanOrderCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cleanOrderTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cleanOrderNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  cleanOrderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cleanOrderDateSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  cleanStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cleanStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cleanOtpCallout: {
    marginTop: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanOtpCalloutTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  cleanOtpCalloutSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  cleanOtpCalloutBadge: {
    backgroundColor: '#065f46',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cleanOtpCalloutBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  cleanOrderInfoBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    gap: 6,
  },
  cleanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cleanInfoText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  cleanOrderBottomBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleanOrderPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065f46',
  },
  cleanOrderPaySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  trackDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trackDetailsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  activeHarvestTapCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(6, 95, 70, 0.12)',
  },
  activeHarvestTapCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  modernOrderCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  modernOrderTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernOrderNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  modernOrderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modernOrderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modernOrderDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  modernOrderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065f46',
  },
  modernOrderLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernOrderLocText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  modernOrderItemsWrap: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modernOrderItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernOrderItemsCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginRight: 8,
  },
  orderItemName: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '700',
    flex: 1,
  },
  orderItemQty: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 8,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  expandedCropsBox: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expandedCropsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cropSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  cropSubName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  cropSubWeight: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginRight: 8,
  },
  cropSubPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  modernOrderBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  paidBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
  },
  paidMethodText: {
    fontSize: 11,
    color: '#64748b',
  },
  freeDeliveryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  modernOrderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  orderActionSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderActionSecondaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  orderActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#065f46',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  orderActionPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  rewardsHeroCard: {
    backgroundColor: '#fefce8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fef08a',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardsHeroBalance: {
    fontSize: 24,
    fontWeight: '900',
    color: '#713f12',
    marginTop: 8,
  },
  rewardsHeroSub: {
    fontSize: 12,
    color: '#854d0e',
    marginTop: 4,
  },
  rewardCatalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  rewardCatTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  rewardCatCost: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginLeft: 12,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 8,
  },
  navItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 3,
  },
  navTextActive: {
    color: '#065f46',
    fontWeight: '800',
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 12,
  },
  successId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  successDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 20,
  },

  /* ── PROFILE & ACTION STYLES ── */
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#065f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  editProfilePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  profileEmailText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  profileBadgeCoins: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  profileBadgeCoinsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  profileBadgeStreak: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  profileBadgeStreakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
  },
  profileSectionWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  profileSectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  profileMenuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
  appVersionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
  },

  /* ── PROFILE MODALS & FORMS ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  textInputBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  savedAddressCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  savedAddressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  defaultBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
  },
  savedAddressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  savedAddressDetails: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  savedFlatBadge: {
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  savedFlatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sundaySlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  sundaySlotPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  refundGuaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  refundGuaranteeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065f46',
  },
  refundGuaranteeDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
    lineHeight: 16,
  },
  refundHistoryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refundHistoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  refundEmptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  refundEmptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  refundEmptySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  notifToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  notifToggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  suggestTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginTop: 4,
  },
  suggestTipText: {
    flex: 1,
    fontSize: 11,
    color: '#0f766e',
    lineHeight: 16,
  },
  reviewCoinRewardBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 4,
  },
  reviewCoinRewardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  helpContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  helpIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  helpContactSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  faqCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  faqAnswer: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  modernOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  modernOtpTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modernOtpInstruction: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '500',
  },
  modernOtpCodeBox: {
    backgroundColor: '#065f46',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modernOtpCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
});
