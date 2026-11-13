'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SanityService } from '@/services/sanity.service';

interface UserProfile {
  id: string;
  auth_user_id?: string;
  full_name?: string;
  role?: string;
  email?: string;
  phone?: string;
}

interface UserSessionContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  userName: string | null;
  profile: UserProfile | null;
  coinsBalance: number;
  streakCount: number;
  coinsLoading: boolean;
  streakLoading: boolean;
  announcement: { active: boolean; text: string } | null;
  refreshCoins: () => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextType>({
  isLoggedIn: false,
  isAdmin: false,
  userName: null,
  profile: null,
  coinsBalance: 150,
  streakCount: 0,
  coinsLoading: false,
  streakLoading: false,
  announcement: null,
  refreshCoins: async () => {},
  refreshStreak: async () => {},
  refreshUser: async () => {},
});

export function useUserSession() {
  return useContext(UserSessionContext);
}

// In-memory cache for announcement so page transitions never re-fetch Sanity
let cachedAnnouncement: { active: boolean; text: string } | null = null;
let announcementFetched = false;

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [coinsBalance, setCoinsBalance] = useState<number>(150);
  const [coinsLoading, setCoinsLoading] = useState(true);

  const [streakCount, setStreakCount] = useState<number>(0);
  const [streakLoading, setStreakLoading] = useState(true);

  const [announcement, setAnnouncement] = useState<{ active: boolean; text: string } | null>(cachedAnnouncement);

  // Load and cache announcement
  useEffect(() => {
    if (announcementFetched) return;
    announcementFetched = true;
    SanityService.getSiteSettings()
      .then((settings) => {
        if (settings?.announcementActive && settings?.announcementText) {
          const val = { active: true, text: settings.announcementText };
          cachedAnnouncement = val;
          setAnnouncement(val);
        }
      })
      .catch(() => null);
  }, []);

  // Fetch Coins Balance
  const fetchCoins = useCallback(async (customerId?: string) => {
    try {
      setCoinsLoading(true);
      const url = customerId
        ? `/api/easy-coins/balance?customerId=${encodeURIComponent(customerId)}`
        : '/api/easy-coins/balance';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.available_balance === 'number') {
          setCoinsBalance(data.available_balance);
        }
      }
    } catch {
      // Fallback stays as default 150
    } finally {
      setCoinsLoading(false);
    }
  }, []);

  // Fetch Streak
  const fetchStreak = useCallback(async (customerId?: string) => {
    try {
      setStreakLoading(true);
      const url = customerId
        ? `/api/weekly-streak/status?customerId=${encodeURIComponent(customerId)}`
        : '/api/weekly-streak/status';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.streak && typeof data.streak.current_streak === 'number') {
          setStreakCount(data.streak.current_streak);
        }
      }
    } catch {
      // Fallback stays 0
    } finally {
      setStreakLoading(false);
    }
  }, []);

  // Main Auth and Profile Loader (runs once on mount, and on authStateChange)
  const refreshUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        const fallbackName =
          user.user_metadata?.full_name ||
          user.user_metadata?.fullName ||
          user.email?.split('@')[0] ||
          'Customer';
        setUserName(fallbackName);

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id, role, full_name, email, phone')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        let resolvedId = user.id;
        if (profileRow) {
          setProfile(profileRow);
          resolvedId = profileRow.id || user.id;
          if (profileRow.full_name) {
            setUserName(profileRow.full_name.trim());
          }
          if (profileRow.role === 'admin' || user.email?.endsWith('@easyfarm.in')) {
            setIsAdmin(true);
          }
        }

        // Parallel fetch of rewards balances
        await Promise.all([fetchCoins(resolvedId), fetchStreak(resolvedId)]);
      } else {
        // Fallback for localStorage demo sessions
        if (typeof window !== 'undefined') {
          const demoUserStr = localStorage.getItem('easyfarm_user');
          if (demoUserStr) {
            try {
              const demoUser = JSON.parse(demoUserStr);
              setIsLoggedIn(true);
              setUserName(demoUser.fullName || demoUser.full_name || demoUser.email?.split('@')[0] || 'Customer');
              if (demoUser.email?.includes('admin')) {
                setIsAdmin(true);
              }
              const customerId = demoUser.id || undefined;
              await Promise.all([fetchCoins(customerId), fetchStreak(customerId)]);
              return;
            } catch {}
          }
        }
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUserName(null);
        setProfile(null);
        setCoinsLoading(false);
        setStreakLoading(false);
      }
    } catch (err) {
      console.warn('[UserSessionProvider] Error checking auth:', err);
      setCoinsLoading(false);
      setStreakLoading(false);
    }
  }, [fetchCoins, fetchStreak]);

  useEffect(() => {
    refreshUser();

    // Subscribe to auth state changes to avoid polling
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        refreshUser();
      }
    });

    // Custom browser events to synchronize state without full page reload
    const handleCoinsUpdate = () => {
      fetchCoins(profile?.id);
    };
    const handleStreakUpdate = () => {
      fetchStreak(profile?.id);
    };

    window.addEventListener('easycoins-updated', handleCoinsUpdate);
    window.addEventListener('weekly-streak-updated', handleStreakUpdate);
    window.addEventListener('storage', handleCoinsUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('easycoins-updated', handleCoinsUpdate);
      window.removeEventListener('weekly-streak-updated', handleStreakUpdate);
      window.removeEventListener('storage', handleCoinsUpdate);
    };
  }, [refreshUser, fetchCoins, fetchStreak, profile?.id]);

  const refreshCoinsWrapper = useCallback(async () => {
    await fetchCoins(profile?.id);
  }, [fetchCoins, profile?.id]);

  const refreshStreakWrapper = useCallback(async () => {
    await fetchStreak(profile?.id);
  }, [fetchStreak, profile?.id]);

  const contextValue = useMemo(
    () => ({
      isLoggedIn,
      isAdmin,
      userName,
      profile,
      coinsBalance,
      streakCount,
      coinsLoading,
      streakLoading,
      announcement,
      refreshCoins: refreshCoinsWrapper,
      refreshStreak: refreshStreakWrapper,
      refreshUser,
    }),
    [
      isLoggedIn,
      isAdmin,
      userName,
      profile,
      coinsBalance,
      streakCount,
      coinsLoading,
      streakLoading,
      announcement,
      refreshCoinsWrapper,
      refreshStreakWrapper,
      refreshUser,
    ]
  );

  return <UserSessionContext.Provider value={contextValue}>{children}</UserSessionContext.Provider>;
}

