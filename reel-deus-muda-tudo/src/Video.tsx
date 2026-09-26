import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { BLOCKS_FRAMES } from "./config";
import { Background } from "./components/Background";
import { AmbientParticles } from "./components/AmbientParticles";
import { AudioTrack } from "./components/AudioTrack";
import { Block1 } from "./components/Block1";
import { Block2 } from "./components/Block2";
import { Block3 } from "./components/Block3";
import { Block4 } from "./components/Block4";

export type VideoProps = {
  hasAudio: boolean;
};

export const Video: React.FC<VideoProps> = ({ hasAudio }) => {
  return (
    <AbsoluteFill>
      <Background />
      <AmbientParticles />

      <Sequence
        from={BLOCKS_FRAMES.block1.from}
        durationInFrames={BLOCKS_FRAMES.block1.duration}
      >
        <Block1 />
      </Sequence>

      <Sequence
        from={BLOCKS_FRAMES.block2.from}
        durationInFrames={BLOCKS_FRAMES.block2.duration}
      >
        <Block2 />
      </Sequence>

      <Sequence
        from={BLOCKS_FRAMES.block3.from}
        durationInFrames={BLOCKS_FRAMES.block3.duration}
      >
        <Block3 />
      </Sequence>

      <Sequence
        from={BLOCKS_FRAMES.block4.from}
        durationInFrames={BLOCKS_FRAMES.block4.duration}
      >
        <Block4 />
      </Sequence>

      {hasAudio ? <AudioTrack /> : null}
    </AbsoluteFill>
  );
};
