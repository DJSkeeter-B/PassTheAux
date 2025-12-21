console.log("DEBUG: EventCard MODULE EVALUATING");
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Headphones, User, Clock, ArrowRight, CornerDownRight, LogOut, Music, Edit2 } from 'lucide-react';
import { Event } from '../types';
import { checkInUser, checkOutUser } from '../services/firebase';
import { ConfirmationModal } from './ConfirmationModal';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface EventCardProps {
    event: Event;
    userCheckedInEventId: string | null | undefined;
    onEdit?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, userCheckedInEventId, onEdit }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events } = useData();

    const isCheckedInHere = userCheckedInEventId === event.id;
    const isCheckedInElsewhere = !!userCheckedInEventId && !isCheckedInHere;

    // Series Volume Logic
    const volStr = React.useMemo(() => {
        if (!event.seriesId || !events.length) return null;
        const seriesEvents = events.filter(e => e.seriesId === event.seriesId);
        if (seriesEvents.length <= 1) return null;
        seriesEvents.sort((a, b) => a.date.localeCompare(b.date));
        const idx = seriesEvents.findIndex(e => e.id === event.id);
        return idx >= 0 ? `Vol. ${idx + 1}` : null;
    }, [event.id, event.seriesId, events]);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false
    });

    const handleQuickAction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }

        if (isCheckedInHere) {
            setConfirmModal({
                isOpen: true,
                title: "Check Out?",
                message: "Are you sure you want to leave the party?",
                isDestructive: true,
                onConfirm: async () => {
                    await checkOutUser(user.id);
                }
            });
            return;
        }

        const performCheckIn = async () => {
            // SMART GEOLOCATION BYPASS
            // Logic: Bypass if user is ADMIN, Event Owner, or an Assigned DJ.
            const isOwner = user.id === event.ownerId;
            const isAssignedDj = event.djIds?.includes(user.id);
            const isAdmin = user.role === 'ADMIN';

            const canBypass = isAdmin || isOwner || isAssignedDj;

            if (!canBypass) {
                // Mock Geolocation Check (placeholder for real distance check logic)
            }

            // If Test Mode is ON, we might skip a "Distance Check". 
            await checkInUser(user.id, event.id);
            navigate(`/event/${event.id}/queue`);
        };

        if (isCheckedInElsewhere) {
            setConfirmModal({
                isOpen: true,
                title: "Switch Event?",
                message: "You are checked into another event. Switch to this one?",
                onConfirm: performCheckIn
            });
            return;
        }

        await performCheckIn();
    };

    return (
        <div
            onClick={() => navigate(`/event/${event.id}`)}
            className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 cursor-pointer hover:border-purple-500/50 transition shadow-md group relative"
        >
            <div className="flex h-32">
                {/* Image Section - Left 1/3 */}
                <div className="w-1/3 relative overflow-hidden">
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/80 md:to-transparent" />
                </div>

                {/* Details Section - Right 2/3 */}
                <div className="w-2/3 p-3 flex flex-col justify-between relative">

                    <div>
                        {/* Title */}
                        <div className="flex items-baseline gap-2 mb-1 pr-8">
                            <h3 className="font-bold text-lg text-white leading-tight line-clamp-2">{event.title}</h3>
                            {volStr && <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-900/30 px-1.5 rounded">{volStr}</span>}
                        </div>

                        {/* Info Grid */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <Headphones size={12} className="text-purple-400" />
                                <span className="truncate">{event.djName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <MapPin size={12} />
                                <span className="truncate">{event.venueName}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-800/50 rounded px-1.5 py-0.5 w-fit">
                            <Clock size={10} />
                            <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.isLive && (
                            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-900/20 border border-purple-500/20 rounded px-1.5 py-0.5 w-fit mt-1">
                                <Music size={10} />
                                <span>{event.requestCount || 0} Requests</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Action Button - Absolute Right Bottom */}
                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex flex-col gap-2">
                    {/* EDIT Button (Only if Owner and onEdit provided) */}
                    {onEdit && user?.id === event.ownerId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                            className="p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500"
                            title="Edit Event"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}

                    {/* CHECK IN / OUT Button */}
                    <button
                        onClick={handleQuickAction}
                        className={`p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center
                                ${isCheckedInHere
                                ? 'bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-900/50'
                                : 'bg-slate-800 text-green-400 hover:bg-green-500 hover:text-black border border-slate-700 hover:border-green-400'
                            }`}
                    >
                        {isCheckedInHere ? <LogOut size={18} /> : <CornerDownRight size={18} />}
                    </button>
                </div>
            </div>

            {/* Visual helper for "Active" */}
            {isCheckedInHere && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 box-content blur-[1px]" />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
