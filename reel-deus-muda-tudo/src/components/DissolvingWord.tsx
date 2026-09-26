import React from "react";
import { interpolate } from "remotion";
import { ANIMATION, COLORS, FONT_SIZES } from "../config";
import { sansFontFamily } from "../fonts";
import { clamp01, randomInRange } from "../utils/random";

// Anima uma palavra se desfazendo em letras que se espalham/desaparecem e,
// simultaneamente, dispara pequenas partículas de luz saindo do mesmo lugar.
// `progress` vai de 0 (palavra intacta) a 1 (totalmente dissolvida).
export const DissolvingWord: React.FC<{ word: string; progress: number }> = ({
  word,
  progress,
}) => {
  const letters = word.split("");
  const particleCount = ANIMATION.block3.particleCount;

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span style={{ display: "inline-flex" }}>
        {letters.map((char, i) => {
          const stagger = clamp01(progress * 1.4 - i * 0.05);
          const dirX = randomInRange(i * 17 + 3, -1, 1);
          const dirY = randomInRange(i * 17 + 5, -1, 1);
          const translateX = dirX * stagger * 46;
          const translateY = dirY * stagger * 46 - stagger * 34;
          const blur = stagger * 7;
          const scale = interpolate(stagger, [0, 1], [1, 0.5]);
          const opacity = interpolate(stagger, [0, 1], [1, 0]);

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                filter: `blur(${blur}px)`,
                opacity,
                fontFamily: sansFontFamily,
                fontWeight: 400,
                fontSize: FONT_SIZES.sans,
                color: COLORS.textPrimary,
              }}
            >
              {char}
            </span>
          );
        })}
      </span>

      <span style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: particleCount }).map((_, i) => {
          const seed = i * 53 + 7;
          const angle = randomInRange(seed, 0, Math.PI * 2);
          const startDelay = randomInRange(seed + 1, 0, 0.35);
          const localProgress = clamp01((progress - startDelay) / (1 - startDelay));
          const dist = randomInRange(seed + 2, 24, ANIMATION.block3.particleSpread) * localProgress;
          const size = randomInRange(seed + 3, 2, 5);
          const opacity = interpolate(localProgress, [0, 0.2, 1], [0, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: size,
                height: size,
                borderRadius: "50%",
                background: COLORS.particle,
                opacity,
                transform: `translate(${Math.cos(angle) * dist}px, ${
                  Math.sin(angle) * dist - dist * 0.3
                }px)`,
                boxShadow: `0 0 ${size * 3}px ${size}px ${COLORS.particle}`,
              }}
            />
          );
        })}
      </span>
    </span>
  );
};
