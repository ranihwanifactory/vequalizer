import React from 'react';
import { Track } from '../types';
import { Play, Music, Trash2 } from 'lucide-react';

interface PlaylistProps {
  tracks: Track[];
  currentTrackId: string | null;
  onSelectTrack: (track: Track) => void;
  onRemoveTrack: (id: string, e: React.MouseEvent) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ 
  tracks, currentTrackId, onSelectTrack, onRemoveTrack 
}) => {
  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 w-full max-w-sm h-64 flex flex-col animate-fade-in-up">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm sticky top-0">
        <Music size={16} /> Playlist ({tracks.length})
      </h3>
      
      {tracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
          트랙이 없습니다. 음악을 추가하세요.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {tracks.map((track) => {
            const isPlaying = track.id === currentTrackId;
            return (
              <div 
                key={track.id}
                onClick={() => onSelectTrack(track)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                  isPlaying ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isPlaying ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {isPlaying ? <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> : <Music size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isPlaying ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {track.file.name.replace(/\.[^/.]+$/, "")}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {(track.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => onRemoveTrack(track.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-500 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Playlist;
