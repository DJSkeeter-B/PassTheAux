import React, { useState } from 'react';
import { X, Tv, MonitorPlay, PartyPopper } from 'lucide-react';
import { Event } from '../../types';

interface KioskModeSelectorProps {
    event: Event;
    onClose: () => void;
}

export const KioskModeSelector: React.FC<KioskModeSelectorProps> = ({ event, onClose }) => {
    const launchKiosk = (mode: 'now_playing' | 'nightclub') => {
        const url = `${window.location.origin}/kiosk/${event.id}?mode=${mode}`;

        if (window.electronAPI && window.electronAPI.openKiosk) {
            window.electronAPI.openKiosk(url);
        } else {
            window.open(url, '_blank');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition"
                >
                    <X size={20} />
                </button>

                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-900/30 text-indigo-400 mb-4 border border-indigo-500/20">
                        <Tv size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Launch Kiosk Mode</h3>
                    <p className="text-slate-400 text-sm">Select a visual theme for the display</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => launchKiosk('now_playing')}
                        className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition group text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-blue-900/30 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-110 transition-transform">
                            <MonitorPlay size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white group-hover:text-blue-300 transition-colors">Now Playing Mode</h4>
                            <p className="text-xs text-slate-500">Focus on current track & next up. Best for Karaoke/Open Mic.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => launchKiosk('nightclub')}
                        className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl transition group text-left"
                    >
                        <div className="w-12 h-12 rounded-lg bg-pink-900/30 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/20 group-hover:scale-110 transition-transform">
                            <PartyPopper size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white group-hover:text-pink-300 transition-colors">Nightclub Mode</h4>
                            <p className="text-xs text-slate-500">Pinned top hits & auto-scrolling list. Best for active parties.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
