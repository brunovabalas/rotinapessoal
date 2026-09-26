import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../config";

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const mixColors = (colorA: string, colorB: string, t: number) => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

// Interpola entre as paradas de cor configuradas em config.ts, de acordo com
// o progresso (0 a 1) do vídeo inteiro.
const colorAtProgress = (progress: number) => {
  const { stops } = COLORS.background;
  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];
    if (progress >= current.at && progress <= next.at) {
      const localT = (progress - current.at) / (next.at - current.at || 1);
      return mixColors(current.color, next.color, localT);
    }
  }
  return stops[stops.length - 1].color;
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = frame / Math.max(durationInFrames - 1, 1);

  const topColor = useMemo(() => colorAtProgress(progress), [progress]);
  const bottomColor = useMemo(
    () => colorAtProgress(Math.max(progress - 0.12, 0)),
    [progress],
  );

  // O halo de luz cresce lentamente e atinge o ápice perto do bloco final.
  const glowOpacity = interpolate(
    progress,
    [0, 0.55, 0.78, 1],
    [0, 0.12, 0.6, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  ) * COLORS.glow.maxOpacity;

  const glowScale = interpolate(progress, [0, 1], [0.75, 1.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 68%, ${COLORS.glow.color} 0%, transparent 60%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />
    </AbsoluteFill>
  );
};
