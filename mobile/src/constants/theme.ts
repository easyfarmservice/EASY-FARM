/**
 * Easy Farm Native Mobile Theme
 * Matches the website's brand tokens and color palette.
 */

export const Colors = {
  // Brand Greens
  primary: '#065f46', // Emerald 800 - Main Easy Farm brand
  primaryDark: '#064e3b', // Emerald 900
  primaryLight: '#059669', // Emerald 600
  accent: '#10b981', // Emerald 500
  accentSoft: '#ecfdf5', // Emerald 50 - Card highlights & badges
  accentBorder: '#a7f3d0', // Emerald 200

  // Neutrals & Surfaces
  background: '#f8fafc', // Slate 50
  card: '#ffffff',
  surfaceSubtle: '#f1f5f9', // Slate 100
  border: '#e2e8f0', // Slate 200
  borderDark: '#cbd5e1', // Slate 300

  // Typography
  text: '#0f172a',
  textPrimary: '#0f172a', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8', // Slate 400
  textOnPrimary: '#ffffff',

  // Semantic Status
  success: '#16a34a', // Green 600
  successSoft: '#dcfce7',
  warning: '#f59e0b', // Amber 500
  warningSoft: '#fef3c7',
  error: '#dc2626', // Red 600
  errorSoft: '#fee2e2',

  // Interactive
  ripple: 'rgba(6, 95, 70, 0.1)',
} as const;

export const Typography = {
  headingLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  headingMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  headingSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  bodyRegular: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

