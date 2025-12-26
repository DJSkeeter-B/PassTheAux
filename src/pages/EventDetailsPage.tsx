
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, QrCode, BookOpen, Headphones, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { checkInUser, checkOutUser, getSeriesById } from '../services/firebase';
import { Series, Event } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { EventModal } from '../components/EventModal';
import { Edit2 } from 'lucide-react';
import { isAdmin } from '../utils/adminUtils';

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const EventDetailsPage: React.FC = () => {
    // ... params ...
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events, loading } = useData();
    const [series, setSeries] = useState<Series | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});

    // CRATE MODE STATE REMOVED - using route

    const event = events.find(e => e.id === id);

    useEffect(() => {
        if (event?.seriesId) {
            getSeriesById(event.seriesId).then(setSeries);
        }
    }, [event?.seriesId]);

    // ... confirm modal ...
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const handleCheckIn = async () => {
        if (!user || !event) return;

        // Admin Override: Skip Distance Check
        if (isAdmin(user)) {
            try {
                await checkInUser(user.id, event.id);
                // Force local update or rely on real-time listener
                // window.location.reload(); // Not ideal, but 'user' comes from context which updates live?
                // Actually UserContext listens to doc changes, so it should auto-update UI.
            } catch (error) {
                console.error("Check-in failed", error);
                alert("Check-In Failed");
            }
            return;
        }

        // Standard Distance Check
        if (event.geoRestrictionEnabled) {
            if (!event.latitude || !event.longitude) {
                alert("This event has no location set. Creating check-ins disabled.");
                return;
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        const dist = getDistanceFromLatLonInKm(lat, lon, event.latitude!, event.longitude!);

                        if (dist > 2.0) { // 2km Radius
                            alert(`You are too far away checked in (${dist.toFixed(2)}km). Must be within 2km.`);
                            return;
                        }

                        try {
                            await checkInUser(user.id, event.id);
                        } catch (error) {
                            console.error(error);
                            alert("Check-in Failed");
                        }
                    },
                    (error) => {
                        console.error("Geo Error", error);
                        alert("Unable to get location. Please enable location services.");
                    }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
            }
            return;
        }

        // No Geo Restriction
        try {
            await checkInUser(user.id, event.id);
        } catch (error) {
            console.error("Check-in failed", error);
            alert("Check-in Failed");
        }
    };

    const handleCheckOut = async () => {
        // ... existing logic ...
        if (!user) return;
        await checkOutUser(user.id);
    };

    // Navigate to Crate Mode
    const toggleCrateMode = async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.toggleFloating(true);
        navigate(`/crate/${event?.id}`);
    };

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>;
    // ... rest of component ...
    if (!event) return <div className="p-10 text-center text-white">Event not found.</div>;

    return (
        <div className="space-y-6 pb-20 relative bg-slate-950 min-h-screen">
            <div className="relative h-64 bg-slate-800 rounded-b-3xl overflow-hidden shadow-2xl">
                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>

                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur rounded-full text-white hover:bg-black/60 transition"
                >
                    <ArrowLeft size={24} />
                </button>

                <div className="absolute bottom-0 left-0 p-6 w-full bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent">
                    <h2 className="text-3xl font-bold text-white mb-1 leading-none drop-shadow-lg">{event.title}</h2>

                    {/* Prominent DJ Display */}
                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                        <Headphones size={18} />
                        <span className="text-lg font-bold drop-shadow-md">{event.djName}</span>
                    </div>

                    <div className="flex items-center text-slate-300 text-sm gap-2 font-medium drop-shadow-md">
                        <MapPin size={16} /> {event.venueName}
                    </div>
                </div>
                {/* Edit & QR Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                    {/* Edit Button (Owner Only) */}
                    {user?.id === event.ownerId && (
                        <button
                            onClick={() => { setEditingEvent(event); setShowEventModal(true); }}
                            className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"
                            title="Edit Event"
                        >
                            <Edit2 size={20} />
                        </button>
                    )}

                    {event.customQrImageUrl ? (
                        <button
                            onClick={() => setShowQrModal(true)}
                            className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"
                            title="Show Event QR"
                        >
                            <QrCode size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowQrModal(true)}
                            className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"
                            title="Show Event QR"
                        >
                            <QrCode size={20} />
                        </button>
                    )}

                    {/* CRATE MODE TOGGLE (Electron & DJ only) */}
                    {(window.electronAPI && (user?.role === 'ADMIN' || user?.id === event.ownerId || event.djIds?.includes(user?.id || ''))) && (
                        <button
                            onClick={toggleCrateMode}
                            className="p-2 bg-blue-500/20 backdrop-blur rounded-full hover:bg-blue-500/40 text-blue-200 border border-blue-400/30"
                            title="Open Crate (Float Mode)"
                        >
                            <Layers size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4 space-y-6">
                {series && (
                    <div onClick={() => navigate(`/series/${series.id}`)} className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-blue-900/30 transition">
                        <div className="flex items-center gap-2 text-blue-400">
                            <BookOpen size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Part of Series: {series.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-white font-semibold">
                            View History <ArrowLeft size={14} className="rotate-180" />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Time</span>
                        <div className="text-base font-bold text-white">{event.startTime} - {event.endTime}</div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">DJ</span>
                        <div className="text-base font-bold text-purple-400">{event.djName}</div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <p className="text-slate-400 text-sm leading-relaxed">{event.description}</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-300">Live Status</span>
                        {event.isLive ? (
                            <span className="px-3 py-1 bg-green-500 text-black text-xs rounded-full font-bold animate-pulse">LIVE NOW</span>
                        ) : (
                            <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-full font-bold">OFFLINE</span>
                        )}
                    </div>

                    {(user?.checkedInEventId === event.id || isAdmin(user)) ? (
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/event/${event.id}/queue`)}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20 text-lg"
                            >
                                {isAdmin(user) && user?.checkedInEventId !== event.id ? "View Queue (Admin)" : "Go to Queue"}
                            </button>
                            {user?.checkedInEventId === event.id && (
                                <button
                                    onClick={handleCheckOut}
                                    className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-300 font-bold rounded-xl transition border border-red-500/30"
                                >
                                    Check Out
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleCheckIn}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20 text-lg"
                            >
                                Check In
                            </button>
                            <p className="text-[10px] text-center text-slate-500 font-medium uppercase tracking-wide">Must be within 2km of venue</p>
                        </>
                    )}
                </div>
            </div>
            {showQrModal && event && (
                <QRCodeModal event={event} onClose={() => setShowQrModal(false)} />
            )}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            {showEventModal && (
                <EventModal
                    editingEvent={editingEvent}
                    setEditingEvent={setEditingEvent}
                    onClose={() => setShowEventModal(false)}
                    currentUserId={user?.id}
                    series={[]} // Pass empty or fetch if needed for context, but usually ID linkage is enough for basic edits
                />
            )}
        </div>
    );
};
