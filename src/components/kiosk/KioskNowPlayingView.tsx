import React from 'react';
import { Song, Event } from '../../types';
import { KioskNowPlaying } from './KioskNowPlaying';
import { KioskQueueList } from './KioskQueueList';
import { KioskQRCode } from './KioskQRCode';

import { SearchResult } from '../../types';

interface KioskNowPlayingViewProps {
    event: Event;
    queue: Song[];
    requestUrl: string;
    activeTrack?: SearchResult | null; // Optional override from Serato
}

export const KioskNowPlayingView: React.FC<KioskNowPlayingViewProps> = ({ event, queue, requestUrl, activeTrack }) => {
    // If activeTrack is provided, use it. Otherwise fallback to queue[0]
    const nowPlaying = activeTrack || (queue.length > 0 ? queue[0] : undefined);
    const upNext = queue.slice(1, 4); // Show next 3

    return (
        <div className="w-full h-full flex flex-col p-12 relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black pointer-events-none" />

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            {/* Header */}
            <header className="flex justify-between items-end mb-8 relative z-10 border-b border-white/5 pb-6 shrink-0">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            {event.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 text-2xl text-slate-400 font-light tracking-wide">
                        <span className="font-semibold text-indigo-400">@</span> {event.venueName}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl text-purple-400 font-bold tracking-widest uppercase mb-1">Join the Party</p>
                    <p className="text-4xl font-black tracking-tight">passtheaux.app</p>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 gap-8 relative z-10 min-h-0">
                {/* Left Column: QR Code & CTA */}
                <div className="col-span-4 flex flex-col justify-between min-h-0">
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/5 backdrop-blur-2xl rounded-[3rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                        <div className="relative z-10 transform group-hover:scale-105 transition-transform duration-500 w-full max-w-[80%] aspect-square flex items-center justify-center">
                            <KioskQRCode
                                url={requestUrl}
                                imageUrl={event.customQrImageUrl}
                            />
                        </div>

                        <div className="mt-8 text-center relative z-10">
                            <h3 className="text-3xl font-black mb-2">Scan to Request</h3>
                            <p className="text-lg text-slate-300 px-4 leading-relaxed line-clamp-2">
                                Pick the next song directly from your phone.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Now Playing & Queue */}
                <div className="col-span-8 flex flex-col gap-8 min-h-0">
                    {/* Now Playing Section */}
                    <div className="shrink-0">
                        <KioskNowPlaying song={nowPlaying} />
                    </div>

                    {/* Up Next List */}
                    {upNext.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-4 text-slate-200 shrink-0">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></span>
                                Coming Up Next
                            </h2>
                            <div className="flex-1 overflow-y-auto">
                                <KioskQueueList songs={upNext} />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
