import { Theme, VisualizerMode } from './types';

export const DEFAULT_THEME: Theme = {
  name: "Cyberpunk Default",
  colors: ["#00f2ff", "#00c3ff", "#ff00e6", "#8000ff", "#290038"],
  backgroundColor: "#050505",
  mode: VisualizerMode.BARS,
  speed: 1.0,
};

export const PRESETS: Theme[] = [
  DEFAULT_THEME,
  {
    name: "Oceanic Calm",
    colors: ["#0077be", "#0096c7", "#48cae4", "#90e0ef", "#caf0f8"],
    backgroundColor: "#001219",
    mode: VisualizerMode.WAVE,
    speed: 0.6,
  },
  {
    name: "Fiery Energy",
    colors: ["#ff0000", "#ff4d00", "#ff7400", "#ff9a00", "#ffc100"],
    backgroundColor: "#1a0500",
    mode: VisualizerMode.CIRCLE,
    speed: 1.4,
  }
];
