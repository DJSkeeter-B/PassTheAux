import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Headphones, Clock, CornerDownRight, LogOut, Music, Edit2, ArrowRight, Repeat } from 'lucide-react';
import { Event } from '../types';
import { checkInUser, checkOutUser } from '../services/firebase';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface EventCardProps {
    event: Event;
    userCheckedInEventId: string | null | undefined;
    onEdit?: (event: Event) => void;
    onCardClick?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, userCheckedInEventId, onEdit, onCardClick }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events } = useData();

    const isCheckedInHere = userCheckedInEventId === event.id;
    const isCheckedInElsewhere = !!userCheckedInEventId && !isCheckedInHere;

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
            // Bypass/Geo Logic would go here
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

    const handleCardClick = () => {
        if (onCardClick) {
            onCardClick(event);
        } else {
            navigate(`/event/${event.id}`);
        }
    };

    // Pending Status Check
    const isPending = event.status === 'PENDING' || (!event.isPublic && user?.id === event.ownerId);

    // Derived Series Volume String
    const volStr = event.seriesOrder ? `Vol ${event.seriesOrder}` : null;

    return (
        <div className="flex flex-col gap-1 w-full max-w-[300px]">
            {/* Status Flags Bar */}
            <div className="flex items-center justify-between px-1 text-[10px] uppercase font-bold text-slate-400">
                <div className="flex items-center gap-2">
                    {event.acceptingRequests ? (
                        <div className="flex items-center gap-1 text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span>Requests Open ({event.requestCount || 0})</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <span>Requests Closed ({event.requestCount || 0})</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Approved">
                        <span className="text-green-500">●</span> {event.stats?.approved || 0}
                    </div>
                    <div className="flex items-center gap-1" title="Rejected">
                        <span className="text-red-500">●</span> {event.stats?.rejected || 0}
                    </div>
                    <div className="flex items-center gap-1" title="Pending">
                        <span className="text-yellow-500">●</span> {event.stats?.pending || 0}
                    </div>
                </div>
            </div>

            <div
                onClick={handleCardClick}
                className={`bg-slate-900 rounded-xl overflow-hidden border cursor-pointer transition shadow-md group relative h-32 flex w-full
                    ${isPending ? 'border-yellow-500/80' : 'border-slate-800 hover:border-purple-500/50'}
                `}
            >
                {/* Image Section - Left 1/3 */}
                <div className="w-1/3 relative overflow-hidden h-full">
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/80 md:to-transparent" />

                    {/* Pending Badge */}
                    {isPending && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-20">
                            DRAFT
                        </div>
                    )}
                </div>

                {/* Details Section - Right 2/3 */}
                <div className="w-2/3 p-3 flex flex-col justify-between relative pl-4 z-10">

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
                    </div>
                </div>

                {/* Bottom Info Row (Time & Requests) - Positioned slightly differently to fit buttons */}
                <div className="absolute bottom-3 left-[36%] flex gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-800/50 rounded px-1.5 py-0.5 w-fit">
                        <Clock size={10} />
                        <span>{event.startTime}</span>
                    </div>
                    {event.isLive && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-900/20 border border-purple-500/20 rounded px-1.5 py-0.5 w-fit">
                            <Music size={10} />
                            <span>{event.requestCount || 0}</span>
                        </div>
                    )}
                </div>

                {/* Quick Action Button - Absolute Right Bottom */}
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-2 z-20">

                    {/* 2. Check In / Out Button */}
                    <button
                        onClick={handleQuickAction}
                        className={`p-2.5 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center
                            ${isCheckedInHere
                                ? 'bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-900/50'
                                : 'bg-slate-800 text-green-400 hover:bg-green-500 hover:text-black border border-slate-700 hover:border-green-400'
                            }`}
                        title={isCheckedInHere ? "Check Out" : "Check In"}
                    >
                        {isCheckedInHere ? <LogOut size={16} /> : <CornerDownRight size={16} />}
                    </button>

                    {/* 3. EDIT Button (Only if Owner and onEdit provided) */}
                    {onEdit && user?.id === event.ownerId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                            className="p-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500 text-xs"
                            title="Edit Event"
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={handleQuickAction}
                    className={`p-2.5 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center
                            ${isCheckedInHere
                            ? 'bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-900/50'
                            : 'bg-slate-800 text-green-400 hover:bg-green-500 hover:text-black border border-slate-700 hover:border-green-400'
                        }`}
                    title={isCheckedInHere ? "Check Out" : "Check In"}
                >
                    {isCheckedInHere ? <LogOut size={16} /> : <CornerDownRight size={16} />}
                </button>

                {/* 3. EDIT Button (Only if Owner and onEdit provided) */}
                {onEdit && user?.id === event.ownerId && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                        className="p-2 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500 text-xs"
                        title="Edit Event"
                    >
                        <Edit2 size={14} />
                    </button>
                )}
            </div>

            {/* Visual helper for "Active" */}
            {isCheckedInHere && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 box-content blur-[1px]" />
            )}

<<<<<<< HEAD
    <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
    />
            </div >
=======

                {/* Visual helper for "Active" */}
                {
                    isCheckedInHere && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 box-content blur-[1px]" />
                    )
                }
            </div >
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
>>>>>>> serato-track-listening
        </div >
    );
};
