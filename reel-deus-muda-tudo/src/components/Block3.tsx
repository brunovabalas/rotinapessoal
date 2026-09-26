import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, BLOCKS_FRAMES, COLORS, FONT_SIZES, SPRING_CONFIG, TEXT } from "../config";
import { sansFontFamily } from "../fonts";
import { SafeArea } from "./SafeArea";
import { DissolvingWord } from "./DissolvingWord";

// Bloco 3 (7,5s–11,5s): a frase surge normalmente e, na segunda metade do
// bloco, a palavra "crenças" se desfaz em partículas de luz e some.
export const Block3: React.FC = () => {
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

  const dissolveStartFrame = Math.round(
    BLOCKS_FRAMES.block3.duration * ANIMATION.block3.dissolveStartFraction,
  );
  const dissolveLocalFrame = Math.max(frame - dissolveStartFrame, 0);
  const dissolveSpringValue = spring({
    frame: dissolveLocalFrame,
    fps,
    config: SPRING_CONFIG.soft,
    durationInFrames: ANIMATION.block3.dissolveDurationFrames,
  });
  const dissolveProgress = interpolate(dissolveSpringValue, [0, 1], [0, 1], {
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
          gap: "14px 20px",
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {TEXT.block3.words.map((word, i) => {
          if (word === TEXT.block3.dissolve) {
            return <DissolvingWord key={i} word={word} progress={dissolveProgress} />;
          }
          return (
            <span
              key={i}
              style={{
                fontFamily: sansFontFamily,
                fontWeight: 400,
                fontSize: FONT_SIZES.sans,
                color: COLORS.textPrimary,
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
