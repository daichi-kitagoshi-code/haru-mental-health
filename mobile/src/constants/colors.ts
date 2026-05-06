export const C = {
  // Backgrounds
  bg: "#FFFFFF",
  bgSecondary: "#F7F7F8",
  bgOverlay: "rgba(255,255,255,0.96)",

  // Borders
  border: "#EBEBEC",
  borderLight: "#F2F2F3",

  // Text
  text: "#0A0A0B",
  textSecondary: "#6E6E73",
  textTertiary: "#AEAEB2",

  // Accent
  accent: "#FF385C",
  accentSoft: "rgba(255,56,92,0.10)",
  accentSofter: "rgba(255,56,92,0.06)",

  // Gradient stops
  gradStart: "#FF6B6B",
  gradEnd: "#FF385C",

  // Status
  online: "#34C759",
  purple: "#5856D6",

  // Shadows (used as shadowColor)
  shadow: "#000000",

  // Fixed
  white: "#FFFFFF",
  black: "#0A0A0B",
} as const;

export const GRAD: [string, string] = [C.gradStart, C.gradEnd];
