# Reel — "Quanto mais espaço eu dou para Deus"

Vídeo vertical (1080x1920, 30fps, 15s) para Instagram Reels, feito só com
tipografia, formas e luz geradas em código com [Remotion](https://remotion.dev).

## Estrutura

```
src/
  config.ts        <- cores, fontes, tempos e parâmetros de animação (edite aqui)
  fonts.ts          <- carrega as fontes do Google via @remotion/google-fonts
  Video.tsx          <- monta o vídeo: fundo, partículas e os 4 blocos em <Sequence>
  Composition.tsx     <- registra a composição e detecta se há trilha.mp3
  Root.tsx
  components/
    Background.tsx    <- gradiente animado (preto-azulado -> amanhecer) + halo de luz
    AmbientParticles.tsx <- partículas de luz flutuando (geradas em código)
    SafeArea.tsx        <- mantém o texto fora da área de topo/base do Reels
    Block1.tsx           <- 0s–4s: frase surge, "Deus" ganha brilho
    Block2.tsx           <- 4s–7,5s: palavras entram uma a uma, de baixo pra cima
    Block3.tsx / DissolvingWord.tsx <- 7,5s–11,5s: "crenças" se desfaz em partículas
    Block4.tsx           <- 11,5s–15s: frase final estável, luz no ápice
    AudioTrack.tsx        <- trilha com fade in/out (só é usada se o arquivo existir)
```

Todos os tempos, cores, fontes e parâmetros de animação ficam em `src/config.ts`.
Ajuste ali para recalibrar sem tocar nos componentes.

## Trilha sonora (opcional)

Coloque um arquivo `trilha.mp3` em `./public/`. A composição verifica
automaticamente (em `calculateMetadata`, no `Composition.tsx`) se o arquivo
existe: se existir, ele entra com fade in/out (ver `AUDIO` em `config.ts`); se
não existir, o vídeo roda normalmente sem áudio.

## Comandos

```console
npm i
npm run dev        # abre o Remotion Studio para revisar
npx remotion render src/index.ts ReelDeusMudaTudo out/video.mp4
```

> Nesta sandbox de desenvolvimento remoto, o Chromium do Remotion não pode ser
> baixado (host bloqueado) e o proxy de rede usa um certificado próprio. Por
> isso, aqui os comandos de still/render precisam de duas flags extras:
> `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell --ignore-certificate-errors`.
> Na sua máquina local isso não é necessário.
