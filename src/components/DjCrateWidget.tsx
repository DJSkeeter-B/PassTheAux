import React, { useState, useEffect } from 'react';
import { Play, ThumbsUp, ThumbsDown, X, Minimize2, Maximize2 } from 'lucide-react';
import { Song } from '../types';

interface DjCrateWidgetProps {
    queue: Song[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onPlay: (id: string) => void;
    onCloseWidget: () => void;
}

export const DjCrateWidget: React.FC<DjCrateWidgetProps> = ({ queue, onApprove, onReject, onPlay, onCloseWidget }) => {
    const [viewState, setViewState] = useState<'COLLAPSED' | 'EXPANDED'>('COLLAPSED');

    useEffect(() => {
        // Resize window on state change
        if (window.electronAPI) {
            if (viewState === 'COLLAPSED') {
                window.electronAPI.resizeWindow(140, 140);
            } else {
                window.electronAPI.resizeWindow(350, 600);
            }
        }
    }, [viewState]);

    if (viewState === 'COLLAPSED') {
        return (
            <div
                onClick={() => setViewState('EXPANDED')}
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
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Crate Header */}
            <div className="p-3 bg-slate-900/60 flex justify-between items-center border-b border-slate-700/50 backdrop-blur-md draggable">
                <span className="font-bold text-slate-200 text-sm">Request Crate</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewState('COLLAPSED')}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                        title="Minimize to Crate"
                    >
                        <Minimize2 size={14} />
                    </button>
                    <button
                        onClick={onCloseWidget}
                        className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Close Widget"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Request List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {queue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                        <p>Crate is empty</p>
                    </div>
                ) : (
                    queue.map(song => (
                        <div key={song.id} className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                                <div className="min-w-0 flex-1 mr-2">
                                    <h4 className="font-bold text-white text-sm truncate">{song.title}</h4>
                                    <p className="text-slate-400 text-xs truncate">{song.artist}</p>
                                </div>
                                <div className="text-xs font-mono text-green-400 bg-green-900/30 px-1 rounded">
                                    +{song.votes}
                                </div>
                            </div>

                            <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onApprove(song.id)}
                                    className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
                                    title="Approve"
                                >
                                    <ThumbsUp size={12} />
                                </button>
                                <button
                                    onClick={() => onReject(song.id)}
                                    className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                    title="Reject"
                                >
                                    <ThumbsDown size={12} />
                                </button>
                                <button
                                    onClick={() => onPlay(song.id)}
                                    className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                    title="Mark Played"
                                >
                                    <Play size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Style - "Crate Bottom" */}
            <div className="h-1 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 opacity-50"></div>
        </div>
    );
};

// Add styles for draggable region
const style = document.createElement('style');
style.textContent = `
    .draggable {
        -webkit-app-region: drag;
    }
    button {
        -webkit-app-region: no-drag;
    }
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
    }
`;
document.head.appendChild(style);
