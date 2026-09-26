import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Centralized design tokens for the Daily Ritual app.
 *
 * This is the SINGLE source of truth for colors, typography, spacing, radii,
 * and shadows. Every screen and component must read tokens from here so the
 * look-and-feel is trivially adjustable in one place. Do NOT hardcode colors,
 * font families, or magic spacing/radius values anywhere else in the app.
 *
 * The `fonts.*` values match the family names exported by the
 * `@expo-google-fonts/inter` and `@expo-google-fonts/playfair-display`
 * packages, so once those fonts are loaded (via `useFonts`) they can be
 * referenced directly as `fontFamily`.
 */

/** Warm, calm palette derived from the product's Lovable references. */
const colors = {
  /** Warm cream app background. */
  background: '#FAF8F5',
  /** Deep forest green — primary brand color. */
  primary: '#3D6B4E',
  /** A darker shade of the primary for pressed states / emphasis. */
  primaryDark: '#2F5540',
  /** Terracotta / rust sunrise accent. */
  accent: '#C8663F',
  /** Near-black, slightly warm, primary text color. */
  text: '#2B2622',
  /** Muted secondary text (captions, labels, hints). */
  textMuted: '#8A8079',
  /** Text/icon color that sits on top of the primary color. */
  onPrimary: '#FAF8F5',
  /** Card / elevated surface color (a touch lighter than the background). */
  card: '#FFFFFF',
  /** Hairline borders and dividers. */
  border: '#E8E2DA',
  /**
   * Soft green tint used to highlight free calendar gaps that can fit the
   * chosen focus block (approach A: highlight fitting gaps).
   */
  highlight: '#DCE8DE',
  /** A slightly stronger border for a highlighted (fitting) gap. */
  highlightBorder: '#9CBBA4',
} as const;

/**
 * Font family names. These strings are the family names that
 * `@expo-google-fonts` register when loaded, so they can be used directly
 * as `fontFamily` in a style once the fonts are ready.
 */
const fonts = {
  /** Elegant serif display face — used for headings / the priority hero. */
  serif: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  /** Humanist sans — used for body copy and UI. */
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

/** Font size scale (in points). */
const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const;

/**
 * Named text styles. Headings use the serif display face; body and UI use
 * Inter. Components should prefer these presets over ad-hoc font settings.
 */
const typography = {
  display: {
    fontFamily: fonts.serifBold,
    fontSize: fontSizes.display,
    lineHeight: 44,
    color: colors.text,
  } as TextStyle,
  heading: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xxl,
    lineHeight: 36,
    color: colors.text,
  } as TextStyle,
  subheading: {
    fontFamily: fonts.serif,
    fontSize: fontSizes.xl,
    lineHeight: 30,
    color: colors.text,
  } as TextStyle,
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    lineHeight: 24,
    color: colors.text,
  } as TextStyle,
  bodyMuted: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    lineHeight: 24,
    color: colors.textMuted,
  } as TextStyle,
  button: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.md,
    lineHeight: 20,
    color: colors.onPrimary,
  } as TextStyle,
  /** Small uppercase step label, e.g. "STEP 2 OF 4". */
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    color: colors.textMuted,
  } as TextStyle,
  caption: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colors.textMuted,
  } as TextStyle,
} as const;

/** Spacing scale (in points). Use for padding, margins, and gaps. */
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Corner radii. */
const radii = {
  chip: 999,
  button: 14,
  card: 20,
} as const;

/** Soft, diffuse shadow presets (iOS + Android elevation). */
const shadows = {
  soft: {
    shadowColor: '#2B2622',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  } as ViewStyle,
  card: {
    shadowColor: '#2B2622',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  } as ViewStyle,
} as const;

/** The single theme object the rest of the app reads from. */
const theme = {
  colors,
  fonts,
  fontSizes,
  typography,
  spacing,
  radii,
  shadows,
} as const;

export type Theme = typeof theme;

export default theme;
