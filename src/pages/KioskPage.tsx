import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Event, Song } from '../types';
import { subscribeToQueue } from '../services/firebase';
import { KioskNowPlayingView } from '../components/kiosk/KioskNowPlayingView';
import { KioskNightclubView } from '../components/kiosk/KioskNightclubView';
import { privacyProxy } from '../services/PrivacyProxy';

export const KioskPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'now_playing'; // 'now_playing' | 'nightclub'

    const { events, currentLiveTrack } = useData();
    const [event, setEvent] = useState<Event | null>(null);
    const [queue, setQueue] = useState<Song[]>([]);

    useEffect(() => {
        if (id && events.length > 0) {
            const foundEvent = events.find(e => e.id === id);
            if (foundEvent) {
                setEvent(foundEvent);
            }
        }
    }, [id, events]);

    const [debugStatus, setDebugStatus] = useState<any>(null);

    // Auto-Start Serato Listener if configured
    useEffect(() => {
        let unsubscribeElectron: (() => void) | undefined;

        if (event?.seratoEnabled && event.seratoLiveUrl) {
            // Ensure privacy mode matches event config
            if (event.seratoPrivacyMode !== undefined) {
                privacyProxy.setPrivacyMode(event.seratoPrivacyMode);
            }

            console.log("[Kiosk] Auto-Starting Serato Listener:", event.seratoLiveUrl);
            privacyProxy.startListening(event.seratoLiveUrl);
        }

        // Listen for direct status updates from Electron for Debugging
        if (window.electronAPI && window.electronAPI.onSeratoStatus) {
            unsubscribeElectron = window.electronAPI.onSeratoStatus((status: any) => {
                setDebugStatus(status);
            });
        }

        // Optional: Stop on unmount? 
        // For Kiosk it might not matter, but good practice.
        return () => {
            if (event?.seratoEnabled) {
                // privacyProxy.stopListening(); 
                // Commented out because if we navigate away but come back we want it? 
                // Or if we have multiple tabs? 
                // Actually, clean up is better.
                privacyProxy.stopListening();
            }
            if (unsubscribeElectron) {
                unsubscribeElectron();
            }
        };
    }, [event?.seratoEnabled, event?.seratoLiveUrl, event?.seratoPrivacyMode]);

    useEffect(() => {
        if (!id) return;
        const unsubscribe = subscribeToQueue(id, (songs) => {
            const sorted = [...songs].sort((a, b) => {
                // Priority 1: Approved Songs (Top)
                if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
                if (a.status !== 'APPROVED' && b.status === 'APPROVED') return 1;

                // Priority 2: Played (Bottom)
                if (a.status === 'PLAYED' && b.status !== 'PLAYED') return 1;
                if (a.status !== 'PLAYED' && b.status === 'PLAYED') return -1;

                // Priority 3: Rejected / Unavailable (Bottom)
                const isRejectedA = a.status === 'REJECTED' || a.status === 'UNAVAILABLE';
                const isRejectedB = b.status === 'REJECTED' || b.status === 'UNAVAILABLE';
                if (isRejectedA && !isRejectedB) return 1;
                if (!isRejectedA && isRejectedB) return -1;

                // Priority 4: Votes & Time
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });
            // Filter out rejected/unavailable/played for the main display if we want to keep it clean
            // Or keep them but slicing handles it.
            // Let's filter out Played/Rejected for the Kiosk visual to keep it focused on what's coming.
            const activeQueue = sorted.filter(s =>
                s.status === 'APPROVED' || s.status === 'PENDING'
            );

            setQueue(activeQueue);
        });
        return () => unsubscribe();
    }, [id]);

    if (!event) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                <h1 className="text-4xl font-bold animate-pulse">Loading Kiosk...</h1>
            </div>
        );
    }

    const requestUrl = `${window.location.origin}/event/${event.id}`;

    return (
        <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden relative font-sans">
            {/* Mode Switcher Logic */}
            {mode === 'nightclub' ? (
                <KioskNightclubView event={event} queue={queue} requestUrl={requestUrl} />
            ) : (
                <KioskNowPlayingView
                    event={event}
                    queue={queue}
                    requestUrl={requestUrl}
                    activeTrack={currentLiveTrack}
                />
            )}

            {/* DEBUG OVERLAY - REMOVE BEFORE PRODUCTION */}
            {event.seratoEnabled && (
                <div className="absolute bottom-2 left-2 p-2 bg-black/80 text-[10px] font-mono text-green-400 border border-green-900 rounded pointer-events-none z-50 opacity-50 hover:opacity-100 flex flex-col gap-1">
                    <p>SERATO ENABLED</p>
                    <p>API Available: {window.electronAPI ? 'YES' : 'NO'}</p>
                    <p>URL: {event.seratoLiveUrl?.substring(0, 30)}...</p>
                    <p>Strict Privacy: {String(event.seratoPrivacyMode)}</p>
                    <p>Latest Track: {currentLiveTrack ? `${currentLiveTrack.artist} - ${currentLiveTrack.title}` : 'None (Listening...)'}</p>
                    {debugStatus && (
                        <div className={`mt-1 p-1 border rounded ${debugStatus.type === 'error' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-300'}`}>
                            STATUS: {debugStatus.message}
                            {debugStatus.snippet && <div className="text-[8px] opacity-70 mt-1">{debugStatus.snippet}</div>}
                        </div>
                    )}
                    <button
                        onClick={() => event.seratoLiveUrl && privacyProxy.startListening(event.seratoLiveUrl)}
                        className="mt-2 px-2 py-1 bg-blue-600 text-xs rounded hover:bg-blue-500 pointer-events-auto"
                    >
                        Force Reconnect
                    </button>
                    <button
                        onClick={() => window.electronAPI?.toggleFloating(false)}
                        className="mt-1 px-2 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600 pointer-events-auto"
                    >
                        Dev: Reset Window
                    </button>
                </div>
            )}
        </div>
    );
};
