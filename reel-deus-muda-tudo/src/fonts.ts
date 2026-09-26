import { loadFont as loadSerifFont } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSansFont } from "@remotion/google-fonts/Inter";
import { FONT_CONFIG } from "./config";

const serif = loadSerifFont(FONT_CONFIG.serif.style, {
  weights: [...FONT_CONFIG.serif.weights],
  subsets: [...FONT_CONFIG.serif.subsets],
});

const sans = loadSansFont(FONT_CONFIG.sans.style, {
  weights: [...FONT_CONFIG.sans.weights],
  subsets: [...FONT_CONFIG.sans.subsets],
});

export const serifFontFamily = serif.fontFamily;
export const sansFontFamily = sans.fontFamily;

export const waitForFonts = Promise.all([
  serif.waitUntilDone(),
  sans.waitUntilDone(),
]);
