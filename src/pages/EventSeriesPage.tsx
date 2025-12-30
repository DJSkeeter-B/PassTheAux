
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, Music, ArrowLeft, ChevronDown, Clock, Activity, Heart, Share2 } from 'lucide-react';
import { groupEventsByDate } from '../utils/dateUtils';
import { Series } from '../types';

export const EventSeriesPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { series, events, venues } = useData();
    const { user } = useAuth();

    // State for series selector dropdown
    const [showSeriesDropdown, setShowSeriesDropdown] = useState(false);

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
        // Reset time to start of today for comparison so "Today's" events count as upcoming
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const up = seriesEvents.filter(e => new Date(e.date) >= today);
        const p = seriesEvents.filter(e => new Date(e.date) < today).reverse(); // Most recent past first

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

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dj')}
                    className="absolute top-4 left-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Series Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 md:pl-40">
                    <div className="flex items-start justify-between">
                        <div>
                            {venue && (
                                <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs uppercase tracking-wide mb-2 bg-green-900/30 w-fit px-2 py-1 rounded-lg backdrop-blur-sm border border-green-500/20">
                                    <MapPin size={12} /> {venue.name}
                                </div>
                            )}
                            <div className="relative group">
                                <h1
                                    className="text-3xl md:text-5xl font-black text-white mb-2 cursor-pointer flex items-center gap-2"
                                    onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
                                >
                                    {currentSeries.title}
                                    <ChevronDown size={24} className={`text-slate-400 transition-transform ${showSeriesDropdown ? 'rotate-180' : ''}`} />
                                </h1>

                                {/* Series Selector Dropdown */}
                                {showSeriesDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                        <div className="max-h-60 overflow-y-auto">
                                            {mySeries.map(s => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => {
                                                        navigate(`/series/${s.id}`);
                                                        setShowSeriesDropdown(false);
                                                    }}
                                                    className={`p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50 last:border-0 ${s.id === id ? 'bg-purple-900/10' : ''}`}
                                                >
                                                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                        {s.posterUrl ? (
                                                            <img src={s.posterUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Music size={14} className="text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
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

                            <p className="text-slate-300 text-sm max-w-xl line-clamp-2 md:line-clamp-none">
                                {currentSeries.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                        <Calendar className="text-purple-500 mb-2" size={20} />
                        <div className="text-2xl font-black text-white">{totalEvents}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Events</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                        <Activity className="text-blue-500 mb-2" size={20} />
                        <div className="text-2xl font-black text-white">{totalRequests}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">All-Time Req</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                        <Heart className="text-pink-500 mb-2" size={20} />
                        <div className="text-lg font-bold text-white truncate w-full">{topVibe}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Top Vibe</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800 transition group">
                        <Share2 className="text-green-500 mb-2 group-hover:scale-110 transition" size={20} />
                        <div className="text-sm font-bold text-white">Share Series</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Public Page</div>
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
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">{new Date(evt.date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-xl font-black text-white leading-none">{new Date(evt.date).getDate()}</span>
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
                                            {new Date(evt.date).toLocaleDateString()}
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
        </div>
    );
};
