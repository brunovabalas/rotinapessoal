import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_SIZES, SPRING_CONFIG, TEXT } from "../config";
import { sansFontFamily, serifFontFamily } from "../fonts";
import { SafeArea } from "./SafeArea";

// Bloco 4 (11,5s–15s): a frase final surge e permanece centralizada e estável,
// enquanto a luz de fundo (ver Background.tsx) chega ao seu ápice.
export const Block4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: SPRING_CONFIG.gentle,
    durationInFrames: 46,
  });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [24, 0]);
  const scale = interpolate(entrance, [0, 1], [0.97, 1]);

  const glowIntensity = interpolate(entrance, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SafeArea>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "14px 22px",
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        {TEXT.block4.words.map((word, i) => {
          const isHighlight = word === TEXT.block4.highlight;
          return (
            <span
              key={i}
              style={{
                fontFamily: isHighlight ? serifFontFamily : sansFontFamily,
                fontWeight: isHighlight ? 700 : 400,
                fontSize: isHighlight ? FONT_SIZES.serif : FONT_SIZES.sans,
                color: isHighlight ? COLORS.textHighlight : COLORS.textPrimary,
                textShadow: isHighlight
                  ? `0 0 ${20 + glowIntensity * 50}px rgba(255, 227, 176, ${
                      0.3 + glowIntensity * 0.55
                    }), 0 0 ${10 + glowIntensity * 24}px rgba(255, 255, 255, ${
                      0.2 + glowIntensity * 0.35
                    })`
                  : "none",
                lineHeight: 1.25,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </SafeArea>
  );
};
