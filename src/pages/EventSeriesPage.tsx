
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Music, ArrowLeft, ChevronDown, Clock, Activity, Heart, Share2 } from 'lucide-react';
import { groupEventsByDate } from '../utils/dateUtils';
import { Series } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export const EventSeriesPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { series, events, venues } = useData();
    const { user } = useAuth();

    // State for series selector dropdown
    // State for series selector dropdown
    const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);
    const [activeStat, setActiveStat] = useState<'EVENTS' | 'REQUESTS' | 'VIBE'>('EVENTS');
    const [showShareModal, setShowShareModal] = useState(false);

    // Get current series
    const currentSeries = series.find(s => s.id === id);

    // Get all owned series for the dropdown
    const mySeries = useMemo(() => {
        if (!user) return [];
        return user.role === 'ADMIN'
            ? series
            : series.filter(s => s.ownerId === user.id);
    }, [series, user]);

    // Get venue if attached
    const venue = currentSeries?.venueId
        ? venues.find(v => v.id === currentSeries.venueId)
        : null;

    // Filter events for this series
    const seriesEvents = useMemo(() => {
        if (!id) return [];
        return events
            .filter(e => e.seriesId === id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [events, id]);

    // Split into Upcoming and Past
    const { upcoming, past } = useMemo(() => {
        const now = new Date();
        // Reset time to start of today for comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const up = seriesEvents.filter(e => new Date(e.date + 'T00:00:00') >= today);
        const p = seriesEvents.filter(e => new Date(e.date + 'T00:00:00') < today).reverse();

        return { upcoming: up, past: p };
    }, [seriesEvents]);

    // Derived Stats
    const totalEvents = seriesEvents.length;
    // Placeholder stats until backend support exists
    const topVibe = "High Energy";
    const totalRequests = seriesEvents.reduce((acc, curr) => acc + (curr.requestCount || 0), 0);

    if (!currentSeries) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <Music size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Series Not Found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-purple-400 hover:text-purple-300 underline">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* HEREO / COVER SECTION */}
            <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
                {currentSeries.posterUrl ? (
                    <>
                        <div className="absolute inset-0 bg-cover bg-center blur-sm scale-110 opacity-50" style={{ backgroundImage: `url(${currentSeries.posterUrl})` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                        <img
                            src={currentSeries.posterUrl}
                            alt={currentSeries.title}
                            className="absolute bottom-4 left-4 w-32 h-48 object-cover rounded-xl shadow-2xl border-2 border-slate-800/50 z-10 hidden md:block"
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-slate-900 flex items-center justify-center">
                        <Music className="w-32 h-32 text-purple-900/50" />
                    </div>
                )}

                {/* Top Header Bar */}
                <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent">
                    <button
                        onClick={() => navigate('/dj')}
                        className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Series Selector Dropdown */}
                    <div className="relative group">
                        <div
                            className="flex items-center gap-2 cursor-pointer bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl transition border border-white/10 hover:border-white/30"
                            onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
                        >
                            <h1 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-md">
                                {currentSeries.title}
                            </h1>
                            <ChevronDown size={16} className={`text-slate-300 transition-transform ${showSeriesDropdown ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {showSeriesDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="max-h-[60vh] overflow-y-auto">
                                    {mySeries.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                navigate(`/series/${s.id}`);
                                                setShowSeriesDropdown(false);
                                            }}
                                            className={`p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50 last:border-0 ${s.id === id ? 'bg-purple-900/10' : ''}`}
                                        >
                                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {s.posterUrl ? (
                                                    <img src={s.posterUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Music size={16} className="text-slate-600" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-sm font-bold truncate ${s.id === id ? 'text-purple-400' : 'text-white'}`}>{s.title}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {events.filter(e => e.seriesId === s.id).length} events
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1" /> {/* Spacer */}

                    <button
                        className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-green-600 transition"
                        title="Share Series"
                    >
                        <Share2 size={20} />
                    </button>
                </div>

                {/* Series Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 md:pl-40">
                    <div className="flex items-start justify-between">
                        <div>
                            {venue && (
                                <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs uppercase tracking-wide mb-2 bg-green-900/30 w-fit px-2 py-1 rounded-lg backdrop-blur-sm border border-green-500/20">
                                    <MapPin size={12} /> {venue.name}
                                </div>
                            )}
                            <h1 className="text-3xl md:text-5xl font-black text-white mb-2 shadow-black drop-shadow-lg">
                                {currentSeries.title}
                            </h1>

                            <p className="text-slate-300 text-sm max-w-xl line-clamp-2 md:line-clamp-none">
                                {currentSeries.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
                {/* Stats Grid */}
                {/* Interactive Stats Section */}
                <div className="space-y-4">
                    {/* Expanded Detail View */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[160px] flex flex-col justify-center transition-all duration-300">
                        {activeStat === 'EVENTS' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 mb-2 text-purple-400 font-bold uppercase tracking-wider text-xs">
                                    <Calendar size={14} /> Series Activity
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <h3 className="text-4xl font-black text-white">{totalEvents}</h3>
                                    <span className="text-xl text-slate-500 font-bold mb-1">Total Events</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {upcoming.length} upcoming sessions scheduled, with {past.length} completed in history.
                                </p>
                            </div>
                        )}
                        {activeStat === 'REQUESTS' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold uppercase tracking-wider text-xs">
                                    <Activity size={14} /> Engagement
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <h3 className="text-4xl font-black text-white">{totalRequests}</h3>
                                    <span className="text-xl text-slate-500 font-bold mb-1">Total Requests</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Averaging {totalEvents > 0 ? Math.round(totalRequests / totalEvents) : 0} requests per event. The audience is highly engaged!
                                </p>
                            </div>
                        )}
                        {activeStat === 'VIBE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 mb-2 text-pink-400 font-bold uppercase tracking-wider text-xs">
                                    <Heart size={14} /> Vibe Check
                                </div>
                                <div className="flex items-end gap-2 mb-2">
                                    <h3 className="text-4xl font-black text-white">{topVibe}</h3>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Based on song selection and voting patterns, this series consistently delivers high energy tracks.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Selector Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setActiveStat('EVENTS')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeStat === 'EVENTS' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                        >
                            <Calendar size={20} className={`mb-1 ${activeStat === 'EVENTS' ? 'text-purple-400' : ''}`} />
                            <span className="text-[10px] font-bold uppercase">Events</span>
                        </button>
                        <button
                            onClick={() => setActiveStat('REQUESTS')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeStat === 'REQUESTS' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                        >
                            <Activity size={20} className={`mb-1 ${activeStat === 'REQUESTS' ? 'text-blue-400' : ''}`} />
                            <span className="text-[10px] font-bold uppercase">Requests</span>
                        </button>
                        <button
                            onClick={() => setActiveStat('VIBE')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${activeStat === 'VIBE' ? 'bg-pink-600/20 border-pink-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                        >
                            <Heart size={20} className={`mb-1 ${activeStat === 'VIBE' ? 'text-pink-400' : ''}`} />
                            <span className="text-[10px] font-bold uppercase">Vibe</span>
                        </button>
                    </div>
                </div>

                {/* Upcoming Events */}
                <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <span className="w-1 h-6 bg-purple-500 rounded-full" />
                        Upcoming Events
                    </h3>

                    {upcoming.length > 0 ? (
                        <div className="grid gap-3">
                            {upcoming.map(evt => (
                                <div
                                    key={evt.id}
                                    onClick={() => navigate(`/dj/event/${evt.id}`)}
                                    className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl flex items-center justify-between cursor-pointer group transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">{new Date(evt.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-xl font-black text-white leading-none">{new Date(evt.date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-purple-400 transition">{evt.title}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {evt.startTime}</span>
                                                {evt.venueName && <span>• {evt.venueName}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:block">
                                        <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
                                            Manage
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center">
                            <Calendar className="mx-auto mb-2 text-slate-600" size={32} />
                            <p className="text-slate-500 font-bold">No upcoming events scheduled.</p>
                            <button
                                onClick={() => navigate('/dj')}
                                className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-bold"
                            >
                                + Create Event
                            </button>
                        </div>
                    )}
                </div>

                {/* Past Events */}
                {past.length > 0 && (
                    <div className="opacity-75">
                        <h3 className="text-lg font-black text-slate-400 flex items-center gap-2 mb-4">
                            <span className="w-1 h-6 bg-slate-700 rounded-full" />
                            Past History
                        </h3>
                        <div className="grid gap-2">
                            {past.map(evt => (
                                <div
                                    key={evt.id}
                                    onClick={() => navigate(`/dj/event/${evt.id}`)}
                                    className="bg-slate-900/50 border border-slate-800/50 hover:bg-slate-900 p-3 rounded-xl flex items-center justify-between cursor-pointer group transition"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-slate-500 font-mono text-xs w-20">
                                            {new Date(evt.date + 'T00:00:00').toLocaleDateString()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-300 group-hover:text-white transition">{evt.title}</h4>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 px-2 py-1 rounded text-[10px] font-mono text-slate-500 border border-slate-800">
                                        {(evt.requestCount || 0)} reqs
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>


            {
                showShareModal && currentSeries && (
                    <QRCodeModal
                        title={currentSeries.title}
                        subtitle="Event Series"
                        link={`${window.location.origin}/series/${currentSeries.id}`}
                        logoUrl={currentSeries.posterUrl}
                        onClose={() => setShowShareModal(false)}
                    />
                )
            }
        </div >
    );
};
