import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, COLORS, FONT_SIZES, SPRING_CONFIG, TEXT } from "../config";
import { sansFontFamily, serifFontFamily } from "../fonts";
import { SafeArea } from "./SafeArea";

// Bloco 1 (0s–4s): a frase surge suavemente e a palavra "Deus" ganha um
// brilho suave logo em seguida, como um foco de luz que se acende.
export const Block1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: SPRING_CONFIG.gentle,
    durationInFrames: 42,
  });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [30, 0]);

  const glowFrame = Math.max(frame - ANIMATION.block1.highlightDelay, 0);
  const glowSpring = spring({
    frame: glowFrame,
    fps,
    config: SPRING_CONFIG.soft,
    durationInFrames: 55,
  });
  const glowIntensity = interpolate(glowSpring, [0, 1], [0, 1], {
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
          transform: `translateY(${translateY}px)`,
        }}
      >
        {TEXT.block1.words.map((word, i) => {
          const isHighlight = word === TEXT.block1.highlight;
          return (
            <span
              key={i}
              style={{
                fontFamily: isHighlight ? serifFontFamily : sansFontFamily,
                fontWeight: isHighlight ? 700 : 400,
                fontSize: isHighlight ? FONT_SIZES.serif : FONT_SIZES.sans,
                color: isHighlight ? COLORS.textHighlight : COLORS.textPrimary,
                textShadow: isHighlight
                  ? `0 0 ${18 + glowIntensity * 46}px rgba(255, 227, 176, ${
                      0.25 + glowIntensity * 0.6
                    }), 0 0 ${8 + glowIntensity * 20}px rgba(255, 255, 255, ${
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
