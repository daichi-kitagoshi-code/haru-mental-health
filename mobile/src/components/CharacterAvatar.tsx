/**
 * CharacterAvatar
 *
 * Multi-layer colour-aura ring with a custom SVG character inside.
 * The character type (Haru / Ko / Rin) is derived from the name hash
 * so every character always gets the same mascot.
 *
 * Aura palette is also name-derived, giving each friend a unique colour feel.
 *
 * Structure:
 *   outer glow (lightest)  ← size * 1.0  (= the `size` prop)
 *   mid ring               ← 86% of outer
 *   inner accent           ← 72% of outer  (semi-transparent)
 *   SVG mascot             ← 72% of outer  (fills inner circle)
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { C } from "../constants/colors";
import HaruAvatar from "./avatars/HaruAvatar";
import KoAvatar   from "./avatars/KoAvatar";
import RinAvatar  from "./avatars/RinAvatar";

// ── Aura palettes (outer → mid → inner) ──────────────────────────────────────
type AuraTriplet = readonly [string, string, string];

const AURA_PALETTES: AuraTriplet[] = [
  ["#FFF0F2", "#FFB5BE", "#FF8096"],   // 0  coral-blush
  ["#E8F7EF", "#A8DFC4", "#4CAF82"],   // 1  sage-mint
  ["#E4F1FD", "#99C9F5", "#3D8EE8"],   // 2  sky-blue
  ["#F0EEFF", "#C8C2FF", "#9B8FFF"],   // 3  lavender
  ["#FFF4DC", "#FFC870", "#F5A623"],   // 4  gold-amber
  ["#FFE8F3", "#FFB3D1", "#FF6B9D"],   // 5  rose-pink
  ["#E0F7FA", "#80DEEA", "#26C6DA"],   // 6  teal-aqua
  ["#EDE7F6", "#B39DDB", "#7E57C2"],   // 7  purple-violet
];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function getAuraPalette(name: string): AuraTriplet {
  return AURA_PALETTES[nameHash(name) % AURA_PALETTES.length];
}

/** Haru (0) / Ko (1) / Rin (2) — consistent per character name */
function getAvatarType(name: string): 0 | 1 | 2 {
  return (nameHash(name) % 3) as 0 | 1 | 2;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Character name — determines aura colour and mascot type */
  name: string;
  /** Outer diameter of the full aura ring in dp (default 72) */
  size?: number;
  style?: object;
  /** Legacy prop — ignored; mascot is now SVG-based */
  uri?: string | null;
}

export default function CharacterAvatar({ name, size = 72, style }: Props) {
  const [outer, mid, inner] = getAuraPalette(name);
  const avatarType = getAvatarType(name);

  // Layer sizing
  const midInset   = size * 0.07;
  const innerInset = size * 0.14;
  const faceSize   = size - innerInset * 2;   // fills the inner accent ring

  const MascotComponent =
    avatarType === 0 ? HaruAvatar :
    avatarType === 1 ? KoAvatar   :
                       RinAvatar;

  return (
    <View style={[{ width: size, height: size }, style]}>

      {/* Outer glow */}
      <View style={[StyleSheet.absoluteFillObject, {
        borderRadius: size / 2, backgroundColor: outer,
      }]} />

      {/* Mid ring */}
      <View style={{
        position: "absolute",
        top: midInset, left: midInset, right: midInset, bottom: midInset,
        borderRadius: (size - midInset * 2) / 2,
        backgroundColor: mid,
      }} />

      {/* Inner accent ring (semi-transparent) */}
      <View style={{
        position: "absolute",
        top: innerInset, left: innerInset, right: innerInset, bottom: innerInset,
        borderRadius: faceSize / 2,
        backgroundColor: inner,
        opacity: 0.35,
      }} />

      {/* SVG mascot clipped to circle */}
      <View style={{
        position: "absolute",
        top: innerInset, left: innerInset,
        width: faceSize, height: faceSize,
        borderRadius: faceSize / 2,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: mid,
      }}>
        <MascotComponent size={faceSize} />
      </View>

    </View>
  );
}
