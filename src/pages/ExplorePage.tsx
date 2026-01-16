import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { subscribeToAllDjs } from '../services/firebase';
import { UserProfile } from '../types';
import { Search, Calendar, Music, MapPin, User, ArrowRight, Layers } from 'lucide-react';

type ExploreTab = 'EVENTS' | 'SERIES' | 'DJS' | 'VENUES';

export const ExplorePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { events, series, venues, loading: dataLoading } = useData();
    const [djs, setDjs] = useState<UserProfile[]>([]);
    const [loadingDjs, setLoadingDjs] = useState(true);
    const [activeTab, setActiveTab] = useState<ExploreTab>((location.state as any)?.tab || 'EVENTS');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsub = subscribeToAllDjs((users) => {
            setDjs(users);
            setLoadingDjs(false);
        });
        return () => unsub();
    }, []);

    const filteredData = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        switch (activeTab) {
            case 'EVENTS':
                return events.filter(e =>
                    e.title.toLowerCase().includes(lowerSearch) ||
                    e.venueName.toLowerCase().includes(lowerSearch) ||
                    e.djName.toLowerCase().includes(lowerSearch)
                );
            case 'SERIES':
                return series.filter(s =>
                    s.title.toLowerCase().includes(lowerSearch) ||
                    s.description.toLowerCase().includes(lowerSearch)
                );
            case 'DJS':
                return djs.filter(d =>
                    d.name.toLowerCase().includes(lowerSearch) ||
                    d.username.toLowerCase().includes(lowerSearch)
                );
            case 'VENUES':
                return venues.filter(v =>
                    v.name.toLowerCase().includes(lowerSearch) ||
                    (v.address && v.address.toLowerCase().includes(lowerSearch))
                );
            default:
                return [];
        }
    }, [activeTab, searchTerm, events, series, djs, venues]);

    const renderEvents = () => {
        const eventsList = filteredData as any[];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const upcoming = eventsList
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const past = eventsList
            .filter(e => new Date(e.date) < today)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="space-y-8">
                {/* Upcoming Section */}
                <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <span className="w-1 h-6 bg-purple-500 rounded-full" />
                        Upcoming Events
                    </h3>
                    <div className="grid gap-4">
                        {upcoming.length > 0 ? upcoming.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/event/${item.id}`, { state: { from: 'explore', tab: 'EVENTS' } })}
                                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 cursor-pointer hover:border-purple-500/50 transition group"
                            >
                                <div className="w-16 h-16 bg-slate-800 rounded-lg shrink-0 overflow-hidden">
                                    <img src={item.imageUrl || item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white truncate group-hover:text-purple-400 transition">{item.title}</h3>
                                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                                        <MapPin size={12} /> {item.venueName}
                                    </p>
                                    <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                        <Calendar size={12} /> {new Date(item.date).toLocaleDateString()} • {item.startTime}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm italic">No upcoming events found.</p>
                        )}
                    </div>
                </div>

                {/* Past Section */}
                {past.length > 0 && (
                    <div className="opacity-75">
                        <h3 className="text-lg font-black text-slate-400 flex items-center gap-2 mb-4">
                            <span className="w-1 h-6 bg-slate-700 rounded-full" />
                            Past History
                        </h3>
                        <div className="grid gap-4">
                            {past.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => navigate(`/event/${item.id}`, { state: { from: 'explore', tab: 'EVENTS' } })}
                                    className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex gap-4 cursor-pointer hover:bg-slate-900 transition group"
                                >
                                    <div className="w-16 h-16 bg-slate-800 rounded-lg shrink-0 overflow-hidden grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition">
                                        <img src={item.imageUrl || item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-300 truncate group-hover:text-white transition">{item.title}</h3>
                                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                            <MapPin size={12} /> {item.venueName}
                                        </p>
                                        <p className="text-slate-600 text-xs flex items-center gap-1 mt-1">
                                            <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSeries = () => (
        <div className="grid gap-4">
            {filteredData.map((item: any) => (
                <div
                    key={item.id}
                    onClick={() => navigate(`/series/${item.id}`, { state: { from: 'explore', tab: 'SERIES' } })}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition group"
                >
                    <div className="h-32 bg-slate-800 relative">
                        {item.posterUrl ? (
                            <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                                <Layers size={48} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-blue-400 transition">{item.title}</h3>
                        </div>
                    </div>
                    <div className="p-3">
                        <p className="text-slate-500 text-xs line-clamp-2">{item.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderDjs = () => (
        <div className="grid grid-cols-2 gap-3">
            {filteredData.map((item: any) => (
                <div
                    key={item.id}
                    // onClick={() => navigate(`/profile/${item.id}`)} // Profile page implementation needed
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:bg-slate-800 transition"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-800 mb-2 overflow-hidden border-2 border-slate-700">
                        <img src={item.avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-white text-sm truncate w-full">{item.name}</h3>
                    <p className="text-slate-500 text-[10px] truncate w-full">@{item.username}</p>
                </div>
            ))}
        </div>
    );

    const renderVenues = () => (
        <div className="grid gap-3">
            {filteredData.map((item: any) => (
                <div
                    key={item.id}
                    onClick={() => navigate(`/venue/${item.id}`, { state: { from: 'explore', tab: 'VENUES' } })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-green-500/50 transition group"
                >
                    <div>
                        <h3 className="font-bold text-white group-hover:text-green-400 transition">{item.name}</h3>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                            <MapPin size={12} /> {item.address || "Address not available"}
                        </p>
                    </div>
                    <div className="text-slate-600">
                        <ArrowRight size={16} />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 pb-24 px-4 pt-20">
            <h1 className="text-3xl font-black text-white mb-6">Explore</h1>

            {/* Search Bar */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-500" />
                </div>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 transition placeholder:text-slate-600"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                <button
                    onClick={() => setActiveTab('EVENTS')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'EVENTS' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    <Calendar size={14} /> Events
                </button>
                <button
                    onClick={() => setActiveTab('SERIES')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'SERIES' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    <Layers size={14} /> Series
                </button>
                <button
                    onClick={() => setActiveTab('DJS')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'DJS' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    <Music size={14} /> DJs
                </button>
                <button
                    onClick={() => setActiveTab('VENUES')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === 'VENUES' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    <MapPin size={14} /> Venues
                </button>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'EVENTS' && renderEvents()}
                {activeTab === 'SERIES' && renderSeries()}
                {activeTab === 'DJS' && renderDjs()}
                {activeTab === 'VENUES' && renderVenues()}

                {filteredData.length === 0 && (
                    <div className="text-center py-12 text-slate-600">
                        <p>No results found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
