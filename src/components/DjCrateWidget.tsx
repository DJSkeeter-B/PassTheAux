import React, { useState, useEffect, useRef } from 'react';
import { Play, ThumbsUp, ThumbsDown, X, Minimize2, Maximize2, History, List, AlertCircle, Ban, Disc, Music } from 'lucide-react';
import { Song, SongStatus } from '../types';
import { subscribeToQueue, updateSongStatus } from '../services/firebase';

interface DjCrateWidgetProps {
    eventId: string;
    onCloseWidget: () => void;
}

type Tab = 'LIVE' | 'HISTORY' | 'DENIED';

export const DjCrateWidget: React.FC<DjCrateWidgetProps> = ({ eventId, onCloseWidget }) => {
    const [viewState, setViewState] = useState<'COLLAPSED' | 'EXPANDED'>('COLLAPSED');
    const [activeTab, setActiveTab] = useState<Tab>('LIVE');
    const [queue, setQueue] = useState<Song[]>([]);
    const minimizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Data Subscription
    useEffect(() => {
        if (!eventId) return;
        const unsubscribe = subscribeToQueue(eventId, (songs) => {
            // Filter based on Active Tab
            const relevantSongs = songs.filter(s => {
                if (activeTab === 'LIVE') return s.status === 'PENDING' || s.status === 'APPROVED';
                if (activeTab === 'HISTORY') return s.status === 'PLAYED';
                if (activeTab === 'DENIED') return s.status === 'REJECTED' || s.status === 'UNAVAILABLE';
                return false;
            });

            // Sorting Logic
            const sorted = [...relevantSongs].sort((a, b) => {
                // 1. Approved always at top (Only relevant for LIVE)
                if (activeTab === 'LIVE') {
                    if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
                    if (a.status !== 'APPROVED' && b.status === 'APPROVED') return 1;
                }
                // 2. Sort by Votes DESC, then Time ASC
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });

            setQueue(sorted);
        });
        return () => unsubscribe();
    }, [eventId, activeTab]);

    // Handle Actions
    const handleAction = async (songId: string, action: 'APPROVE' | 'REJECT' | 'UNAVAILABLE' | 'PLAYED') => {
        const status = action === 'APPROVE' ? SongStatus.APPROVED
            : action === 'REJECT' ? SongStatus.REJECTED
                : action === 'UNAVAILABLE' ? SongStatus.UNAVAILABLE
                    : SongStatus.PLAYED;
        await updateSongStatus(songId, status);
    };

    // Window Resizing (Dynamic)
    useEffect(() => {
        const api = (window as any).electronAPI;
        if (api) {
            if (viewState === 'COLLAPSED') {
                api.resizeWindow(60, 60);
            } else {
                // Dynamic Height Calculation
                const HEADER_HEIGHT = 100; // Header + Columns + Footer
                const ROW_HEIGHT = 64;     // Approx height per song
                const MIN_HEIGHT = 200;    // Minimum 
                const MAX_ITEMS = 5;       // Cap auto-growth at 5 items (scroll after)

                const itemCount = Math.max(1, queue.length); // At least show "Empty" message space
                const desiredHeight = HEADER_HEIGHT + (Math.min(itemCount, MAX_ITEMS) * ROW_HEIGHT);

                // Width 500px for readability
                api.resizeWindow(500, desiredHeight);
            }
        }
    }, [viewState, queue.length]); // Re-calc when queue changes size

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
            }, 4000); // 4-second inactivity timer
        }
    };

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (minimizeTimeoutRef.current) clearTimeout(minimizeTimeoutRef.current);
        };
    }, []);

    if (viewState === 'COLLAPSED') {
        return (
            <div
                onMouseEnter={handleMouseEnter}
                className="w-full h-full flex items-center justify-center relative overflow-hidden"
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                {/* Compact Icon Representation */}
                <div className="w-full h-full bg-slate-900 rounded-xl shadow-xl border-2 border-slate-600 flex items-center justify-center relative overflow-hidden group-hover:border-blue-500 transition-colors">
                    {/* Vinyl Record (Draggable Area) */}
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-4 border-slate-700 relative animate-slow-spin flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-slate-600 opacity-50"></div>

                        {/* Center Label (Clickable - No Drag) */}
                        <div
                            className="w-4 h-4 bg-red-500 rounded-full cursor-pointer hover:scale-110 transition-transform flex items-center justify-center z-50"
                            style={{ WebkitAppRegion: 'no-drag' } as any}
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewState('EXPANDED');
                            }}
                            title="Click to Expand"
                        >
                            <Minimize2 size={8} className="text-white transform rotate-45" />
                        </div>
                    </div>
                </div>

                {/* Badge for Request Count (Only Live) */}
                {queue.length > 0 && activeTab === 'LIVE' && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow border border-slate-900">
                        {queue.length}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans"
        >
            {/* Header */}
            <div className="h-10 px-3 bg-slate-900 flex justify-between items-center border-b border-slate-700 draggable shrink-0">
                <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {/* TABS */}
                    <div className="flex bg-slate-800 p-0.5 rounded-lg">
                        <button
                            onClick={() => setActiveTab('LIVE')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${activeTab === 'LIVE' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            LIVE
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            HISTORY
                        </button>
                        <button
                            onClick={() => setActiveTab('DENIED')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${activeTab === 'DENIED' ? 'bg-red-900/50 text-red-200 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            DENIED
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 items-center">
                    <button
                        onClick={() => setViewState('COLLAPSED')}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                        title="Minimize"
                    >
                        <Minimize2 size={12} />
                    </button>
                    <button
                        onClick={onCloseWidget}
                        className="p-1.5 bg-slate-800 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Close / Maximize App"
                    >
                        <Maximize2 size={12} />
                    </button>
                </div>
            </div>

            {/* Column Headers */}
            <div className="flex items-center px-4 py-2 bg-slate-800/50 text-[10px] font-bold text-slate-400 border-b border-slate-700/50 shrink-0 gap-2">
                <div className="flex-1">SONG / ARTIST</div>
                <div className="flex-1">SONG / ARTIST</div>
                <div className="w-8 text-center" title="Tempo (BPM)">BPM</div>
                <div className="w-8 text-center" title="Musical Key">KEY</div>
                <div className="w-8 text-center" title="Energy Level (0-100)">NRG</div>
                <div className="w-12 text-center">VOTES</div>
                <div className="w-24 text-right">ACTIONS</div>
            </div>

            {/* Vertical List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-2 gap-1">
                {queue.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm p-4 text-center min-h-[100px]">
                        <p className="mb-2 opacity-50">
                            {activeTab === 'LIVE' ? "No active requests" : activeTab === 'HISTORY' ? "No history yet" : "No denied songs"}
                        </p>
                    </div>
                ) : (
                    queue.map(song => {
                        const isApproved = song.status === 'APPROVED';
                        const isRejected = song.status === 'REJECTED';
                        const isUnavailable = song.status === 'UNAVAILABLE';
                        const isNegative = song.votes < 0;

                        // Dynamic Styles
                        let rowClass = "bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/30"; // Default
                        if (isApproved) rowClass = "bg-green-900/20 hover:bg-green-900/30 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]";
                        if (isRejected) rowClass = "bg-slate-900/20 opacity-75 grayscale border-transparent hover:opacity-100 hover:grayscale-0";
                        if (isUnavailable) rowClass = "bg-amber-900/10 opacity-75 border-amber-900/30 hover:opacity-100 hover:bg-amber-900/20";
                        if (isNegative && !isRejected && !isApproved && !isUnavailable) rowClass = "bg-red-900/10 hover:bg-red-900/20 border-red-500/30";

                        return (
                            <div
                                key={song.id}
                                className={`flex items-center p-3 rounded-lg border transition-all text-xs group relative shrink-0 ${rowClass}`}
                            >
                                {/* TEXT INFO */}
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {/* SOURCE BADGE */}
                                        <div title={song.source}>
                                            {song.source === 'LEXICON' ? (
                                                <Disc size={12} className="text-purple-400 shrink-0" />
                                            ) : (
                                                <Music size={12} className={song.source === 'SPOTIFY' ? "text-green-500 shrink-0" : "text-slate-500 shrink-0"} />
                                            )}
                                        </div>

                                        <span className={`font-bold truncate text-sm ${isApproved ? 'text-green-400' : isRejected ? 'text-slate-400' : isUnavailable ? 'text-amber-500/70 line-through decoration-amber-500/30' : 'text-slate-200'}`}>
                                            {song.title}
                                        </span>
                                        {isApproved && <span className="bg-green-500 text-slate-900 text-[9px] font-extrabold px-1 py-0.5 rounded">LIVE</span>}
                                        {isUnavailable && <span className="bg-amber-900/50 border border-amber-500/20 text-amber-500 text-[9px] font-extrabold px-1 py-0.5 rounded ml-1">UNAVAIL</span>}
                                    </div>
                                    <div className="flex items-center text-[11px] text-slate-400 gap-2">
                                        <span className="truncate max-w-[150px]">{song.artist}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span className="truncate opacity-75">by {song.requesterName || 'Guest'}</span>
                                    </div>
                                </div>



                                {/* META */}
                                <div className="w-8 text-center font-mono text-[10px] text-slate-400 border-r border-slate-700/50 h-4 flex items-center justify-center">
                                    {song.bpm || '-'}
                                </div>
                                <div className="w-8 text-center font-mono text-[10px] text-slate-400 border-r border-slate-700/50 h-4 flex items-center justify-center">
                                    {song.key || '-'}
                                </div>
                                <div className="w-8 text-center font-mono text-[10px] text-slate-400 h-4 flex items-center justify-center">
                                    {song.energy ? (
                                        <div className="w-full px-1">
                                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${song.energy > 80 ? 'bg-red-500' : song.energy > 60 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${song.energy}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : '-'}
                                </div>

                                {/* VOTES */}
                                <div className={`w-12 text-center font-bold text-sm ${song.votes > 0 ? 'text-green-400' : song.votes < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {song.votes > 0 ? `+${song.votes}` : song.votes}
                                </div>

                                {/* ACTIONS (Right Aligned) */}
                                <div className="w-24 flex items-center justify-end gap-1 pl-2">
                                    {(activeTab === 'DENIED' || activeTab === 'HISTORY') ? (
                                        // Restore / Re-queue
                                        <button
                                            onClick={() => handleAction(song.id, 'APPROVE')}
                                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors"
                                            title="Restore / Approve"
                                        >
                                            <ThumbsUp size={14} />
                                        </button>
                                    ) : (
                                        <>
                                            {!isApproved && (
                                                <button
                                                    onClick={() => handleAction(song.id, 'APPROVE')}
                                                    className="p-1.5 rounded hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors"
                                                    title="Approve"
                                                >
                                                    <ThumbsUp size={14} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleAction(song.id, 'PLAYED')}
                                                className={`p-1.5 rounded transition-colors ${isApproved
                                                    ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                    : 'hover:bg-blue-500/20 text-slate-400 hover:text-blue-400'
                                                    }`}
                                                title="Mark Played"
                                            >
                                                <Play size={14} fill={isApproved ? "currentColor" : "none"} />
                                            </button>

                                            {/* Unavailable Button */}
                                            <button
                                                onClick={() => handleAction(song.id, 'UNAVAILABLE')}
                                                className="p-1.5 rounded hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-colors"
                                                title="Mark Unavailable"
                                            >
                                                <AlertCircle size={14} />
                                            </button>

                                            <button
                                                onClick={() => handleAction(song.id, 'REJECT')}
                                                className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Reject"
                                            >
                                                <ThumbsDown size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Style */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-30 shrink-0"></div>
        </div>
    );
};
