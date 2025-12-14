import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, LogOut, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToQueue, voteSong, updateSongStatus, checkOutUser } from '../services/firebase';
import { Song, SongStatus } from '../types';
import { SongCard } from '../components/SongCard';

export const EventQueuePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events } = useData();
    const [queue, setQueue] = useState<Song[]>([]);

    const event = events.find(e => e.id === id);

    useEffect(() => {
        if (!id) return;
        const unsubscribe = subscribeToQueue(id, (songs) => {
            const sorted = [...songs].sort((a, b) => {
                // Tier 1: Played (Bottom)
                if (a.status === 'PLAYED' && b.status !== 'PLAYED') return 1;
                if (a.status !== 'PLAYED' && b.status === 'PLAYED') return -1;

                // Tier 2: Rejected (Below Active, Above Played)
                if (a.status === 'REJECTED' && b.status !== 'REJECTED') return 1;
                if (a.status !== 'REJECTED' && b.status === 'REJECTED') return -1;

                // Tier 3: Active (Approved/Pending) - Sort by Votes, then Time
                // Approved vs Pending? Usually mixed by votes.
                // Or Approved first? "Accepted... in the Queue".
                // Default: Votes Descending
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });
            setQueue(sorted);
        });
        return () => unsubscribe();
    }, [id]);

    const handleVote = async (songId: string, direction: 'up' | 'down') => {
        if (!user) return;
        try {
            await voteSong(songId, direction, user.id);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDJAction = async (songId: string, action: 'APPROVE' | 'REJECT' | 'PLAYED') => {
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

    if (!id) return <div>Invalid Event ID</div>;

    return (
        <div className="space-y-4 pt-4 px-4 h-screen flex flex-col bg-slate-950 pb-20">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/event/${id}`)} className="p-2 hover:bg-slate-800 rounded-full transition text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Music className="text-purple-400" /> Queue
                    </h2>
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
                        <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">Checked In</p>
                        <h3 className="text-sm font-bold text-white leading-none truncate">{event.title}</h3>
                        <p className="text-[10px] text-slate-400 truncate">@{event.venueName}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
            )}

            <button
                onClick={() => navigate(`/event/${id}/search`)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-900/20 group shrink-0"
            >
                <Search size={20} className="group-hover:scale-110 transition-transform" />
                Request a Song
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
                            isDjMode={false} // TODO: Check if user is DJ of THIS event
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
        </div>
    );
};
