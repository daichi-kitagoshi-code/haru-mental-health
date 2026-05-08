// ── HARU BRAND COLORS ──────────────────────────────────────
export const C = {
  // Brand palette
  coral:  "#FF5A5F",   // Primary — warmth, energy, emotion
  rose:   "#FF8FA3",   // Secondary — soft, approachable
  sky:    "#4A90D9",   // Trust — calm, reliability
  sage:   "#52B788",   // Growth — hope, healing, spring
  gold:   "#F4A832",   // Warmth — sunlight, positivity
  ink:    "#1A1A2E",   // Foundation — grounded, stable

  // Accent aliases
  accent:       "#FF5A5F",
  accentSoft:   "rgba(255,90,95,0.10)",
  accentSofter: "rgba(255,90,95,0.06)",

  // Backgrounds
  bg:          "#FFFFFF",
  bgMist:      "#F8F6F3",
  bgSecondary: "#F5F5F7",
  bgOverlay:   "rgba(255,255,255,0.96)",

  // Borders
  border:      "#EBEBEC",
  borderLight: "#F2F2F3",

  // Text
  text:          "#1A1A2E",
  textSecondary: "#6E6E73",
  textTertiary:  "#AEAEB2",

  // Status
  online: "#52B788",
  purple: "#4A90D9",

  // Fixed
  white:  "#FFFFFF",
  black:  "#1A1A2E",
  shadow: "#000000",
} as const;

// Gradients
export const GRAD: [string, string] = [C.rose, C.coral];
export const GRAD_3: [string, string, string] = [C.rose, C.coral, "#FF385C"];
export const GRAD_SPRING: [string, string] = [C.sage, C.sky];
export const GRAD_WARM: [string, string] = ["#FFB347", C.coral];
export const GRAD_SKY: [string, string, string] = ["#FFF0F3", "#F0EEFF", "#E8F4FF"];
