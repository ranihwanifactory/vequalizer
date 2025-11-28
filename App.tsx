import React, { useState, useEffect, useCallback } from 'react';
import VisualizerCanvas from './components/VisualizerCanvas';
import Controls from './components/Controls';
import { Theme, VisualizerMode, AudioFilters, Track } from './types';
import { DEFAULT_THEME, PRESETS } from './constants';
import { audioController } from './services/audioService';
import { geminiService } from './services/geminiService';
import { Music, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [filters, setFilters] = useState<AudioFilters>({ bass: 0, mid: 0, treble: 0 });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Playlist State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  
  // PWA & UI State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Setup PWA prompt listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Sync fullscreen state with browser events (ESC key)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Setup audio filters
  useEffect(() => {
    audioController.setFilters(filters.bass, filters.mid, filters.treble);
  }, [filters]);

  // Handle track end (Next track logic)
  const playNextTrack = useCallback(() => {
    if (tracks.length === 0 || !currentTrackId) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      handleSelectTrack(tracks[currentIndex + 1]);
    } else {
      // End of playlist
      setIsPlaying(false);
    }
  }, [tracks, currentTrackId]);

  // Bind audio service callback
  useEffect(() => {
    audioController.setOnEnded(playNextTrack);
  }, [playNextTrack]);


  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const newTracks: Track[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setTracks(prev => [...prev, ...newTracks]);
    
    // If no music is playing, start the first uploaded one immediately
    if (!isPlaying && !currentTrackId && newTracks.length > 0) {
      await handleSelectTrack(newTracks[0]);
    } else if (newTracks.length > 0 && !isPlaying) {
       await handleSelectTrack(newTracks[0]);
    }
  };

  const handleSelectTrack = async (track: Track) => {
    try {
      setCurrentTrackId(track.id);
      await audioController.setupFile(track.file);
      // Ensure state update is synced
      setIsPlaying(true); 
      setError(null);
    } catch (err) {
      console.error(err);
      setError("오디오 파일을 재생하는 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks(prev => prev.filter(t => t.id !== id));
    if (currentTrackId === id) {
      audioController.disconnect();
      setIsPlaying(false);
      setCurrentTrackId(null);
    }
  };

  const handleMicUse = async () => {
    try {
      await audioController.setupMicrophone();
      setIsPlaying(true);
      setCurrentTrackId("MIC"); // Special ID
      setTracks([]); // Clear playlist for mic mode or keep? Let's clear to avoid confusion
      setError(null);
    } catch (err) {
      console.error(err);
      setError("마이크 접근이 거부되었거나 오류가 발생했습니다.");
    }
  };

  const handleTogglePlay = () => {
    if (currentTrackId === "MIC") {
       // Mic mode toggle just pauses processing essentially
       if(isPlaying) audioController.disconnect(); 
       else handleMicUse();
       return;
    }

    if (isPlaying) {
      audioController.pause();
    } else {
      // If no track selected but we have tracks, play first
      if (!currentTrackId && tracks.length > 0) {
        handleSelectTrack(tracks[0]);
        return;
      }
      audioController.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAiTheme = async (description: string) => {
    setIsAiLoading(true);
    const result = await geminiService.generateTheme(description);
    setIsAiLoading(false);

    if (result) {
      setTheme({
        name: result.themeName,
        colors: result.colorPalette,
        backgroundColor: "#050505",
        backgroundImage: undefined, // Reset BG image on new AI theme
        mode: VisualizerMode[result.suggestedMode] || VisualizerMode.BARS,
        speed: 1.0
      });
    } else {
      setError("AI 테마 생성에 실패했습니다. API 키를 확인해주세요.");
    }
  };

  const handleBgUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setTheme(prev => ({
      ...prev,
      backgroundImage: url
    }));
  };

  const handleManualColorChange = (index: number, color: string) => {
    const newColors = [...theme.colors];
    newColors[index] = color;
    setTheme(prev => ({
      ...prev,
      colors: newColors,
      name: "Custom Theme"
    }));
  };

  const currentTrackName = currentTrackId === "MIC" 
    ? "Live Microphone Input" 
    : tracks.find(t => t.id === currentTrackId)?.file.name || "No Track Selected";

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden selection:bg-purple-500 selection:text-white">
      
      {/* Background Image Layer */}
      {theme.backgroundImage && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${theme.backgroundImage})`, opacity: 0.6 }}
        ></div>
      )}

      {/* Visualizer Layer */}
      <VisualizerCanvas theme={theme} isActive={isPlaying} />

      {/* Header Info - Hide in Fullscreen if user wants? Or keep minimal. Keeping for now. */}
      {!isFullscreen && (
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div>
             <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-sm">
               PRISM WAVE
             </h1>
             <div className="flex items-center gap-2 mt-2 text-sm text-gray-300 font-medium">
                <Music size={14} className={isPlaying ? "animate-pulse text-purple-400" : ""} />
                <span className="drop-shadow-md">{currentTrackName}</span>
             </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest drop-shadow-md">Current Theme</p>
            <p className="text-lg font-medium text-white drop-shadow-md">{theme.name}</p>
            <div className="flex gap-1 justify-end mt-1">
              {theme.colors.map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-full shadow-sm border border-white/10" style={{ backgroundColor: c }}></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm animate-bounce-short z-50">
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold hover:text-black">×</button>
        </div>
      )}

      {/* Loading Overlay */}
      {isAiLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="flex flex-col items-center">
             <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-4 text-purple-200 font-medium animate-pulse">AI가 음악 분위기를 분석하여 테마를 생성 중입니다...</p>
           </div>
        </div>
      )}

      {/* Main Controls */}
      <Controls 
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onFilesUpload={handleFilesUpload}
        onMicUse={handleMicUse}
        onThemeChange={handleAiTheme}
        onManualColorChange={handleManualColorChange}
        onBgUpload={handleBgUpload}
        filters={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        currentTheme={theme}
        onModeChange={(m) => setTheme(prev => ({ ...prev, mode: m }))}
        isGeneratingTheme={isAiLoading}
        tracks={tracks}
        currentTrackId={currentTrackId}
        onSelectTrack={handleSelectTrack}
        onRemoveTrack={handleRemoveTrack}
        installPrompt={installPrompt}
        onInstall={handleInstallClick}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      
      {/* Instructions Overlay (If no track loaded) */}
      {!isPlaying && currentTrackId === null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="text-center space-y-4 max-w-lg mx-auto p-8 bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5">
            <h2 className="text-4xl font-bold text-white mb-6">음악을 시각화하세요</h2>
            <p className="text-gray-400 text-lg">
              오디오 파일을 업로드하거나 마이크를 켜서<br/>
              실시간으로 반응하는 비주얼을 경험해보세요.
            </p>
            <div className="flex justify-center gap-8 mt-8 opacity-50">
               <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border border-white/30 rounded-lg flex items-center justify-center mb-2">MP3</div>
                  <span className="text-xs">Upload</span>
               </div>
               <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border border-white/30 rounded-lg flex items-center justify-center mb-2">EQ</div>
                  <span className="text-xs">Control</span>
               </div>
               <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border border-purple-500/50 rounded-lg flex items-center justify-center mb-2 text-purple-400">AI</div>
                  <span className="text-xs">Theme</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;