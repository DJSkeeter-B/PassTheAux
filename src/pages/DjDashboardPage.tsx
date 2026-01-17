
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, QrCode, Settings, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { subscribeToQueue, subscribeToCheckedInUsers, updateSongStatus, toggleEventRequests } from '../services/firebase';
import { Song, SongStatus, UserProfile } from '../types';
import { SongCard } from '../components/SongCard';
import { EventModal } from '../components/EventModal';

export const DjDashboardPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { events } = useData();
    const [queue, setQueue] = useState<Song[]>([]);
    const [checkedInUsers, setCheckedInUsers] = useState<UserProfile[]>([]);

    // Modals
    const [showEventModal, setShowEventModal] = useState(false);
    // Duplicate state for editing to satisfy EventModal interface
    const [editingEvent, setEditingEvent] = useState<any>({});

    const isElectron = !!(window as any).electronAPI;

    // Navigate to Crate Mode (External Route)
    const toggleFloatingMode = async () => {
        if (!isElectron) return;
        if (id) {
            await (window as any).electronAPI.toggleFloating(true);
            navigate(`/crate/${id}`);
        }
    };

    const event = events.find(e => e.id === id);

    useEffect(() => {
        if (event) setEditingEvent(event);
    }, [event]);

    useEffect(() => {
        if (!id) return;
        const unsubscribeQueue = subscribeToQueue(id, (songs) => {
            const sorted = [...songs].sort((a, b) => {
                if (a.status === 'PLAYED' && b.status !== 'PLAYED') return 1;
                if (a.status !== 'PLAYED' && b.status === 'PLAYED') return -1;
                if (a.status === 'APPROVED' && b.status !== 'APPROVED') return -1;
                if (a.status !== 'APPROVED' && b.status === 'APPROVED') return 1;
                return b.votes - a.votes || a.timestamp - b.timestamp;
            });
            setQueue(sorted);
        });
        const unsubscribeUsers = subscribeToCheckedInUsers(id, setCheckedInUsers);

        return () => {
            unsubscribeQueue();
            unsubscribeUsers();
        };
    }, [id]);

    const handleDJAction = async (songId: string, action: 'APPROVE' | 'REJECT' | 'PLAYED') => {
        const status = action === 'APPROVE' ? SongStatus.APPROVED
            : action === 'REJECT' ? SongStatus.REJECTED
                : SongStatus.PLAYED;
        await updateSongStatus(songId, status);
    };

    if (!event) return <div className="p-10 text-white">Event not found or loading...</div>;

    return (
        <div className="h-screen flex flex-col pb-20 bg-slate-950">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 z-20 bg-slate-900">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dj')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg text-white">{event.title}</h2>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${event.isLive ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                            <span className="text-slate-400">{event.isLive ? 'Live' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded relative text-slate-400"
                        title="Active Users"
                    >
                        <Users size={18} />
                        {checkedInUsers.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>}
                        <span className="ml-1 text-xs font-bold">{checkedInUsers.length}</span>
                    </button>
                    <button
                        onClick={() => toggleEventRequests(event.id, event.acceptingRequests)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition ${event.acceptingRequests ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}
                    >
                        {event.acceptingRequests ? 'Requests ON' : 'Requests OFF'}
                    </button>
                    <button
                        onClick={() => {/* Qr Modal logic shared */ }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400"
                    >
                        <QrCode size={18} />
                    </button>
                    <button
                        onClick={() => setShowEventModal(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400"
                    >
                        <Settings size={18} />
                    </button>
                    {isElectron && (
                        <button
                            onClick={toggleFloatingMode}
                            className={`p-2 hover:bg-slate-700 rounded transition-colors bg-slate-800 text-slate-400`}
                            title="Open Crate Mode Widget"
                        >
                            <Layers size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {queue.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        Waiting for requests...
                    </div>
                )}
                {queue.map(song => (
                    <SongCard
                        key={song.id} song={song} isDjMode={true}
                        isAdmin={user?.role === 'ADMIN'} // or isOwner
                        onApprove={(id) => handleDJAction(id, 'APPROVE')}
                        onReject={(id) => handleDJAction(id, 'REJECT')}
                        onMarkPlayed={(id) => handleDJAction(id, 'PLAYED')}
                    />
                ))}
            </div>

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
