/**
 * KoAvatar — スカイブルーの涙滴型、長い垂れ耳、穏やかな目
 */
import React, { useRef } from "react";
import Svg, {
  Path, Ellipse, Defs, LinearGradient, Stop,
} from "react-native-svg";

interface Props {
  size: number;
}

export default function KoAvatar({ size }: Props) {
  const bodyId = useRef(`koBody_${Math.random().toString(36).slice(2)}`).current;

  return (
    <Svg viewBox="0 0 160 160" width={size} height={size}>
      <Defs>
        <LinearGradient id={bodyId} x1="44" y1="38" x2="116" y2="120" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#93C5FD" />
          <Stop offset="100%" stopColor="#4A90D9" />
        </LinearGradient>
      </Defs>

      {/* Body */}
      <Path
        d="M80 38 C58 38 44 56 44 78 C44 102 60 120 80 120 C100 120 116 102 116 78 C116 56 102 38 80 38Z"
        fill={`url(#${bodyId})`}
      />

      {/* Floppy ears */}
      <Path d="M55 55 C48 45 38 42 36 58 C34 72 44 82 52 78" fill="#BFDBFE" />
      <Path d="M105 55 C112 45 122 42 124 58 C126 72 116 82 108 78" fill="#BFDBFE" />

      {/* Half-moon calm eyes */}
      <Path d="M62 76 Q66 70 70 76" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M90 76 Q94 70 98 76" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Cheeks */}
      <Ellipse cx="58"  cy="85" rx="8" ry="5" fill="rgba(147,197,253,0.5)" />
      <Ellipse cx="102" cy="85" rx="8" ry="5" fill="rgba(147,197,253,0.5)" />

      {/* Tiny smile */}
      <Path d="M75 92 Q80 96 85 92" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Belly highlight */}
      <Ellipse cx="80" cy="105" rx="16" ry="10" fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}
