
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, QrCode, BookOpen, Headphones } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { checkInUser, checkOutUser, getSeriesById } from '../services/firebase';
import { Series } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const EventDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { events, loading } = useData();
    const [series, setSeries] = useState<Series | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);

    const event = events.find(e => e.id === id);

    useEffect(() => {
        if (event?.seriesId) {
            getSeriesById(event.seriesId).then(setSeries);
        }
    }, [event?.seriesId]);

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

        const performCheckIn = async () => {
            // SMART GEOLOCATION BYPASS
            // Logic: Bypass if user is ADMIN, Event Owner, or an Assigned DJ.
            const isOwner = user.id === event.ownerId;
            const isAssignedDj = event.djIds?.includes(user.id);
            const isAdmin = user.role === 'ADMIN';

            const canBypass = isAdmin || isOwner || isAssignedDj;

            try {
                if (canBypass) {
                    console.log("Geolocation Bypass Enabled for Role/Ownership");
                    await checkInUser(user.id, event.id);
                    navigate(`/event/${event.id}/queue`);
                    return;
                }

                if (!event.latitude || !event.longitude) {
                    // No geofence, just check in
                    await checkInUser(user.id, event.id);
                    navigate(`/event/${event.id}/queue`); // Go straight to queue on checkin
                    return;
                }

                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const userLat = position.coords.latitude;
                        const userLong = position.coords.longitude;
                        const dist = getDistanceFromLatLonInKm(userLat, userLong, event.latitude!, event.longitude!);

                        if (dist <= 2.0) {
                            try {
                                await checkInUser(user.id, event.id);
                                // alert("Checked In Successfully!"); // Removed alert to be smoother
                                navigate(`/event/${event.id}/queue`);
                            } catch (e) {
                                console.error("Check-in failed:", e);
                                alert("Failed to check in. Please try again.");
                            }
                        } else {
                            alert(`You are ${dist.toFixed(1)}km away. You must be within 2km of the venue to check in.`);
                        }
                    }, (error) => {
                        console.error("Geolocation error:", error);
                        alert("Could not get your location. Please enable location permissions.");
                    });
                } else {
                    alert("Geolocation is not supported by this browser.");
                }
            } catch (error) {
                console.error("Check-in error:", error);
                alert("An error occurred during check-in.");
            }
        };

        // Check if checked in elsewhere
        if (user.checkedInEventId && user.checkedInEventId !== event.id) {
            setConfirmModal({
                isOpen: true,
                title: "Switch Event?",
                message: "You are currently checked into another event. Checking in here will leave the previous event.",
                onConfirm: performCheckIn
            });
            return;
        }

        await performCheckIn();
    };

    const handleCheckOut = async () => {
        if (!user) return;
        await checkOutUser(user.id);
        navigate('/');
    };

    if (loading) return <div className="p-10 text-center text-white">Loading...</div>;
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
                {event.customQrImageUrl ? (
                    <button
                        onClick={() => setShowQrModal(true)}
                        className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"
                        title="Show Event QR"
                    >
                        <QrCode size={20} />
                    </button>
                ) : (
                    <button
                        onClick={() => setShowQrModal(true)}
                        className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"
                        title="Show Event QR"
                    >
                        <QrCode size={20} />
                    </button>
                )}
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

                    {user?.checkedInEventId === event.id ? (
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/event/${event.id}/queue`)}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20 text-lg"
                            >
                                Go to Queue
                            </button>
                            <button
                                onClick={handleCheckOut}
                                className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-300 font-bold rounded-xl transition border border-red-500/30"
                            >
                                Check Out
                            </button>
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
        </div>
    );
};
