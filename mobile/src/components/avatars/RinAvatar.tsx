/**
 * RinAvatar — ゴールド・オレンジの丸い体、尖った狐耳、しっぽ付き
 */
import React, { useRef } from "react";
import Svg, {
  Path, Ellipse, Circle, Defs, LinearGradient, Stop,
} from "react-native-svg";

interface Props {
  size: number;
}

export default function RinAvatar({ size }: Props) {
  const bodyId = useRef(`rinBody_${Math.random().toString(36).slice(2)}`).current;

  return (
    <Svg viewBox="0 0 160 160" width={size} height={size}>
      <Defs>
        <LinearGradient id={bodyId} x1="38" y1="46" x2="122" y2="130" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFD08A" />
          <Stop offset="100%" stopColor="#F4A832" />
        </LinearGradient>
      </Defs>

      {/* Fox ears */}
      <Path d="M56 60 L42 30 L68 52Z" fill="#F4A832" />
      <Path d="M56 60 L48 38 L64 54Z" fill="#FF8FA3" />
      <Path d="M104 60 L118 30 L92 52Z" fill="#F4A832" />
      <Path d="M104 60 L112 38 L96 54Z" fill="#FF8FA3" />

      {/* Body */}
      <Circle cx="80" cy="88" r="42" fill={`url(#${bodyId})`} />

      {/* Belly fluff */}
      <Ellipse cx="80" cy="96" rx="24" ry="16" fill="rgba(255,220,150,0.5)" />

      {/* Eyes */}
      <Circle cx="66" cy="80" r="9" fill="#1A1A2E" />
      <Circle cx="94" cy="80" r="9" fill="#1A1A2E" />
      {/* Eye highlights */}
      <Circle cx="70" cy="76" r="3.5" fill="white" />
      <Circle cx="98" cy="76" r="3.5" fill="white" />

      {/* Cheeks */}
      <Ellipse cx="55"  cy="90" rx="9" ry="5.5" fill="rgba(255,143,163,0.4)" />
      <Ellipse cx="105" cy="90" rx="9" ry="5.5" fill="rgba(255,143,163,0.4)" />

      {/* Nose */}
      <Ellipse cx="80" cy="90" rx="4" ry="3" fill="#E07820" />

      {/* Smile */}
      <Path
        d="M68 98 Q80 108 92 98"
        stroke="#1A1A2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tail */}
      <Path
        d="M122 110 C140 100 145 115 135 125 C125 135 108 128 110 118 C112 112 118 108 122 110Z"
        fill="#F4A832"
      />
    </Svg>
  );
}
