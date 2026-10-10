import { Color } from "three";

/**
 * Scene colours for "Morning garden" (day) and "Night garden" (night).
 * Mirrors the poster CSS variables in globals.css so the drawing and the 3D match.
 */

const mix = (a: string, b: string, t: number) => new Color(a).lerp(new Color(b), t);

export const DAY = {
  sky: new Color("#8FD3E8"),
  paper: new Color("#F4F7F1"),
  fern: new Color("#79C48C"),
  leaf: new Color("#2F7D4F"),
  bloom: new Color("#F07A9A"),
  sun: new Color("#FFC86B"),
  hill: new Color("#3A8A59"),
  // "#FFFFFF at the top → sky at the bottom, pre-mixed 60 % over paper"
  glassTop: mix("#F4F7F1", "#FFFFFF", 0.6),
  glassBottom: mix("#F4F7F1", "#8FD3E8", 0.6),
  canopyA: new Color("#79C48C"),
  canopyB: new Color("#2F7D4F"),
  hemiSky: mix("#FFFFFF", "#8FD3E8", 0.25),
  hemiGround: mix("#FFFFFF", "#2F7D4F", 0.45),
  sunLight: new Color("#FFF4E0"),
  pollen: new Color("#FFC86B"),
};

export const NIGHT = {
  sky: new Color("#2E6F86"),
  bloom: new Color("#FF8FB0"),
  sun: new Color("#FFD27F"),
  hill: new Color("#1D4430"),
  glassTop: new Color("#1F3B44"),
  glassBottom: new Color("#0F2228"),
  canopyA: new Color("#3E7A52"),
  canopyB: new Color("#2A5A3C"),
  hemiSky: new Color("#2E6F86"),
  hemiGround: new Color("#13221A"),
  sunLight: new Color("#B9CFE8"),
  firefly: new Color("#E8FF9E"),
};
