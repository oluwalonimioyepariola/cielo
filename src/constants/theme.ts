/**
 * Cielo design tokens:
 * cream canvas + warm charcoal ink, one twilight accent, flat surfaces, Nunito type.
 * Screens read these through `useTheme()` and never hard-code colors.
 */

const light = {
  // Surfaces
  canvas: '#f9f4f2', // page floor — never pure white
  surface: '#ffffff', // cards and inputs floating on the canvas
  surfaceMuted: '#f1ebe7', // pressed rows, empty progress tracks
  hairline: '#e2ded9',

  // Ink
  ink: '#2d2c2b', // every headline and body paragraph
  inkSoft: '#44423f',
  inkMuted: '#63605d', // captions and meta

  // The single accent: Cielo's twilight blue
  primary: '#4a45d1',
  primaryPressed: '#3b37a8',
  onPrimary: '#ffffff',

  // The sky field (welcome and other brand moments) and the text that sits on it
  skyField: '#4a45d1',
  onSky: '#ffffff',
  onSkySoft: '#dedcf8',

  // Lesson feedback (status colors, not CTAs)
  success: '#02873e',
  successSoft: '#e3f4ea',
  onSuccess: '#ffffff',
  danger: '#c8372f',
  dangerSoft: '#fbe6e4',
  onDanger: '#ffffff',

  // Sky mascots and decoration
  cloud: '#ffffff',
  sun: '#ffce00',
  blush: '#ffa1cc',
  sky: '#00a4ff',
  leaf: '#02873e',
  dusk: '#3b197f',
};

const dark: typeof light = {
  canvas: '#1a1918', // warm near-black, not #000
  surface: '#252322',
  surfaceMuted: '#2f2c2a',
  hairline: '#3a3735',

  ink: '#f4efec',
  inkSoft: '#d6d0cb',
  inkMuted: '#a39d98',

  // Lighter twilight to stay visible on dark; buttons on it use dark text (5.8:1).
  primary: '#8b86ff',
  primaryPressed: '#a29eff',
  onPrimary: '#1a1918',

  // At night the sky deepens.
  skyField: '#2d2a7a',
  onSky: '#ffffff',
  onSkySoft: '#c9c7ee',

  success: '#3ddc84',
  successSoft: '#173d27',
  onSuccess: '#1a1918',
  danger: '#ff6b6b',
  dangerSoft: '#4a1f1f',
  onDanger: '#1a1918',

  cloud: '#3a3735',
  sun: '#ffce00',
  blush: '#ffa1cc',
  sky: '#33b6ff',
  leaf: '#3ddc84',
  dusk: '#9b7cf0',
};

export type ThemeColors = typeof light;
export type ThemeColor = keyof ThemeColors;

export const Palette = { light, dark } as const;

/** Nunito weights loaded in the root layout. Weights 400 / 500 / 700 only. */
export const FontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  bold: 'Nunito_700Bold',
} as const;

/** Phone-sized type scale: ~40px is the ceiling for a headline on a phone. */
export const Type = {
  displayLg: { fontFamily: FontFamily.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8 },
  displayMd: { fontFamily: FontFamily.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  headingLg: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  headingMd: { fontFamily: FontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  bodyLg: { fontFamily: FontFamily.regular, fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyStrong: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodySm: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  label: { fontFamily: FontFamily.bold, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
} as const;

export type TypeVariant = keyof typeof Type;

/** Five radii, and no in-between values: each size signals a role. */
export const Radius = {
  sm: 8, // text inputs
  md: 16, // cards, chips — the house radius
  lg: 24, // feature tiles, sheets
  xl: 32, // primary button
  full: 999, // secondary pills, avatars
} as const;

export const Space = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Layout = {
  screenGutter: Space.lg,
  tapTarget: 48,
  maxContentWidth: 640,
} as const;
