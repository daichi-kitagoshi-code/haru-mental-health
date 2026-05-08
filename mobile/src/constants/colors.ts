// ── HARU FLAT NEO-BRUTALIST PALETTE ─────────────────────────
export const C = {
  // Brand
  coral:    "#FF4F5E",
  coralD:   "#E8404E",
  coralL:   "#FF8096",
  coralXL:  "#FFF0F2",
  peach:    "#FFB5BE",
  sage:     "#4CAF82",
  sky:      "#3D8EE8",
  gold:     "#F5A623",
  lavender: "#9B8FFF",

  // Neutrals
  ink:   "#111118",
  ink2:  "#6B6B78",
  ink3:  "#AEAEBB",
  snow:  "#FAFAFA",
  mist:  "#F4F3F8",
  line:  "#EBEBF0",

  // Aliases for compatibility
  accent:        "#FF4F5E",
  accentSoft:    "rgba(255,79,94,0.10)",
  accentSofter:  "rgba(255,79,94,0.06)",
  bg:            "#FFFFFF",
  bgSecondary:   "#F4F3F8",
  bgMist:        "#F4F3F8",
  bgOverlay:     "rgba(255,255,255,0.96)",
  border:        "#EBEBF0",
  borderDark:    "#111118",
  text:          "#111118",
  textSecondary: "#6B6B78",
  textTertiary:  "#AEAEBB",
  online:        "#4CAF82",
  white:         "#FFFFFF",
  black:         "#111118",
  shadow:        "#111118",
} as const;

// Flat hard shadow styles (no blur)
export const FLAT = {
  sm:    { shadowColor: "#111118", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 4 },
  md:    { shadowColor: "#111118", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 6 },
  lg:    { shadowColor: "#111118", shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 8 },
  coral: { shadowColor: "#E8404E", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 5 },
  sage:  { shadowColor: "#3A9068", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 6 },
  sky:   { shadowColor: "#2B6DC4", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0.01, elevation: 6 },
} as const;

export const GRAD: [string, string] = ["#FF8096", "#FF4F5E"];
export const GRAD_2: [string, string] = [C.peach, C.coral];
export const GRAD_3: [string, string, string] = [C.peach, C.coral, C.coralD];
export const GRAD_SPRING: [string, string] = [C.sage, C.sky];
export const GRAD_WARM: [string, string] = ["#FFB347", C.coral];
export const GRAD_SKY: [string, string, string] = ["#FFF0F3", "#F0EEFF", "#E8F4FF"];
