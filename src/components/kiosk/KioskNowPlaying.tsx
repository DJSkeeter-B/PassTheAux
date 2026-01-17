import React from 'react';
import { Song } from '../../types';
import { Music, Disc } from 'lucide-react';

interface KioskNowPlayingProps {
    song?: Song;
}

export const KioskNowPlaying: React.FC<KioskNowPlayingProps> = ({ song }) => {
    if (!song) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl flex-1 text-center animate-pulse">
                <Disc size={64} className="text-white/20 mb-6" />
                <h2 className="text-3xl font-bold text-white/40">Waiting for requests...</h2>
                <p className="text-xl text-white/30 mt-2">Scan the code to pick the next song!</p>
            </div>
        );
    }

    return (
        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-xl p-6 flex flex-row items-center gap-6 text-left">
            <div className="absolute inset-0 bg-white/5 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative shrink-0">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[30px] opacity-20 animate-pulse" />
                <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-32 h-32 object-cover rounded-xl shadow-lg rotate-0 border-2 border-white/10"
                />
            </div>

            <div className="relative z-10 flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-bold text-xs uppercase tracking-widest mb-1 border border-green-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Up Next / Now Playing
                </div>

                <h2 className="text-3xl font-black text-white leading-tight truncate">
                    {song.title}
                </h2>
                <p className="text-xl text-indigo-200 font-medium opacity-90 truncate">
                    {song.artist}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                    Requested by <span className="text-white font-bold">{song.requesterName || 'Guest'}</span>
                </p>
            </div>
        </div>
    );
};
