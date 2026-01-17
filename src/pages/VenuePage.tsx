import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { MapPin, Calendar, Users, Activity, Layers, Music, ArrowLeft } from 'lucide-react';
import { Event } from '../types';

export const VenuePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { venues, events, series } = useData();

    // Data Filtering
    const venue = venues.find(v => v.id === id);

    const venueEvents = useMemo(() => {
        if (!id) return [];
        return events
            .filter(e => e.venueId === id || e.venueName === venue?.name)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [events, id, venue]);

    const venueSeries = useMemo(() => {
        if (!id) return [];
        return series.filter(s => s.venueId === id);
    }, [series, id]);

    // Stats Calculation
    const stats = useMemo(() => {
        const totalRequests = venueEvents.reduce((acc, curr) => acc + (curr.requestCount || 0), 0);

        // Unique DJs
        const uniqueDjs = new Set<string>();
        venueEvents.forEach(e => {
            if (e.djName) uniqueDjs.add(e.djName);
            // If we have djIds in future, use those: e.djIds?.forEach(id => uniqueDjs.add(id));
        });

        // Vibe Analysis (Simple aggregation of genre tags for now)
        const genreCounts: Record<string, number> = {};
        venueEvents.forEach(e => {
            e.genreTags?.forEach(tag => {
                genreCounts[tag] = (genreCounts[tag] || 0) + 1;
            });
            e.vibeTags?.forEach(tag => {
                genreCounts[tag] = (genreCounts[tag] || 0) + 1;
            });
        });

        const topVibe = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Good Vibes';

        return {
            totalRequests,
            uniqueDjsCount: uniqueDjs.size,
            topVibe,
            djRoster: Array.from(uniqueDjs)
        };
    }, [venueEvents]);

    const recentImage = venueEvents.find(e => e.imageUrl)?.imageUrl;

    const [activeTab, setActiveTab] = useState<'EVENTS' | 'SERIES' | 'ROSTER'>('EVENTS');

    if (!venue) {
        return <div className="p-10 text-center text-white">Venue not found</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Hero Section */}
            <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
                {recentImage ? (
                    <>
                        <div className="absolute inset-0 bg-cover bg-center blur-sm scale-110 opacity-50" style={{ backgroundImage: `url(${recentImage})` }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900" />
                )}


                <div className="absolute top-0 left-0 p-4 z-30">
                    <button
                        onClick={() => {
                            if ((location.state as any)?.from === 'explore') {
                                navigate('/explore', { state: { tab: (location.state as any)?.tab } });
                            } else {
                                navigate(-1);
                            }
                        }}
                        className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-2 shadow-black drop-shadow-lg leading-none">
                        {venue.name}
                    </h1>
                    <div className="flex items-center gap-2 text-slate-300 text-sm font-medium drop-shadow-md">
                        <MapPin size={16} className="text-blue-400" />
                        {venue.address || "Address unavailable"}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                        <Activity size={20} className="text-blue-400 mb-1" />
                        <span className="text-2xl font-black text-white leading-none">{stats.totalRequests}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Requests</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                        <Users size={20} className="text-purple-400 mb-1" />
                        <span className="text-2xl font-black text-white leading-none">{stats.uniqueDjsCount}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">DJs Hosted</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                        <Music size={20} className="text-pink-400 mb-1" />
                        <span className="text-lg font-black text-white leading-tight capitalize truncate w-full px-1">{stats.topVibe}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Top Vibe</span>
                    </div>
                </div>

                {/* Content Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button
                        onClick={() => setActiveTab('EVENTS')}
                        className={`flex-1 pb-3 text-sm font-bold transition ${activeTab === 'EVENTS' ? 'text-white border-b-2 border-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Events
                    </button>
                    <button
                        onClick={() => setActiveTab('SERIES')}
                        className={`flex-1 pb-3 text-sm font-bold transition ${activeTab === 'SERIES' ? 'text-white border-b-2 border-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Series
                    </button>
                    <button
                        onClick={() => setActiveTab('ROSTER')}
                        className={`flex-1 pb-3 text-sm font-bold transition ${activeTab === 'ROSTER' ? 'text-white border-b-2 border-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        DJ Roster
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[200px]">
                    {activeTab === 'EVENTS' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {venueEvents.length > 0 ? venueEvents.map(evt => (
                                <div
                                    key={evt.id}
                                    onClick={() => navigate(`/event/${evt.id}`)}
                                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:border-slate-700 transition group"
                                >
                                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700 shrink-0">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">{new Date(evt.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-xl font-black text-white leading-none">{new Date(evt.date).getDate()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition truncate">{evt.title}</h4>
                                        <p className="text-xs text-slate-500">{evt.djName}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-slate-500 py-8">No events found.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'SERIES' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {venueSeries.length > 0 ? venueSeries.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => navigate(`/series/${s.id}`)}
                                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:border-slate-700 transition"
                                >
                                    <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden shrink-0">
                                        {s.posterUrl ? (
                                            <img src={s.posterUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Layers size={20} className="text-slate-600" /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white transition">{s.title}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-slate-500 py-8">No series hosted here yet.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'ROSTER' && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {stats.djRoster.length > 0 ? stats.djRoster.map((djName, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-white">{djName[0]}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-300 truncate">{djName}</span>
                                </div>
                            )) : (
                                <p className="col-span-2 text-center text-slate-500 py-8">No DJs recorded.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
