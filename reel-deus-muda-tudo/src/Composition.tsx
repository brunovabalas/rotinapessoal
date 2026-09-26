import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { AUDIO, DURATION_IN_FRAMES, VIDEO } from "./config";
import { Video, VideoProps } from "./Video";
import { waitForFonts } from "./fonts";

// Verifica em tempo de render se ./public/trilha.mp3 existe. Se existir, a
// trilha é incluída com fade in/out; caso contrário o vídeo roda sem áudio.
const calculateMetadata: CalculateMetadataFunction<VideoProps> = async () => {
  await waitForFonts;

  let hasAudio = false;
  try {
    const response = await fetch(staticFile(AUDIO.fileName), { method: "HEAD" });
    hasAudio = response.ok;
  } catch {
    hasAudio = false;
  }

  return { props: { hasAudio } };
};

export const MyComposition = () => {
  return (
    <Composition
      id="ReelDeusMudaTudo"
      component={Video}
      durationInFrames={DURATION_IN_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ hasAudio: false }}
      calculateMetadata={calculateMetadata}
    />
  );
};
