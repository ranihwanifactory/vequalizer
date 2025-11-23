import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Music, Activity, Disc, Waves, Zap, SkipForward, SkipBack, Mic2, Volume2, Loader2, Image as ImageIcon, X, ListMusic, Trash2, Maximize, Minimize } from 'lucide-react';
import { AudioState, MoodAnalysis, VisualizerMode, PlaylistTrack } from './types';
import AudioVisualizer from './components/AudioVisualizer';
import { analyzeSongMood } from './services/geminiService';

const DEMO_SONG_URL = "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3"; 
const DEMO_SONG_NAME = "Sevish - (Demo Track)";

function App() {
  // Audio Core
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // State
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 0.7
  });

  // Visualizer State
  const [mode, setMode] = useState<VisualizerMode>(VisualizerMode.BARS);
  const [aiAnalysis, setAiAnalysis] = useState<MoodAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false); 
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Derived State
  const currentTrack = playlist[currentTrackIndex];

  // --- Initialization ---
  const initAudioContext = () => {
    if (audioContextRef.current) return; // Already initialized

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048; 
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    if (audioRef.current) {
        // Disconnect old source if exists (rare case but good safety)
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.disconnect(); } catch (e) { console.warn(e); }
        }
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceNodeRef.current = source;
    }
  };

  // --- Handlers ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // FIX: Initialize context immediately on user interaction
      initAudioContext();

      const newTracks: PlaylistTrack[] = (Array.from(files) as File[]).map(file => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name.replace(/\.[^/.]+$/, ""),
        file: file
      }));

      setPlaylist(prev => {
        const updated = [...prev, ...newTracks];
        // If playlist was empty, start playing the first new track immediately
        if (prev.length === 0) {
            setCurrentTrackIndex(0);
            // We need a small timeout to let state update before playing
            setTimeout(async () => {
                if(audioRef.current) {
                    if (audioContextRef.current?.state === 'suspended') {
                        await audioContextRef.current.resume();
                    }
                    audioRef.current.play().catch(e => console.warn(e));
                    setAudioState(s => ({...s, isPlaying: true}));
                }
            }, 100);
        }
        return updated;
      });
      
      // Reset analysis for new set
      if (playlist.length === 0) {
        setAiAnalysis(null); 
      }
      
      // Open playlist drawer to show added files
      setShowPlaylist(true);
    }
  };

  const handleBgUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        setBackgroundImage(url);
    }
  };

  const loadDemo = () => {
    // Initialize context immediately
    initAudioContext();

    const demoTrack: PlaylistTrack = {
        id: 'demo-track',
        url: DEMO_SONG_URL,
        name: DEMO_SONG_NAME
    };
    
    setPlaylist(prev => {
        const exists = prev.find(t => t.id === 'demo-track');
        if (exists) return prev;
        
        const updated = [...prev, demoTrack];
        
        if (prev.length === 0) {
            setCurrentTrackIndex(0);
            setTimeout(async () => {
                if(audioRef.current) {
                    if (audioContextRef.current?.state === 'suspended') {
                        await audioContextRef.current.resume();
                    }
                    audioRef.current.play().catch(e => console.warn(e));
                }
            }, 100);
        }
        return updated;
    });
    
    // If it was already loaded but user clicked again, just play it
    if (playlist.length > 0 && playlist.find(t => t.id === 'demo-track')) {
        const idx = playlist.findIndex(t => t.id === 'demo-track');
        if (idx !== -1) playTrack(idx);
    }

    setAiAnalysis(null);
    setShowPlaylist(true);
  };

  const playTrack = async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    
    setCurrentTrackIndex(index);
    setAiAnalysis(null); // Reset analysis for new song
    setAudioState(prev => ({ ...prev, currentTime: 0, isPlaying: true }));
    
    // Wait for state to propagate then play
    setTimeout(async () => {
        if (audioRef.current) {
            if (!audioContextRef.current) initAudioContext();
            if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
            
            try {
                await audioRef.current.play();
            } catch(e) {
                console.error("Play error:", e);
            }
        }
    }, 50);
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    playTrack(nextIndex);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    playTrack(prevIndex);
  };

  const removeTrack = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setPlaylist(prev => {
        const newPlaylist = prev.filter((_, i) => i !== index);
        // Adjust current index if needed
        if (index < currentTrackIndex) {
            setCurrentTrackIndex(currentTrackIndex - 1);
        } else if (index === currentTrackIndex && newPlaylist.length > 0) {
            // If we removed current track, play the one that took its place (or the last one)
            setCurrentTrackIndex(Math.min(index, newPlaylist.length - 1));
        }
        return newPlaylist;
    });
  };

  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;

    // 1. Ensure Context exists
    if (!audioContextRef.current) {
      initAudioContext();
    }

    // 2. Ensure Context is running (browser autoplay policy fix)
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (audioState.isPlaying) {
      audioRef.current.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    } else {
      try {
        await audioRef.current.play();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      } catch (e) {
        console.error("Playback failed", e);
      }
    }
  };

  // --- Full Screen & Shortcuts ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    
    const handleKeyDown = async (e: KeyboardEvent) => {
        // Spacebar to toggle play
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent scrolling
            if (currentTrack) {
                if (audioRef.current?.paused) {
                    // Ensure audio context is ready before playing
                    if (!audioContextRef.current) initAudioContext();
                    if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
                    
                    audioRef.current?.play()
                        .then(() => setAudioState(prev => ({ ...prev, isPlaying: true })))
                        .catch(console.error);
                } else {
                    audioRef.current?.pause();
                    setAudioState(prev => ({ ...prev, isPlaying: false }));
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        document.removeEventListener('fullscreenchange', handleFsChange);
        window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]); // Re-bind if track changes to ensure latest state access if needed, though mostly ref based

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
        duration: audioRef.current!.duration || 0
      }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    setAudioState(prev => ({ ...prev, volume: val }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setAudioState(prev => ({ ...prev, currentTime: val }));
  };

  // --- AI Integration ---
  const triggerAIAnalysis = async () => {
    if (!currentTrack) return;
    setIsAnalyzing(true);
    setShowAiPanel(true);
    try {
      const result = await analyzeSongMood(currentTrack.name);
      setAiAnalysis(result);
      setMode(result.recommendedMode);
    } catch (error) {
      console.error("AI Error", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format time helper
  const fmtTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentColors = aiAnalysis ? aiAnalysis.colors : ["#06b6d4", "#8b5cf6", "#f43f5e"];

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden font-sans">
        
        {/* --- LAYER 1: Background Image --- */}
        {backgroundImage ? (
            <div 
                className="absolute inset-0 z-[-2] bg-cover bg-center transition-all duration-700 ease-in-out"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            </div>
        ) : (
            <div className="absolute inset-0 z-[-2] bg-gradient-to-b from-gray-900 via-black to-gray-900" />
        )}

        {/* --- LAYER 2: Visualizer --- */}
        {currentTrack && (
             <AudioVisualizer 
                audioRef={audioRef}
                analyserRef={analyserRef}
                dataArrayRef={dataArrayRef}
                isPlaying={audioState.isPlaying}
                colors={currentColors}
                mode={mode}
            />
        )}

        {/* --- LAYER 3: UI Overlay --- */}
        
        {/* Header / Branding */}
        <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl flex items-center justify-center">
                    <Activity className="text-cyan-400 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white/90 drop-shadow-md">SonicVision AI</h1>
                    <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Immersive Audio</p>
                </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex gap-3 pointer-events-auto">
                 {/* Background Upload Button */}
                 <label className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-all text-white" title="Change Background">
                    <ImageIcon size={18} />
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                </label>

                {/* Toggle Full Screen */}
                <button 
                    onClick={toggleFullScreen}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all text-white"
                    title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                    {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                
                {/* Toggle AI Panel */}
                <button 
                    onClick={() => setShowAiPanel(!showAiPanel)}
                    className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all ${showAiPanel ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/10 border-white/20 text-white'}`}
                >
                    <Zap size={18} />
                </button>
            </div>
        </div>

        {/* Main Playback Dock (Bottom) */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-30">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl ring-1 ring-white/5">
                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4 text-xs font-medium text-gray-400">
                    <span>{fmtTime(audioState.currentTime)}</span>
                    <input 
                        type="range" 
                        min="0" 
                        max={audioState.duration || 100} 
                        value={audioState.currentTime} 
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
                    />
                    <span>{fmtTime(audioState.duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                    {/* File & Info */}
                    <div className="hidden md:flex items-center gap-4 w-1/3">
                         <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden group">
                            {currentTrack ? (
                                <div className="absolute inset-0 bg-cyan-900/20 flex items-center justify-center">
                                     <div className="flex gap-0.5 h-4 items-end">
                                        <div className={`w-1 bg-cyan-400 animate-[bounce_1s_infinite] ${audioState.isPlaying ? '' : 'paused'}`}></div>
                                        <div className={`w-1 bg-cyan-400 animate-[bounce_1.2s_infinite] ${audioState.isPlaying ? '' : 'paused'}`}></div>
                                        <div className={`w-1 bg-cyan-400 animate-[bounce_0.8s_infinite] ${audioState.isPlaying ? '' : 'paused'}`}></div>
                                     </div>
                                </div>
                            ) : (
                                <Music className="text-gray-500" size={20} />
                            )}
                         </div>
                         <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate max-w-[150px]">{currentTrack?.name || "Select a track"}</div>
                            <div className="text-xs text-gray-400 truncate">{playlist.length > 0 ? `${currentTrackIndex + 1} / ${playlist.length}` : "No file loaded"}</div>
                         </div>
                    </div>

                    {/* Center Controls */}
                    <div className="flex items-center gap-6 justify-center w-full md:w-1/3">
                         <button onClick={prevTrack} className="text-gray-400 hover:text-white transition hover:scale-110 active:scale-95"><SkipBack size={24} /></button>
                        
                         <button 
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
                         >
                             {audioState.isPlaying ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1" />}
                         </button>
                         
                         <button onClick={nextTrack} className="text-gray-400 hover:text-white transition hover:scale-110 active:scale-95"><SkipForward size={24} /></button>
                    </div>

                    {/* Right Controls (Volume & Mode) */}
                    <div className="hidden md:flex items-center justify-end gap-4 w-1/3">
                         <div className="group flex items-center gap-2 relative">
                            <Volume2 className="text-gray-400" size={18} />
                            <div className="w-0 group-hover:w-24 overflow-hidden transition-all duration-300">
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.01" 
                                    value={audioState.volume} 
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-white/20 rounded-lg accent-white"
                                />
                            </div>
                         </div>
                         <div className="h-8 w-px bg-white/10 mx-2" />
                         
                         {/* Playlist Toggle */}
                         <button 
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className={`p-2 rounded-full transition-colors ${showPlaylist ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`} 
                            title="Playlist"
                         >
                            <ListMusic size={18} />
                         </button>

                         {/* Upload (Multiple) */}
                         <label className="p-2 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" title="Add Songs">
                            <Upload size={18} className="text-gray-300" />
                            <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
                         </label>
                    </div>
                </div>
                
                {/* Mobile Only Upload Row */}
                <div className="md:hidden mt-4 flex justify-center gap-4 pt-4 border-t border-white/10">
                    <button onClick={() => setShowPlaylist(!showPlaylist)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-xs font-bold">
                        <ListMusic size={14} /> List
                    </button>
                     <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-xs font-bold">
                        <Upload size={14} /> Add
                        <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
                     </label>
                </div>
            </div>
        </div>

        {/* Mode Selector (Floating Bottom Right) */}
        <div className="fixed bottom-32 md:bottom-8 right-6 flex flex-col gap-2 z-30">
            {Object.values(VisualizerMode).map((m) => (
                <button 
                    key={m}
                    onClick={() => setMode(m)} 
                    className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all hover:scale-110 ${
                        mode === m 
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                    title={m}
                >
                    {m === VisualizerMode.BARS && <Activity size={18} />}
                    {m === VisualizerMode.WAVE && <Waves size={18} />}
                    {m === VisualizerMode.CIRCULAR && <Disc size={18} />}
                    {m === VisualizerMode.ORB && <Zap size={18} />}
                </button>
            ))}
        </div>

        {/* Playlist Drawer (Left) */}
        <div className={`fixed top-24 left-6 w-72 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-40 ${showPlaylist ? 'translate-x-0' : '-translate-x-[150%]'}`}>
             <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[60vh]">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <ListMusic className="text-cyan-400" size={16} />
                        <span className="font-bold text-sm">Playlist ({playlist.length})</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={loadDemo} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition" title="Add Demo Track">
                            <Disc size={14} />
                        </button>
                        <button onClick={() => setShowPlaylist(false)} className="text-gray-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto custom-scrollbar p-2">
                    {playlist.length === 0 ? (
                         <div className="text-center py-8 text-gray-500 text-xs">
                            No tracks loaded.<br/>Add music to start.
                         </div>
                    ) : (
                        <div className="space-y-1">
                            {playlist.map((track, idx) => (
                                <div 
                                    key={track.id} 
                                    onClick={() => playTrack(idx)}
                                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border border-transparent ${
                                        idx === currentTrackIndex 
                                        ? 'bg-cyan-500/10 border-cyan-500/30' 
                                        : 'hover:bg-white/5 hover:border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className={`text-xs font-mono ${idx === currentTrackIndex ? 'text-cyan-400' : 'text-gray-600'}`}>
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                        <div className="overflow-hidden">
                                            <p className={`text-xs font-medium truncate ${idx === currentTrackIndex ? 'text-cyan-100' : 'text-gray-300'}`}>
                                                {track.name}
                                            </p>
                                            {idx === currentTrackIndex && audioState.isPlaying && (
                                                <p className="text-[10px] text-cyan-500 font-bold animate-pulse mt-0.5">PLAYING</p>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => removeTrack(e, idx)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
        </div>


        {/* AI Panel (Floating Right Sidebar) */}
        <div className={`fixed top-24 right-6 w-80 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-40 ${showAiPanel ? 'translate-x-0' : 'translate-x-[120%]'}`}>
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* Panel Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Zap className="text-cyan-400" size={16} />
                        <span className="font-bold text-sm">Gemini Analysis</span>
                    </div>
                    <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                     {!aiAnalysis ? (
                        <div className="text-center py-6">
                             <p className="text-gray-400 text-xs mb-4">
                                {currentTrack 
                                    ? "Analyze the current track to generate a custom visual theme." 
                                    : "Play a song to start."}
                             </p>
                             <button 
                                onClick={triggerAIAnalysis}
                                disabled={!currentTrack || isAnalyzing}
                                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-xs font-bold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                             >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Mic2 size={14} />}
                                {isAnalyzing ? "Thinking..." : "Generate Theme"}
                             </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mood</span>
                                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">
                                    {aiAnalysis.mood}
                                </h3>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Vibe</span>
                                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                    {aiAnalysis.description}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Palette</span>
                                <div className="flex gap-3 mt-2">
                                    {aiAnalysis.colors.map((color, i) => (
                                        <div key={i} className="group relative cursor-help">
                                            <div 
                                                className="w-12 h-12 rounded-xl shadow-lg transform transition hover:scale-110 border border-white/10" 
                                                style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Suggested Mode</span>
                                <div className="mt-2 flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span className="text-xs font-bold text-cyan-300">{aiAnalysis.recommendedMode}</span>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce delay-75" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce delay-150" />
                                    </div>
                                </div>
                                <button 
                                    onClick={triggerAIAnalysis}
                                    className="mt-3 w-full py-2 text-[10px] text-gray-500 hover:text-white hover:bg-white/5 rounded transition"
                                >
                                    Regenerate Analysis
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={currentTrack?.url || undefined} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => nextTrack()}
        onPlay={() => setAudioState(prev => ({ ...prev, isPlaying: true }))}
        onPause={() => setAudioState(prev => ({ ...prev, isPlaying: false }))}
        crossOrigin="anonymous"
      />
    </div>
  );
}

export default App;