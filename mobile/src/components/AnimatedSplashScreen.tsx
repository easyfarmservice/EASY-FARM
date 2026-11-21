import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  Easing,
  TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

export function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  // Animation drivers
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const whiteFlash = useRef(new Animated.Value(1)).current; // Intense white burst on entry
  const whiteRingScale = useRef(new Animated.Value(0.75)).current; // Radiating shockwave ring
  const whiteRingOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current; // Zooms in smoothly
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Title & Tagline Flash Drivers
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(14)).current;
  const taglineFlashOpacity = useRef(new Animated.Value(0)).current; // Flashes below logo
  const taglineScale = useRef(new Animated.Value(0.9)).current;
  const taglineGlow = useRef(new Animated.Value(0)).current; // White glow pulse
  const pillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── STEP 1: Logo & White Flash Burst ──
    Animated.parallel([
      // White screen flash dissolves
      Animated.timing(whiteFlash, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Shockwave ring radiates outward
      Animated.timing(whiteRingScale, {
        toValue: 2.3,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(whiteRingOpacity, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Logo fades in and zooms with spring bounce
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // ── STEP 2: Title & "Freshness, Delivered Differently" White Flash ──
      Animated.sequence([
        // EASY FARM title slides up
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),

        // FLASH: "Freshness, Delivered Differently" flashes white & pulses
        Animated.parallel([
          Animated.timing(taglineFlashOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.spring(taglineScale, {
            toValue: 1,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.sequence([
            // Bright white flash burst
            Animated.timing(taglineGlow, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            // Settles into steady warm glow
            Animated.timing(taglineGlow, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),

        // Pill badge fade in
        Animated.timing(pillOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // ── STEP 3: Reveal App ──
        setTimeout(() => {
          Animated.timing(screenOpacity, {
            toValue: 0,
            duration: 450,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            onFinish();
          });
        }, 1100);
      });
    });
  }, [logoOpacity, logoScale, onFinish, pillOpacity, screenOpacity, taglineFlashOpacity, taglineGlow, taglineScale, titleOpacity, titleTranslateY, whiteFlash, whiteRingOpacity, whiteRingScale]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onFinish}
        style={styles.touchArea}
      >
        <View style={styles.centerBox}>
          {/* Radiating White Shockwave Aura Ring */}
          <Animated.View
            style={[
              styles.whiteAuraRing,
              {
                transform: [{ scale: whiteRingScale }],
                opacity: whiteRingOpacity,
              },
            ]}
          />

          {/* Central Circular Logo Badge */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              },
            ]}
          >
            <Image
              source={require('../../assets/easyfarm-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Brand Name */}
          <Animated.View
            style={[
              styles.titleWrap,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <Text style={styles.brandTitle}>EASY FARM</Text>
          </Animated.View>

          {/* ── FLASHING TAGLINE: Freshness, Delivered Differently ── */}
          <Animated.View
            style={[
              styles.taglineBox,
              {
                opacity: taglineFlashOpacity,
                transform: [{ scale: taglineScale }],
              },
            ]}
          >
            {/* White flash glow behind the tagline */}
            <Animated.View
              style={[
                styles.taglineFlashBackdrop,
                {
                  opacity: taglineGlow,
                },
              ]}
            />
            <Text style={styles.brandTagline}>Freshness, Delivered Differently</Text>
          </Animated.View>

          {/* Subtitle Pill Badge */}
          <Animated.View style={[styles.pillBadge, { opacity: pillOpacity }]}>
            <Text style={styles.pillText}>Harvest to Home in 12 Hours</Text>
          </Animated.View>
        </View>

        {/* Full-Screen Pure White Flash Overlay that dissipates upon entering */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.whiteFlashOverlay,
            {
              opacity: whiteFlash,
            },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#065f46', // Rich Easy Farm emerald brand background
    zIndex: 99999,
  },
  touchArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  whiteAuraRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 8,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.95,
    shadowRadius: 32,
    elevation: 20,
    top: -15,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 18,
    marginBottom: 16,
    padding: 14,
    borderWidth: 3.5,
    borderColor: '#ecfdf5',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleWrap: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
  },
  taglineBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
  },
  taglineFlashBackdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
  },
  brandTagline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff', // Radiant white
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  pillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 16,
  },
  pillText: {
    color: '#a7f3d0', // Light emerald 200
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  whiteFlashOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#ffffff',
  },
});
