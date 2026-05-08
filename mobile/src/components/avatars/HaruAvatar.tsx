/**
 * HaruAvatar — ピンク・コーラル系、ペタル耳の丸いキャラクター
 * SVG gradient IDs are unique per instance to prevent conflicts
 * when multiple avatars appear on the same screen.
 */
import React, { useRef } from "react";
import Svg, {
  Path, Ellipse, Circle, Defs, LinearGradient, Stop,
} from "react-native-svg";

interface Props {
  /** Rendered size in dp (width = height) */
  size: number;
}

export default function HaruAvatar({ size }: Props) {
  // Unique ID per instance — prevents gradient conflicts on iOS/Android
  const bodyId = useRef(`haruBody_${Math.random().toString(36).slice(2)}`).current;

  return (
    <Svg viewBox="0 0 160 160" width={size} height={size}>
      <Defs>
        <LinearGradient id={bodyId} x1="34" y1="42" x2="126" y2="118" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFB3BA" />
          <Stop offset="100%" stopColor="#FF7B8A" />
        </LinearGradient>
      </Defs>

      {/* Body */}
      <Path
        d="M80 42 C52 42 34 58 34 80 C34 104 52 118 80 118 C108 118 126 104 126 80 C126 58 108 42 80 42Z"
        fill={`url(#${bodyId})`}
      />

      {/* Petal ears */}
      <Ellipse cx="52" cy="38" rx="13" ry="18" fill="#FFC5CC" transform="rotate(-20 52 38)" />
      <Ellipse cx="52" cy="38" rx="7" ry="10"  fill="#FFAAB0" transform="rotate(-20 52 38)" />
      <Ellipse cx="108" cy="38" rx="13" ry="18" fill="#FFC5CC" transform="rotate(20 108 38)" />
      <Ellipse cx="108" cy="38" rx="7" ry="10"  fill="#FFAAB0" transform="rotate(20 108 38)" />

      {/* Eyes */}
      <Circle cx="66" cy="74" r="8" fill="#1A1A2E" />
      <Circle cx="94" cy="74" r="8" fill="#1A1A2E" />
      {/* Eye highlights */}
      <Circle cx="69" cy="71" r="3" fill="white" />
      <Circle cx="97" cy="71" r="3" fill="white" />

      {/* Cheeks */}
      <Ellipse cx="57"  cy="84" rx="9" ry="6" fill="rgba(255,143,163,0.45)" />
      <Ellipse cx="103" cy="84" rx="9" ry="6" fill="rgba(255,143,163,0.45)" />

      {/* Nose */}
      <Ellipse cx="80" cy="84" rx="4" ry="3" fill="#FF5A5F" />

      {/* Smile */}
      <Path
        d="M68 92 Q80 104 92 92"
        stroke="#1A1A2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
