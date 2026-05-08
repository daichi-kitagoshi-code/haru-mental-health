export const FONT = {
  // DM Serif Display — wordmark, headings, emotional moments
  display:   "DMSerifDisplay_400Regular",
  displayIt: "DMSerifDisplay_400Regular_Italic",

  // Instrument Sans — UI labels, numbers, English
  sans:      "InstrumentSans_400Regular",
  sansMed:   "InstrumentSans_500Medium",
  sansSemi:  "InstrumentSans_600SemiBold",
  sansBold:  "InstrumentSans_700Bold",

  // Noto Sans JP — Japanese body text, chat
  regular: "NotoSansJP_400Regular",
  medium:  "NotoSansJP_500Medium",
  bold:    "NotoSansJP_700Bold",
  black:   "NotoSansJP_900Black",

  // Legacy aliases (keep for backward compat)
  mono:      "InstrumentSans_400Regular",
  monoSemi:  "InstrumentSans_600SemiBold",
  monoBold:  "InstrumentSans_700Bold",
  monoBlack: "InstrumentSans_700Bold",
  sansBold:  "InstrumentSans_700Bold",
} as const;

export const SIZE = {
  label:      10,
  caption:    11,
  small:      12,
  body2:      13,
  body:       14,
  body1:      15,
  subtitle:   17,
  title3:     20,
  title2:     22,
  title:      26,
  largeTitle: 32,
  display:    56,
} as const;

export const LINE = {
  tight:   1.3,
  normal:  1.5,
  relaxed: 1.7,
} as const;

export const RADIUS = {
  xs:   8,
  sm:   10,
  md:   16,
  lg:   22,
  xl:   32,
  pill: 999,
} as const;

export const SHADOW = {
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  strong: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

export const SP = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;
