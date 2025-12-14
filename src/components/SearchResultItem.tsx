import React, { useState, useRef, useEffect } from 'react';
import { SearchResult } from '../types';
import { Plus, Vote, Play, Pause, Square } from 'lucide-react';

interface SearchResultItemProps {
  result: SearchResult;
  onRequest: (result: SearchResult) => void;
  isRequested?: boolean;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, onRequest, isRequested }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent requesting song when clicking play

    if (!result.previewUrl) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(result.previewUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play().catch(e => console.error("Playback failed", e));
      setIsPlaying(true);

      // Max 15 seconds
      timeoutRef.current = setTimeout(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
      }, 15000);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
      <div className="relative h-12 w-12 shrink-0">
        <img src={result.coverUrl} alt={result.album} className="h-full w-full rounded object-cover bg-slate-700" />
        {result.previewUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded"
          >
            {isPlaying ? <Pause size={20} className="text-white fill-white" /> : <Play size={20} className="text-white fill-white" />}
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium truncate">{result.title}</h4>
        <p className="text-slate-400 text-xs truncate">{result.artist} • {result.album}</p>
      </div>

      <button
        onClick={() => onRequest(result)}
        disabled={isRequested}
        className={`flex items-center justify-center gap-1 h-8 px-3 rounded-full border transition-all ${isRequested ? 'bg-green-600/20 border-green-500/50 text-green-400 cursor-default' : 'border-slate-600 text-purple-400 hover:bg-purple-500 hover:text-white hover:border-purple-500'}`}
      >
        {isRequested ? <><Vote size={14} /><span className="text-xs font-bold">+1</span></> : <Plus size={18} />}
      </button>
    </div>
  );
};
