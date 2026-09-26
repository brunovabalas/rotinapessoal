import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, COLORS, VIDEO } from "../config";
import { randomInRange } from "../utils/random";

type Particle = {
  x: number;
  size: number;
  duration: number;
  phase: number;
  driftX: number;
  maxOpacity: number;
};

const { count, minSize, maxSize, minDurationFrames, maxDurationFrames, driftX } =
  ANIMATION.particlesBackground;

// Partículas geradas em código: cada uma recebe atributos fixos (posição
// horizontal, tamanho, velocidade e fase) a partir de uma seed determinística,
// depois flutua verticalmente em loop usando interpolate().
const particles: Particle[] = Array.from({ length: count }).map((_, i) => {
  const seed = i * 97 + 13;
  return {
    x: randomInRange(seed, 4, 96),
    size: randomInRange(seed + 1, minSize, maxSize),
    duration: randomInRange(seed + 2, minDurationFrames, maxDurationFrames),
    phase: randomInRange(seed + 3, 0, 1),
    driftX: randomInRange(seed + 4, -driftX, driftX),
    maxOpacity: randomInRange(seed + 5, 0.15, 0.6),
  };
});

export const AmbientParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const globalProgress = frame / Math.max(durationInFrames - 1, 1);

  // Perto do final (amanhecer), as partículas ficam levemente mais luminosas.
  const brightnessBoost = interpolate(globalProgress, [0, 1], [0.7, 1.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rendered = useMemo(
    () =>
      particles.map((particle, i) => {
        const loopFrame = (frame + particle.phase * particle.duration) % particle.duration;
        const loopProgress = loopFrame / particle.duration;

        // Sobe lentamente de baixo para cima, com um pequeno vaivém horizontal.
        const y = interpolate(loopProgress, [0, 1], [104, -6]);
        const wobble = Math.sin(loopProgress * Math.PI * 2 + particle.phase * 10) * particle.driftX;

        const fade = interpolate(
          loopProgress,
          [0, 0.15, 0.85, 1],
          [0, 1, 1, 0],
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(${particle.x}% + ${wobble}px)`,
              top: `${y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background: COLORS.particle,
              opacity: fade * particle.maxOpacity * brightnessBoost,
              boxShadow: `0 0 ${particle.size * 2.4}px ${particle.size * 0.6}px ${COLORS.particle}`,
              filter: "blur(0.3px)",
            }}
          />
        );
      }),
    [frame, brightnessBoost],
  );

  return (
    <AbsoluteFill
      style={{ width: VIDEO.width, height: VIDEO.height, overflow: "hidden" }}
    >
      {rendered}
    </AbsoluteFill>
  );
};
