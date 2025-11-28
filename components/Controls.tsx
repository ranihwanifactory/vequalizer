import React, { useState } from 'react';
import { 
  Play, Pause, Mic, Upload, Settings, 
  Wand2, Music, Download, ListMusic, Image as ImageIcon,
  Palette, Maximize2, Minimize2
} from 'lucide-react';
import { Theme, VisualizerMode, AudioFilters, Track } from '../types';
import Playlist from './Playlist';

interface ControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onFilesUpload: (files: File[]) => void;
  onMicUse: () => void;
  onThemeChange: (desc: string) => void;
  onManualColorChange: (index: number, color: string) => void;
  onBgUpload: (file: File) => void;
  filters: AudioFilters;
  onFilterChange: (key: keyof AudioFilters, val: number) => void;
  currentTheme: Theme;
  onModeChange: (mode: VisualizerMode) => void;
  isGeneratingTheme: boolean;
  tracks: Track[];
  currentTrackId: string | null;
  onSelectTrack: (track: Track) => void;
  onRemoveTrack: (id: string, e: React.MouseEvent) => void;
  installPrompt: any;
  onInstall: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying, onTogglePlay, onFilesUpload, onMicUse, onThemeChange, onManualColorChange, onBgUpload,
  filters, onFilterChange, currentTheme, onModeChange, isGeneratingTheme,
  tracks, currentTrackId, onSelectTrack, onRemoveTrack, installPrompt, onInstall,
  isFullscreen, onToggleFullscreen
}) => {
  const [showEq, setShowEq] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onThemeChange(prompt);
      setPrompt('');
      setShowAi(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 p-4 transition-all duration-300">
      
      {/* Popups Container - Flex Row for Multiple Panels */}
      <div className="flex flex-wrap items-end justify-center gap-4 mb-4 max-h-[60vh] overflow-y-auto pointer-events-auto">
        
        {/* Playlist */}
        {showPlaylist && (
          <Playlist 
            tracks={tracks}
            currentTrackId={currentTrackId}
            onSelectTrack={onSelectTrack}
            onRemoveTrack={onRemoveTrack}
          />
        )}

        {/* EQ & Settings */}
        {showEq && (
          <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md animate-fade-in-up">
            
            {/* Audio Filters */}
            <div className="mb-6">
               <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                 <Settings size={16} /> Equalizer
               </h3>
               <div className="space-y-4">
                  {Object.entries(filters).map(([key, value]) => {
                    const val = value as number;
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <span className="w-16 text-xs uppercase text-gray-400 font-bold">{key}</span>
                        <input 
                          type="range" min="-10" max="10" step="0.1" value={val}
                          onChange={(e) => onFilterChange(key as keyof AudioFilters, parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <span className="w-8 text-xs text-right text-gray-300">{val > 0 ? '+' : ''}{val.toFixed(0)}</span>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="h-px bg-white/10 my-4"></div>

            {/* Manual Theme Colors */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                <Palette size={16} /> Theme Colors
              </h3>
              <div className="flex justify-between gap-2 mb-4">
                {currentTheme.colors.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => onManualColorChange(idx, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                    />
                  </div>
                ))}
              </div>
            </div>

             <div className="h-px bg-white/10 my-4"></div>

            {/* Background Image */}
             <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                  <ImageIcon size={16} /> Background Image
                </h3>
                <label className="flex items-center justify-center w-full p-2 border border-dashed border-gray-600 rounded-lg hover:bg-white/5 cursor-pointer text-xs text-gray-400 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if(e.target.files?.[0]) onBgUpload(e.target.files[0]);
                    }}
                  />
                  <Upload size={14} className="mr-2" /> Upload Background
                </label>
             </div>
          </div>
        )}

        {/* AI Generator */}
        {showAi && (
          <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-6 w-full max-w-md animate-fade-in-up">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Wand2 size={18} className="text-purple-400" /> AI 테마 생성기
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              분위기나 장르를 입력하면 Gemini가 맞춤형 비주얼 테마를 생성합니다.
            </p>
            <form onSubmit={handleAiSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 비오는 날의 차분한 재즈..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button 
                type="submit" 
                disabled={isGeneratingTheme}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {isGeneratingTheme ? '생성 중...' : '생성'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Bar */}
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 max-w-4xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
        
        {/* Left: Input */}
        <div className="flex items-center gap-2">
           <label className="p-3 rounded-full hover:bg-white/10 cursor-pointer text-gray-300 hover:text-white transition-colors group relative">
             <input 
               type="file" accept="audio/*" multiple className="hidden" 
               onChange={(e) => {
                 if(e.target.files) onFilesUpload(Array.from(e.target.files));
               }}
             />
             <Upload size={20} />
             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black/80 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">파일 업로드</span>
           </label>
           
           <button 
             onClick={onMicUse}
             className="p-3 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors group relative"
           >
             <Mic size={20} />
             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black/80 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">마이크 사용</span>
           </button>

            {installPrompt && (
              <button 
                onClick={onInstall}
                className="p-3 rounded-full hover:bg-white/10 text-gray-300 hover:text-cyan-400 transition-colors group relative"
              >
                <Download size={20} />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black/80 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">앱 설치</span>
              </button>
            )}
        </div>

        {/* Center: Playback */}
        <div className="flex items-center gap-6">
           <button 
             onClick={onTogglePlay}
             className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
           >
             {isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" className="ml-1" size={24} />}
           </button>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-2">
            <button 
             onClick={onToggleFullscreen}
             className="p-3 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
             title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
           >
             {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
           </button>

           <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block"></div>

           <button 
             onClick={() => setShowPlaylist(!showPlaylist)}
             className={`p-3 rounded-full transition-colors ${showPlaylist ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-300'}`}
           >
             <ListMusic size={20} />
           </button>

           <button 
             onClick={() => setShowEq(!showEq)}
             className={`p-3 rounded-full transition-colors ${showEq ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-300'}`}
           >
             <Settings size={20} />
           </button>
           
           <button 
             onClick={() => setShowAi(!showAi)}
             className={`p-3 rounded-full transition-colors ${showAi ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10 text-gray-300'}`}
           >
             <Wand2 size={20} />
           </button>

           <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>

           {/* Mode Switcher */}
           <div className="flex bg-black/40 rounded-lg p-1 hidden sm:flex">
              {[VisualizerMode.BARS, VisualizerMode.WAVE, VisualizerMode.CIRCLE, VisualizerMode.PARTICLES].map(m => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`p-2 rounded-md transition-all ${currentTheme.mode === m ? 'bg-white/20 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  title={m}
                >
                  {m === VisualizerMode.BARS && <div className="w-4 h-4 flex items-end justify-between gap-[1px]"><div className="w-1 h-2 bg-current"></div><div className="w-1 h-4 bg-current"></div><div className="w-1 h-3 bg-current"></div></div>}
                  {m === VisualizerMode.WAVE && <div className="w-4 h-4 flex items-center"><div className="w-full h-[2px] bg-current rounded-full transform rotate-12"></div></div>}
                  {m === VisualizerMode.CIRCLE && <div className="w-4 h-4 border-2 border-current rounded-full"></div>}
                  {m === VisualizerMode.PARTICLES && <div className="w-4 h-4 flex items-center justify-center gap-[2px] flex-wrap"><div className="w-1 h-1 bg-current rounded-full"></div><div className="w-1 h-1 bg-current rounded-full"></div><div className="w-1 h-1 bg-current rounded-full"></div></div>}
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;