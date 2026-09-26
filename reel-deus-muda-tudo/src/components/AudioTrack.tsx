import React from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { AUDIO, DURATION_IN_FRAMES } from "../config";

// Trilha com fade in/out configurados em config.ts. Só é renderizado quando
// ./public/trilha.mp3 existe (ver checagem em Video.tsx / calculateMetadata).
export const AudioTrack: React.FC = () => {
  const { fps } = useVideoConfig();
  const fadeInFrames = AUDIO.fadeInSeconds * fps;
  const fadeOutFrames = AUDIO.fadeOutSeconds * fps;

  return (
    <Audio
      src={staticFile(AUDIO.fileName)}
      volume={(frame) =>
        interpolate(
          frame,
          [0, fadeInFrames, DURATION_IN_FRAMES - fadeOutFrames, DURATION_IN_FRAMES],
          [0, AUDIO.volume, AUDIO.volume, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};
