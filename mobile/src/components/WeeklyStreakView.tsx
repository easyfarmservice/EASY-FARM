import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  Lock,
  Trophy,
  Sparkles,
  Gift,
  CheckCircle2,
} from 'lucide-react-native';
import { WeeklyStreakInfo } from '../services/easyCoinsService';

const { width } = Dimensions.get('window');

interface WeeklyStreakViewProps {
  streakInfo: WeeklyStreakInfo;
  userCoins: number;
  onBack?: () => void;
  onOpenCheckout?: () => void;
}

export function WeeklyStreakView({
  streakInfo,
  userCoins,
  onBack,
  onOpenCheckout,
}: WeeklyStreakViewProps) {
  const currentStreak = typeof streakInfo.currentStreak === 'number' ? streakInfo.currentStreak : 0;
  const nextMilestone = streakInfo.nextMilestoneWeeks ?? (currentStreak === 0 ? 1 : 2);
  const remainingWeeks = streakInfo.remainingWeeksForMilestone ?? (currentStreak === 0 ? 1 : 1);
  const milestoneCoins = streakInfo.milestoneCoins || 100;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── TOP HEADER MATCHING IMAGE ── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={22} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/easyfarm-logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>Easy Farm</Text>
          </View>
        </View>

        {/* Top Right Coins Pill */}
        <View style={styles.coinsPill}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinsText}>
            <Text style={{ fontWeight: '800' }}>{userCoins}</Text> Easy Coins
          </Text>
          <ChevronRight size={13} color="#64748b" />
        </View>
      </View>

      <View style={styles.contentWrap}>
        {/* ── CARD 1: WEEKLY STREAK HERO CARD ── */}
        <View style={styles.heroCard}>
          {/* Subtle Decorative Leaves Watermark in bottom right */}
          <View style={styles.decorativeLeafWrap} pointerEvents="none">
            <View style={styles.decoLeaf1} />
            <View style={styles.decoLeaf2} />
          </View>

          {/* Left Column: Badge & Title */}
          <View style={styles.heroLeft}>
            <View style={styles.streakBadge}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.streakBadgeText}>Weekly Streak</Text>
            </View>

            <Text style={styles.heroTitle}>
              {currentStreak === 0 ? 'Start your streak\nwith Easy Farm!' : 'Keep ordering\nwith Easy Farm!'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {currentStreak === 0
                ? 'Complete your 1st order to\nstart your weekly streak.'
                : 'Complete 1 weekly order to\nmaintain your streak.'}
            </Text>
          </View>

          {/* Vertical Divider Line */}
          <View style={styles.verticalDivider} />

          {/* Right Column: Big Streak Counter */}
          <View style={styles.heroRight}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakUnit}>{currentStreak === 1 ? 'Week' : 'Weeks'}</Text>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
        </View>

        {/* ── CARD 2: YOUR STREAK JOURNEY TIMELINE ── */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>Your Streak Journey</Text>
            <TouchableOpacity
              onPress={onOpenCheckout}
              activeOpacity={0.7}
              style={styles.viewRewardsBtn}
            >
              <Text style={styles.viewRewardsText}>View Rewards</Text>
              <ChevronRight size={14} color="#065f46" />
            </TouchableOpacity>
          </View>

          {/* 5-Node Timeline with Connecting Track */}
          <View style={styles.timelineRow}>
            {/* Background connecting line */}
            <View style={styles.timelineTrackBackground}>
              {/* Green active progress portion */}
              <View
                style={[
                  styles.timelineTrackActive,
                  { width: currentStreak <= 0 ? '0%' : `${((Math.min(currentStreak, 5) - 1) / 4) * 100}%` },
                ]}
              />
            </View>

            {[1, 2, 3, 4, 5].map((week) => {
              const isCompleted = week <= currentStreak;

              return (
                <View key={week} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted ? styles.stepCircleCompleted : styles.stepCircleLocked,
                    ]}
                  >
                    {isCompleted ? (
                      <ShoppingBag size={18} color="#2e7d32" strokeWidth={2.4} />
                    ) : (
                      <Lock size={16} color="#64748b" strokeWidth={2.2} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCompleted ? styles.stepLabelCompleted : styles.stepLabelLocked,
                    ]}
                  >
                    Week {week}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── CARD 3: NEXT MILESTONE CARD ── */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneTrophyWrap}>
            <View style={styles.trophyCircle}>
              <Trophy size={24} color="#059669" strokeWidth={2.4} />
            </View>
            <Sparkles size={14} color="#eab308" style={styles.sparkleIcon} />
          </View>

          <View style={styles.milestoneInfo}>
            <Text style={styles.milestoneTag}>Next Milestone</Text>
            <Text style={styles.milestoneTitle}>{nextMilestone} Weeks Streak</Text>
            <Text style={styles.milestonePerk}>Get {milestoneCoins} Easy Coins</Text>
          </View>

          <View style={styles.moreWeeksPill}>
            <ShoppingBag size={13} color="#166534" />
            <Text style={styles.moreWeeksText}>
              {remainingWeeks} more {remainingWeeks === 1 ? 'week' : 'weeks'}
            </Text>
          </View>
        </View>

        {/* ── PHYSICAL REWARDS REDEMPTION CATALOG ── */}
        <View style={styles.rewardsCatalogSection}>
          <View style={styles.catalogHeader}>
            <View>
              <Text style={styles.catalogTitle}>Redeem Your Easy Coins</Text>
              <Text style={styles.catalogSubtitle}>Physical essentials added free to your delivery</Text>
            </View>
            <View style={styles.catalogBadge}>
              <Gift size={13} color="#065f46" />
              <Text style={styles.catalogBadgeText}>Active Rewards</Text>
            </View>
          </View>

          <View style={styles.rewardsGrid}>
            {[
              {
                id: 'rew-kitchen-box',
                name: 'Kitchen Storage Box',
                coins: 200,
                desc: 'Airtight container for spices & herbs',
                icon: '🍱',
                category: 'Kitchen Essentials',
              },
              {
                id: 'rew-dabur-red',
                name: 'Dabur Red Toothpaste (100g)',
                coins: 40,
                desc: 'Herbal ayurvedic gum protection',
                icon: '🪥',
                category: 'Oral Care',
              },
              {
                id: 'rew-parachute',
                name: 'Parachute Coconut Oil (100ml)',
                coins: 45,
                desc: '100% pure filtered coconut oil',
                icon: '🥥',
                category: 'Personal Care',
              },
              {
                id: 'rew-colgate',
                name: 'Colgate Strong Teeth (100g)',
                coins: 40,
                desc: 'Calcium boost cavity protection',
                icon: '✨',
                category: 'Oral Care',
              },
              {
                id: 'rew-toothbrush',
                name: 'Oral-B Soft Toothbrush',
                coins: 25,
                desc: 'Gentle interdental massager bristles',
                icon: '🪥',
                category: 'Oral Care',
              },
              {
                id: 'rew-seed-kit',
                name: 'Organic Seed Starter Kit',
                coins: 150,
                desc: 'Palak & coriander seeds for home',
                icon: '🌱',
                category: 'Balcony Garden',
              },
            ].map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardTop}>
                  <Text style={styles.rewardEmoji}>{reward.icon}</Text>
                  <View style={styles.rewardCostPill}>
                    <Text style={styles.rewardCostText}>🪙 {reward.coins}</Text>
                  </View>
                </View>

                <Text style={styles.rewardName} numberOfLines={2}>
                  {reward.name}
                </Text>
                <Text style={styles.rewardDesc} numberOfLines={2}>
                  {reward.desc}
                </Text>

                <View style={styles.rewardFooter}>
                  <Text style={styles.rewardCategory}>{reward.category}</Text>
                  <TouchableOpacity
                    style={styles.claimHintBtn}
                    onPress={onOpenCheckout}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.claimHintText}>Claim in Cart ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImg: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fef08a',
    gap: 4,
  },
  coinIcon: {
    fontSize: 14,
  },
  coinsText: {
    fontSize: 12.5,
    color: '#1e293b',
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  /* ── CARD 1: HERO STREAK ── */
  heroCard: {
    backgroundColor: '#edf6ec',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d8ecd5',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeLeafWrap: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    width: 90,
    height: 90,
  },
  decoLeaf1: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 60,
    height: 60,
    backgroundColor: '#dbeedd',
    borderTopLeftRadius: 50,
    borderBottomRightRadius: 50,
    transform: [{ rotate: '25deg' }],
    opacity: 0.85,
  },
  decoLeaf2: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 42,
    height: 42,
    backgroundColor: '#cce6cf',
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.65,
  },
  heroLeft: {
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  starIcon: {
    fontSize: 11,
  },
  streakBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#064e3b',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#064e3b',
    lineHeight: 27,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#4b6354',
    lineHeight: 17,
    marginTop: 6,
  },
  verticalDivider: {
    width: 1,
    height: 90,
    backgroundColor: '#d1e5ce',
    marginHorizontal: 16,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#064e3b',
    lineHeight: 52,
  },
  streakUnit: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064e3b',
    marginTop: -2,
  },
  streakLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#52795d',
    marginTop: 2,
  },
  /* ── CARD 2: JOURNEY TIMELINE ── */
  journeyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewRewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewRewardsText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065f46',
  },
  timelineRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTrackBackground: {
    position: 'absolute',
    top: 22,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    zIndex: 0,
  },
  timelineTrackActive: {
    height: 3,
    backgroundColor: '#2e7d32',
    borderRadius: 2,
  },
  timelineStep: {
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleCompleted: {
    backgroundColor: '#eaf5ea',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  stepCircleLocked: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  stepLabel: {
    fontSize: 11,
  },
  stepLabelCompleted: {
    color: '#0f172a',
    fontWeight: '700',
  },
  stepLabelLocked: {
    color: '#64748b',
    fontWeight: '500',
  },
  /* ── CARD 3: MILESTONE ── */
  milestoneCard: {
    backgroundColor: '#f4fbf3',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0f2de',
    padding: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneTrophyWrap: {
    position: 'relative',
    marginRight: 14,
  },
  trophyCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eaf5ea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  sparkleIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  milestoneTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  milestonePerk: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  moreWeeksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  moreWeeksText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#166534',
  },
  /* ── REWARDS CATALOG ── */
  rewardsCatalogSection: {
    marginTop: 22,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catalogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  catalogSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  catalogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  catalogBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065f46',
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  rewardCard: {
    width: (width - 42) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardCostPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  rewardCostText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  rewardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    minHeight: 34,
  },
  rewardDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    minHeight: 28,
  },
  rewardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  rewardCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  claimHintBtn: {
    alignSelf: 'flex-start',
  },
  claimHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
