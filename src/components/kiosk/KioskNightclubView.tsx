import React, { useEffect, useState, useRef } from 'react';
import { Song, Event } from '../../types';
import { Disc, Music, ThumbsUp, ThumbsDown } from 'lucide-react';
import { KioskQRCode } from './KioskQRCode';

import { useData } from '../../contexts/DataContext';
import { KioskNowPlayingView } from './KioskNowPlayingView';

interface KioskNightclubViewProps {
    event: Event;
    queue: Song[];
    requestUrl: string;
}

export const KioskNightclubView: React.FC<KioskNightclubViewProps> = ({ event, queue, requestUrl }) => {
    const { currentLiveTrack } = useData();

    // If we have a verified Serato track, switch to Now Playing view
    if (currentLiveTrack) {
        return (
            <KioskNowPlayingView
                event={event}
                queue={queue}
                requestUrl={requestUrl}
                activeTrack={currentLiveTrack}
            />
        );
    }

    // Pinned: Top 5
    const pinnedSongs = queue.slice(0, 5);
    // Scrolling: Rest
    const scrollingSongs = queue.slice(5);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || scrollingSongs.length === 0) return;

        let scrollAmount = 0;
        const speed = 1; // Pixels per frame - adjust for readability
        let animationId: number;

        const scroll = () => {
            scrollAmount += speed;
            if (scrollAmount >= container.scrollHeight / 2) {
                // Reset when half way (because we will double the list for infinite illusion)
                scrollAmount = 0;
            }
            container.scrollTop = scrollAmount;
            animationId = requestAnimationFrame(scroll);
        };

        // Only scroll if content overflows
        // But for infinite effect we usually duplicate content
        if (scrollingSongs.length > 5) { // Arbitrary threshold to start scrolling
            animationId = requestAnimationFrame(scroll);
        }

        return () => cancelAnimationFrame(animationId);
    }, [scrollingSongs]);

    // For infinite scroll illusion, we might duplicate the list if it's long enough
    const displayScrollingSongs = scrollingSongs.length > 0 ? [...scrollingSongs, ...scrollingSongs] : [];

    return (
        <div className="w-full h-full flex flex-col p-8 relative overflow-hidden bg-black text-white font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-indigo-900/40 animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            {/* Header: DJ Focused */}
            <header className="relative z-10 flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-6">
                    {/* Placeholder for DJ Avatar if we had one, for now use Icon */}
                    <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white/10 shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                        <Disc size={40} className="text-white animate-spin-slow" style={{ animationDuration: '10s' }} />
                    </div>
                    <div>
                        <h2 className="text-2xl text-indigo-400 font-bold tracking-widest uppercase mb-1">Your DJ Info</h2>
                        <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                            {event.djName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-8 bg-white/5 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10">
                    <div className="text-right">
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Venue</p>
                        <p className="text-2xl font-bold">{event.venueName}</p>
                    </div>
                    <div className="h-12 w-px bg-white/20" />
                    <div className="text-right">
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">WiFi</p>
                        <p className="text-2xl font-bold">Guest / 1234</p>
                        {/* TODO: Make this dynamic from Venue Info later */}
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 gap-8 relative z-10 min-h-0">
                {/* Left: Pinned Top 5 + QR */}
                <div className="col-span-8 flex flex-col gap-6 min-h-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                        <h2 className="text-4xl font-black uppercase italic tracking-wider text-slate-100">Top Requests</h2>
                    </div>

                    <div className="flex-1 space-y-4">
                        {pinnedSongs.length === 0 ? (
                            <div className="p-12 border-4 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-500">
                                <Music size={64} className="mb-4 opacity-50" />
                                <p className="text-2xl font-bold">Queue is empty</p>
                                <p>Scan the code to request the first song!</p>
                            </div>
                        ) : (
                            pinnedSongs.map((song, idx) => (
                                <div key={song.id} className="relative group bg-gradient-to-r from-white/10 to-transparent backdrop-blur-sm border-l-8 border-indigo-500 p-4 pr-8 rounded-r-2xl flex items-center gap-6 overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Rank */}
                                    <div className="text-6xl font-black text-white/10 w-20 text-center shrink-0">
                                        {idx + 1}
                                    </div>

                                    {/* Art */}
                                    <img src={song.coverUrl} alt={song.title} className="w-20 h-20 rounded-lg shadow-lg object-cover" />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 z-10">
                                        <h3 className="text-3xl font-bold text-white truncate leading-tight">{song.title}</h3>
                                        <p className="text-xl text-indigo-300 font-medium truncate">{song.artist}</p>
                                    </div>

                                    {/* Requester & Votes */}
                                    <div className="flex flex-col items-end gap-1 z-10 min-w-[140px]">
                                        <div className="flex items-center gap-3 text-white bg-slate-900/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">
                                            {/* Up */}
                                            <div className="flex items-center gap-1 text-green-400">
                                                <ThumbsUp size={14} fill="currentColor" />
                                                <span className="text-xs font-bold">{song.upvotedUserIds?.length || 0}</span>
                                            </div>
                                            {/* Net */}
                                            <span className="text-lg font-black leading-none">{song.votes}</span>
                                            {/* Down */}
                                            <div className="flex items-center gap-1 text-red-400">
                                                <span className="text-xs font-bold">{song.downvotedUserIds?.length || 0}</span>
                                                <ThumbsDown size={14} fill="currentColor" />
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-400 font-medium truncate max-w-[150px]">
                                            by <span className="text-slate-200">{song.requesterName || 'Guest'}</span>
                                        </p>
                                        {song.timestamp && (
                                            <p className="text-xs text-slate-500 font-mono opacity-70">
                                                {new Date(song.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Scroll List + QR */}
                <div className="col-span-4 flex flex-col h-full gap-6 min-h-0 bg-slate-900/50 rounded-3xl border border-white/5 p-6 backdrop-blur-xl">
                    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-xl mb-4 shrink-0">
                        <KioskQRCode url={requestUrl} label="SCAN TO VOTE" />
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                        <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full" />
                            Coming Up
                        </h3>

                        {/* Scrolling Container */}
                        {scrollingSongs.length > 0 ? (
                            <div
                                className="flex-1 overflow-hidden relative mask-image-gradient"
                                style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
                            >
                                <div
                                    ref={scrollContainerRef}
                                    className="absolute inset-0 overflow-hidden space-y-4"
                                    style={{
                                        // If we implemented JS scrolling, remove overflow-y-auto. 
                                        // For now let's stick to CSS animation or just specific overflow hidden
                                    }}
                                >
                                    {/* Double the list for seamless loop */}
                                    {displayScrollingSongs.map((song, i) => (
                                        <div key={`${song.id}-${i}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            <img src={song.coverUrl} className="w-12 h-12 rounded bg-slate-800 object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-white truncate leading-tight">{song.title}</p>
                                                <p className="text-sm text-slate-400 truncate">{song.artist}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-purple-400">{song.votes} pts</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-600 text-center italic px-8">
                                More requests will show here...
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
