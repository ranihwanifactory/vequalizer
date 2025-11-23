export enum VisualizerMode {
  BARS = 'BARS',
  WAVE = 'WAVE',
  CIRCULAR = 'CIRCULAR',
  ORB = 'ORB'
}

export interface MoodAnalysis {
  mood: string;
  description: string;
  colors: string[];
  recommendedMode: VisualizerMode;
}

export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
}

export interface PlaylistTrack {
  id: string;
  url: string;
  name: string;
  file?: File;
}