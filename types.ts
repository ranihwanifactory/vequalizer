export enum VisualizerMode {
  BARS = 'BARS',
  WAVE = 'WAVE',
  CIRCLE = 'CIRCLE',
  PARTICLES = 'PARTICLES'
}

export interface Theme {
  name: string;
  colors: string[];
  backgroundColor: string;
  backgroundImage?: string; // New field for background image
  mode: VisualizerMode;
  speed: number; // 0.5 to 2.0
}

export interface AudioFilters {
  bass: number; // -10 to 10
  mid: number;  // -10 to 10
  treble: number; // -10 to 10
}

export interface AIThemeResponse {
  themeName: string;
  colorPalette: string[];
  suggestedMode: 'BARS' | 'WAVE' | 'CIRCLE' | 'PARTICLES';
  vibeDescription: string;
}

export interface Track {
  file: File;
  id: string;
}
