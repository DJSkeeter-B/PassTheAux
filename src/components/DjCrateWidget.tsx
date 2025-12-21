import React, { useState, useEffect, useRef } from 'react';
import { Play, ThumbsUp, ThumbsDown, X, Minimize2, Maximize2 } from 'lucide-react';
import { Song, SongStatus } from '../types';
import { subscribeToQueue, updateSongStatus } from '../services/firebase';

interface DjCrateWidgetProps {
    eventId: string;
    onCloseWidget: () => void;
}

export const DjCrateWidget: React.FC<DjCrateWidgetProps> = ({ eventId, onCloseWidget }) => {
    const [viewState, setViewState] = useState<'COLLAPSED' | 'EXPANDED'>('COLLAPSED');
    const [queue, setQueue] = useState<Song[]>([]);
    const minimizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Data Subscription
    useEffect(() => {
        if (!eventId) return;
        const unsubscribe = subscribeToQueue(eventId, (songs) => {
            // Filter: Only show active songs (Pending/Approved)
            const activeSongs = songs.filter(s => s.status !== 'PLAYED' && s.status !== 'REJECTED');

            const sorted = [...activeSongs].sort((a, b) => {
                if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
                if (a.status !== 'APPROVED' && b.status === 'APPROVED') return 1;
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });
            setQueue(sorted);
        });
        return () => unsubscribe();
    }, [eventId]);

    // Handle Actions
    const handleAction = async (songId: string, action: 'APPROVE' | 'REJECT' | 'PLAYED') => {
        const status = action === 'APPROVE' ? SongStatus.APPROVED
            : action === 'REJECT' ? SongStatus.REJECTED
                : SongStatus.PLAYED;
        await updateSongStatus(songId, status);
    };

    // Window Resizing
    useEffect(() => {
        if (window.electronAPI) {
            if (viewState === 'COLLAPSED') {
                window.electronAPI.resizeWindow(140, 140);
            } else {
                // Horizontal Rectangle
                window.electronAPI.resizeWindow(600, 280);
            }
        }
    }, [viewState]);

    // Auto-Minimize Logic
    const handleMouseEnter = () => {
        if (minimizeTimeoutRef.current) {
            clearTimeout(minimizeTimeoutRef.current);
            minimizeTimeoutRef.current = null;
        }
    };

    const handleMouseLeave = () => {
        if (viewState === 'EXPANDED') {
            minimizeTimeoutRef.current = setTimeout(() => {
                setViewState('COLLAPSED');
            }, 3000);
        }
    };

    // Cleanup timeout on unmount or state change
    useEffect(() => {
        return () => {
            if (minimizeTimeoutRef.current) clearTimeout(minimizeTimeoutRef.current);
        };
    }, []);

    if (viewState === 'COLLAPSED') {
        return (
            <div
                onClick={() => setViewState('EXPANDED')}
                onMouseEnter={handleMouseEnter} // Just in case
                className="w-full h-full flex items-center justify-center cursor-pointer group relative"
            >
                {/* Milkcrate Icon Representation */}
                <div className="w-24 h-24 bg-slate-900 border-4 border-slate-700 rounded-lg shadow-xl relative overflow-hidden transform group-hover:scale-105 transition-transform duration-200">
                    {/* Crate Mesh Pattern */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 p-1 opacity-50">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-slate-800 rounded-sm"></div>
                        ))}
                    </div>
                    {/* Records Inside */}
                    <div className="absolute top-2 left-2 right-2 h-16 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-t-sm transform -rotate-12 translate-y-2 opacity-80"></div>
                </div>

                {/* Badge for Request Count */}
                {queue.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
                        {queue.length}
                    </div>
                )}

                {/* Return to App Button (Collapsed View) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onCloseWidget(); }}
                    className="absolute -bottom-2 -right-2 p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full shadow-lg border border-slate-600 transition-all opacity-0 group-hover:opacity-100 z-50"
                    title="Close Crate & Return to App"
                >
                    <Maximize2 size={12} />
                </button>
            </div>
        );
    }

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        >
            {/* Crate Header (Horizontal) */}
            <div className="h-8 px-3 bg-slate-900/60 flex justify-between items-center border-b border-slate-700/50 backdrop-blur-md draggable">
                <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    LIVE REQUESTS ({queue.length})
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewState('COLLAPSED')}
                        className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-1"
                        title="Minimize to Crate"
                    >
                        <Minimize2 size={10} /> Minimize
                    </button>
                    <button
                        onClick={onCloseWidget}
                        className="p-1 px-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-blue-200 hover:text-white transition-colors text-xs font-bold flex items-center gap-1 border border-blue-500/30"
                        title="Return to Full App"
                    >
                        <Maximize2 size={10} /> Full App
                    </button>
                </div>
            </div>

            {/* Horizontal Layout Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* LIST SECTION (Takes up full width now) */}
                <div className="flex-1 overflow-x-auto custom-scrollbar flex p-2 gap-2 snap-x">
                    {queue.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                            <p>Crate is empty</p>
                        </div>
                    ) : (
                        queue.map(song => (
                            <div key={song.id} className="min-w-[200px] w-[200px] h-full bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors group flex flex-col snap-start relative">
                                <div className="flex-1 min-h-0">
                                    <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight mb-1" title={song.title}>{song.title}</h4>
                                    <p className="text-slate-400 text-xs truncate">{song.artist}</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="text-xs font-mono text-green-400 bg-green-900/30 px-1 rounded">
                                        +{song.votes}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 right-2 bg-slate-800/90 rounded p-1 shadow-lg">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(song.id, 'APPROVE'); }}
                                            className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                                            title="Approve"
                                        >
                                            <ThumbsUp size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(song.id, 'REJECT'); }}
                                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                            title="Reject"
                                        >
                                            <ThumbsDown size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(song.id, 'PLAYED'); }}
                                            className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                            title="Mark Played"
                                        >
                                            <Play size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Style */}
            <div className="h-1 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 opacity-50"></div>
        </div>
    );
};

// Style injection removed - moved to index.css
