import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, COLORS, FONT_SIZES, SPRING_CONFIG, TEXT } from "../config";
import { sansFontFamily } from "../fonts";
import { SafeArea } from "./SafeArea";

// Bloco 2 (4s–7,5s): as palavras entram uma a uma, cada uma com um leve
// movimento de baixo para cima, como se fossem sendo reveladas aos poucos.
export const Block2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SafeArea>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "14px 20px",
        }}
      >
        {TEXT.block2.words.map((word, i) => {
          const localFrame = Math.max(frame - i * ANIMATION.block2.wordStagger, 0);
          const entrance = spring({
            frame: localFrame,
            fps,
            config: SPRING_CONFIG.gentle,
            durationInFrames: 36,
          });
          const opacity = interpolate(entrance, [0, 1], [0, 1]);
          const translateY = interpolate(
            entrance,
            [0, 1],
            [ANIMATION.block2.riseDistance, 0],
          );

          return (
            <span
              key={i}
              style={{
                fontFamily: sansFontFamily,
                fontWeight: 400,
                fontSize: FONT_SIZES.sans,
                color: COLORS.textPrimary,
                opacity,
                transform: `translateY(${translateY}px)`,
                display: "inline-block",
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
