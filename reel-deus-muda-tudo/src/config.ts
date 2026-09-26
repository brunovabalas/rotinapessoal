// Todos os ajustes de cor, tipografia e tempo do vídeo ficam neste arquivo.
// Edite os valores abaixo para calibrar o resultado sem mexer nos componentes.

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 15,
} as const;

export const DURATION_IN_FRAMES = VIDEO.durationInSeconds * VIDEO.fps;

// Área segura do Reels: evite colocar texto nestas faixas (topo = ícones/perfil,
// base = legenda, ações e barra de navegação do app).
export const SAFE_AREA = {
  top: 250,
  bottom: 350,
} as const;

// --- Roteiro por blocos, em segundos ---------------------------------------
export const BLOCKS_SECONDS = {
  block1: { from: 0, duration: 4 },
  block2: { from: 4, duration: 3.5 },
  block3: { from: 7.5, duration: 4 },
  block4: { from: 11.5, duration: 3.5 },
} as const;

const toFrames = (seconds: number) => Math.round(seconds * VIDEO.fps);

export const BLOCKS_FRAMES = {
  block1: {
    from: toFrames(BLOCKS_SECONDS.block1.from),
    duration: toFrames(BLOCKS_SECONDS.block1.duration),
  },
  block2: {
    from: toFrames(BLOCKS_SECONDS.block2.from),
    duration: toFrames(BLOCKS_SECONDS.block2.duration),
  },
  block3: {
    from: toFrames(BLOCKS_SECONDS.block3.from),
    duration: toFrames(BLOCKS_SECONDS.block3.duration),
  },
  block4: {
    from: toFrames(BLOCKS_SECONDS.block4.from),
    duration: toFrames(BLOCKS_SECONDS.block4.duration),
  },
} as const;

// --- Texto -------------------------------------------------------------
export const TEXT = {
  block1: {
    words: ["Quanto", "mais", "espaço", "eu", "dou", "para", "Deus"],
    highlight: "Deus",
  },
  block2: {
    words: ["mudar", "as", "coisas", "dentro", "de", "mim"],
  },
  block3: {
    words: ["mais", "longe", "eu", "fico", "das", "crenças", "que", "me", "afastam"],
    dissolve: "crenças",
  },
  block4: {
    words: ["do", "propósito", "de", "Deus", "para", "minha", "vida"],
    highlight: "Deus",
  },
} as const;

// --- Cores ---------------------------------------------------------------
// O fundo interpola destas paradas ao longo dos 15s inteiros: começa quase
// preto-azulado e termina em tom quente de amanhecer.
export const COLORS = {
  background: {
    stops: [
      { at: 0, color: "#03040a" },
      { at: 0.35, color: "#0a1226" },
      { at: 0.65, color: "#2a2340" },
      { at: 0.85, color: "#6b3a3f" },
      { at: 1, color: "#e58a4f" },
    ],
  },
  glow: {
    // cor do halo de luz que cresce em direção ao bloco final
    color: "#ffcf94",
    maxOpacity: 0.55,
  },
  textPrimary: "#f5f1e6",
  textHighlight: "#ffe3b0",
  particle: "#ffedd2",
} as const;

// --- Tipografia (@remotion/google-fonts) ---------------------------------
export const FONT_CONFIG = {
  serif: {
    weights: ["500", "600", "700"] as const,
    subsets: ["latin"] as const,
    style: "normal" as const,
  },
  sans: {
    weights: ["300", "400", "600"] as const,
    subsets: ["latin"] as const,
    style: "normal" as const,
  },
};

export const FONT_SIZES = {
  sans: 66,
  serif: 78,
} as const;

// --- Animação --------------------------------------------------------------
export const SPRING_CONFIG = {
  gentle: { damping: 200, mass: 1.4, stiffness: 110 },
  soft: { damping: 26, mass: 1, stiffness: 90 },
} as const;

export const ANIMATION = {
  block1: {
    // atraso, em frames, para o brilho de "Deus" começar depois do texto surgir
    highlightDelay: 20,
  },
  block2: {
    // intervalo em frames entre a entrada de cada palavra
    wordStagger: 6,
    riseDistance: 46,
  },
  block3: {
    // fração da duração do bloco em que a dissolução de "crenças" começa
    dissolveStartFraction: 0.45,
    dissolveDurationFrames: 40,
    particleCount: 26,
    particleSpread: 120,
  },
  particlesBackground: {
    count: 46,
    minSize: 2,
    maxSize: 6,
    minDurationFrames: 260,
    maxDurationFrames: 520,
    driftX: 60,
  },
} as const;

// --- Áudio -------------------------------------------------------------
export const AUDIO = {
  fileName: "trilha.mp3",
  volume: 0.7,
  fadeInSeconds: 1.5,
  fadeOutSeconds: 2,
} as const;
