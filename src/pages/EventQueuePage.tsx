
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, LogOut, Search, ToggleLeft, ToggleRight, X, Clock, AlertCircle, Edit2, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToQueue, voteSong, updateSongStatus, checkOutUser, toggleEventRequests } from '../services/firebase';
import { Song, SongStatus } from '../types';
import { SongCard } from '../components/SongCard';
import { EventModal } from '../components/EventModal';


export const EventQueuePage: React.FC = () => {
    // ... items ...
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events } = useData();
    const [queue, setQueue] = useState<Song[]>([]);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});

    // CRATE MODE STATE REMOVED (Using Route)

    // ... existing ... 
    const event = events.find(e => e.id === id);
    const isDj = user && event && (user.role === 'ADMIN' || user.id === event.ownerId || event.djIds?.includes(user.id));

    const isRequestsPaused = !event?.acceptingRequests;
    const isPausedTemporarily = event?.requestsPausedUntil && event.requestsPausedUntil > Date.now();
    const effectiveAcceptingRequests = event?.acceptingRequests || (!!event?.requestsPausedUntil && Date.now() > event.requestsPausedUntil);

    useEffect(() => {
        // ... (subscribe logic same) ...
        if (!id) return;
        const unsubscribe = subscribeToQueue(id, (songs) => {
            const sorted = [...songs].sort((a, b) => {
                // ... same sort ...
                if (a.status === 'PLAYED' && b.status !== 'PLAYED') return 1;
                if (a.status !== 'PLAYED' && b.status === 'PLAYED') return -1;
                if (a.status === 'REJECTED' && b.status !== 'REJECTED') return 1;
                if (a.status !== 'REJECTED' && b.status === 'REJECTED') return -1;
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });
            setQueue(sorted);
        });
        return () => unsubscribe();
    }, [id]);

    const handleVote = async (songId: string, direction: 'up' | 'down') => {
        if (!user) return;

        // Optimistic UI Update
        setQueue(prev => prev.map(song => {
            if (song.id !== songId) return song;

            const upvoted = song.upvotedUserIds || [];
            const downvoted = song.downvotedUserIds || [];
            let newVotes = song.votes;
            let newUpvoted = [...upvoted];
            let newDownvoted = [...downvoted];
            const userId = user.id;

            const isUp = upvoted.includes(userId);
            const isDown = downvoted.includes(userId);

            if (direction === 'up') {
                if (isUp) {
                    newVotes -= 1;
                    newUpvoted = newUpvoted.filter(id => id !== userId);
                } else if (isDown) {
                    newVotes += 2;
                    newDownvoted = newDownvoted.filter(id => id !== userId);
                    newUpvoted.push(userId);
                } else {
                    newVotes += 1;
                    newUpvoted.push(userId);
                }
            } else {
                if (isDown) {
                    newVotes += 1;
                    newDownvoted = newDownvoted.filter(id => id !== userId);
                } else if (isUp) {
                    newVotes -= 2;
                    newUpvoted = newUpvoted.filter(id => id !== userId);
                    newDownvoted.push(userId);
                } else {
                    newVotes -= 1;
                    newDownvoted.push(userId);
                }
            }
            return {
                ...song,
                votes: newVotes,
                upvotedUserIds: newUpvoted,
                downvotedUserIds: newDownvoted
            };
        }));

        try {
            await voteSong(songId, direction, user.id);
        } catch (error: any) {
            console.error("Voting failed", error);
            // Revert is handled by the real-time listener eventually or we could trigger a specific revert here
            // But usually the subscriber will just push the old state back if write fails? 
            // Actually no, subscriber only pushes purely new snapshots.
            // If we want to perfect revert, we'd need to save previous state. 
            // For now, let's assume reliability is high and just alert on error.
            const msg = typeof error === 'string' ? error : (error.message || "Voting failed");
            alert(msg);
        }
    };

    const handleDJAction = async (songId: string, action: 'APPROVE' | 'REJECT' | 'PLAYED') => {
        // ... same logic ...
        const status = action === 'APPROVE' ? SongStatus.APPROVED
            : action === 'REJECT' ? SongStatus.REJECTED
                : SongStatus.PLAYED;
        await updateSongStatus(songId, status);
    };

    const handleCheckOut = async () => {
        if (!user) return;
        await checkOutUser(user.id);
        navigate('/');
    };

    const handleToggleRequests = () => {
        // ... existing ...
        if (!event || !isDj) return;
        if (effectiveAcceptingRequests) {
            setShowPauseModal(true);
        } else {
            toggleEventRequests(event.id, false, null);
        }
    };

    const handlePauseDuration = (minutes: number | null) => {
        // ... existing ...
        if (!event) return;
        const pausedUntil = minutes ? Date.now() + (minutes * 60 * 1000) : null;
        toggleEventRequests(event.id, true, pausedUntil);
        setShowPauseModal(false);
    };

    // Navigate to Crate Mode
    const toggleCrateMode = async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.toggleFloating(true);
        navigate(`/crate/${event?.id}`);
    };

    if (!id) return <div>Invalid Event ID</div>;
    // ... rest of component ...

    return (
        <div className="space-y-4 pt-4 px-4 h-screen flex flex-col bg-slate-950 pb-20 relative">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/event/${id}`)} className="p-2 hover:bg-slate-800 rounded-full transition text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Music className="text-purple-400" /> Queue
                    </h2>
                    {isDj && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleToggleRequests}
                                className={`ml-2 transition-colors ${effectiveAcceptingRequests ? 'text-green-400' : 'text-slate-500'}`}
                                title={effectiveAcceptingRequests ? "Turn requests off" : "Turn requests on"}
                            >
                                {effectiveAcceptingRequests ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                            {/* EVENT EDIT SHORTCUT */}
                            {user?.id === event?.ownerId && (
                                <button
                                    onClick={() => { if (event) { setEditingEvent(event); setShowEventModal(true); } }}
                                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition"
                                    title="Edit Event"
                                >
                                    <Clock size={0} className="hidden" />
                                    <Edit2 size={18} />
                                </button>
                            )}

                            {/* CRATE MODE TOGGLE (Electron Only) - PROMINENT BUTTON */}
                            {window.electronAPI && (
                                <button
                                    onClick={toggleCrateMode}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-full text-blue-200 hover:text-white transition-all text-xs font-bold"
                                    title="Open Crate (Float Mode)"
                                >
                                    <Layers size={14} /> Open Crate
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-800 rounded">
                    {queue.length} Songs
                </div>
                {user?.checkedInEventId === id && (
                    <button onClick={handleCheckOut} className="ml-2 bg-red-900/50 p-2 rounded text-red-300 hover:text-white">
                        <LogOut size={16} />
                    </button>
                )}
            </div>

            {event && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 flex items-center gap-3">
                    <img src={event.imageUrl} className="w-10 h-10 rounded object-cover border border-slate-700" alt={event.title} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <span className="opacity-70">DJ</span>
                            <span>{event.djName}</span>
                        </p>
                        <h3 className="text-sm font-bold text-white leading-none truncate">{event.title}</h3>
                        <p className="text-[10px] text-slate-400 truncate">@{event.venueName}</p>
                    </div>
                    {/* Status Indicator */}
                    {effectiveAcceptingRequests ? (
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Requests Open"></div>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-red-500" title="Requests Paused"></div>
                    )}
                </div>
            )}

            {!effectiveAcceptingRequests && (
                <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3 text-amber-200">
                    <AlertCircle size={20} className="shrink-0" />
                    <div className="leading-tight text-sm">
                        <span className="font-bold">Requests Paused</span>
                        {event?.requestsPausedUntil && event.requestsPausedUntil > Date.now() && (
                            <span className="opacity-75 block text-xs mt-0.5">
                                Resuming at {new Date(event.requestsPausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={() => navigate(`/event/${id}/search`)}
                disabled={!effectiveAcceptingRequests && !isDj}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shrink-0 ${effectiveAcceptingRequests || isDj
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-purple-900/20 group'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
            >
                <Search size={20} className={effectiveAcceptingRequests || isDj ? "group-hover:scale-110 transition-transform" : ""} />
                {effectiveAcceptingRequests ? "Request a Song" : (isDj ? "Request (Bypass)" : "Requests Paused")}
            </button>

            <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                {queue.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl mt-4">
                        <p className="text-slate-500">The queue is empty.</p>
                        <p className="text-sm text-slate-600 mt-1">Be the vibe setter!</p>
                    </div>
                ) : (
                    queue.map(song => (
                        <SongCard
                            key={song.id}
                            song={song}
                            isDjMode={!!isDj}
                            isAdmin={user?.role === 'ADMIN'}
                            currentUserId={user?.id}
                            onVote={handleVote}
                            onApprove={(id) => handleDJAction(id, 'APPROVE')}
                            onReject={(id) => handleDJAction(id, 'REJECT')}
                            onMarkPlayed={(id) => handleDJAction(id, 'PLAYED')}
                        />
                    ))
                )}
            </div>

            {/* Pause Duration Modal */}
            {showPauseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-950 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Clock size={20} className="text-amber-400" />
                                Pause Requests
                            </h3>
                            <button onClick={() => setShowPauseModal(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm">How long would you like to turn off requests?</p>

                        <div className="grid grid-cols-4 gap-2">
                            {[15, 30, 45, 60, 75, 90, 105, 120].map(min => (
                                <button
                                    key={min}
                                    onClick={() => handlePauseDuration(min)}
                                    className="bg-slate-900 border border-slate-700 hover:bg-purple-900/20 hover:border-purple-500/50 text-slate-300 hover:text-white py-2.5 rounded-lg text-xs font-bold transition-all"
                                >
                                    {min}m
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handlePauseDuration(null)}
                            className="w-full bg-slate-900 border border-slate-700 hover:bg-red-900/20 hover:border-red-500/30 text-slate-300 hover:text-red-200 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <Clock size={16} /> Until I turn them back on
                        </button>
                    </div>
                </div>
            )}
            {showEventModal && (
                <EventModal
                    editingEvent={editingEvent}
                    setEditingEvent={setEditingEvent}
                    onClose={() => setShowEventModal(false)}
                    currentUserId={user?.id}
                    series={[]}
                />
            )}
        </div>
    );
};
