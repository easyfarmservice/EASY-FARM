import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  MapPin,
  Sparkles,
  Phone,
  MessageCircle,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Plus,
  HelpCircle,
  Leaf,
  CheckCircle2,
} from 'lucide-react-native';
import { Colors } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getSavedAddresses, SavedAddressItem } from '../../src/services/addressStorage';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddressItem[]>([]);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    const list = await getSavedAddresses();
    setAddresses(list);
  };

  const handleWhatsApp = () => {
    const url = 'https://wa.me/919951767700?text=Hi%20Easy%20Farm,%20I%20have%20a%20question%20about%20my%20Sunday%20delivery';
    Linking.openURL(url).catch(() => {
      Alert.alert('Support', 'Please contact Easy Farm WhatsApp support at +91 99517 67700');
    });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <User size={30} color="#ffffff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>
            {profile?.full_name || user?.email?.split('@')[0] || 'Easy Farm Member'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || 'Member of Hyderabad Growth Corridor'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Easy Coins Loyalty Banner */}
        <View style={styles.coinsCard}>
          <View style={styles.coinsLeft}>
            <View style={styles.coinsIcon}>
              <Sparkles size={20} color="#d97706" />
            </View>
            <View>
              <Text style={styles.coinsTitle}>Easy Coins Balance</Text>
              <Text style={styles.coinsBalance}>
                {profile?.easy_coins_balance || 150} Coins
              </Text>
              <Text style={styles.coinsValue}>
                Worth ₹{Math.floor((profile?.easy_coins_balance || 150) / 10)} discount on your next basket
              </Text>
            </View>
          </View>
        </View>

        {/* Saved Addresses Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Saved Delivery Addresses</Text>
            <TouchableOpacity
              style={styles.addAddressBtn}
              onPress={() => router.push('/location' as any)}
              activeOpacity={0.7}
            >
              <Plus size={14} color="#065f46" />
              <Text style={styles.addAddressBtnText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <Text style={styles.emptyText}>No saved addresses yet.</Text>
          ) : (
            addresses.map((addr) => (
              <View key={addr.id} style={styles.addressItem}>
                <MapPin size={18} color="#065f46" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{addr.label.toUpperCase()}</Text>
                  <Text style={styles.addressDetails} numberOfLines={2}>
                    {addr.flatNo ? `${addr.flatNo}, ` : ''}
                    {addr.apartment ? `${addr.apartment}, ` : ''}
                    {addr.locality} - {addr.pincode}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Active Delivery Zone Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Serviceable Corridor</Text>
          <Text style={styles.corridorSubtitle}>
            We deliver exclusively across East Hyderabad's growth corridor every Sunday:
          </Text>
          <View style={styles.corridorTags}>
            {[
              'Singapore Township',
              'Sanskruti Township',
              'Pocharam',
              'Ghatkesar',
              'Narapally',
              'Boduppal',
              'Medipally',
            ].map((area) => (
              <View key={area} style={styles.tag}>
                <CheckCircle2 size={12} color="#059669" />
                <Text style={styles.tagText}>{area}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Support & Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Support</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleWhatsApp}
            activeOpacity={0.7}
          >
            <MessageCircle size={18} color="#059669" />
            <Text style={styles.menuItemText}>Chat with Us on WhatsApp</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Easy Farm Guarantee', 'All produce is harvested at dawn on Sunday and delivered directly to your home within hours. Zero cold storage, zero artificial ripening, 100% natural.')}
            activeOpacity={0.7}
          >
            <Leaf size={18} color="#065f46" />
            <Text style={styles.menuItemText}>Our Zero Cold Storage Promise</Text>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Authentication State Button */}
        {user ? (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={16} color="#e11d48" />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/auth-login' as any)}
            activeOpacity={0.8}
          >
            <User size={16} color="#ffffff" />
            <Text style={styles.loginBtnText}>Sign In / Create Account</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>Easy Farm Native Mobile • Version 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 12,
    color: '#a7f3d0',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  coinsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 14,
  },
  coinsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coinsBalance: {
    fontSize: 20,
    fontWeight: '900',
    color: '#78350f',
    marginTop: 2,
  },
  coinsValue: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addAddressBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 2,
  },
  addressDetails: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  corridorSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 10,
  },
  corridorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  logoutBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
  loginBtn: {
    backgroundColor: '#065f46',
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
});
