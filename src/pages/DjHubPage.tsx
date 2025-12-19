import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Series, Event } from '../types';
import { subscribeToSeries, subscribeToAllSeries } from '../services/firebase';
import { groupEventsByDate } from '../utils/dateUtils';
import { LogOut, Bell, Plus, Calendar, Edit2, Headphones, Layers } from 'lucide-react';
import { SeriesModal } from '../components/SeriesModal';
import { EventModal } from '../components/EventModal';
import { SettingsModal } from '../components/SettingsModal';
import { Settings } from 'lucide-react';

export const DjHubPage: React.FC = () => {
    const { user, logout } = useAuth();
    const { events, venues } = useData();
    const navigate = useNavigate();
    const [series, setSeries] = useState<Series[]>([]);

    // Electron Floating State
    const [isFloating, setIsFloating] = useState(false);
    const isElectron = !!window.electronAPI;

    const toggleFloatingMode = async () => {
        if (!window.electronAPI) return;
        const newState = !isFloating;
        setIsFloating(newState);
        await window.electronAPI.toggleFloating(newState);
    };

    // Modals
    const [showSeriesModal, setShowSeriesModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            const unsubscribe = subscribeToAllSeries(setSeries);
            return () => unsubscribe();
        } else if (user?.role === 'DJ' && user.id) {
            const unsubscribe = subscribeToSeries(user.id, setSeries);
            return () => unsubscribe();
        }
    }, [user]);

    const myEvents = user?.role === 'ADMIN' ? events : events.filter(e => e.ownerId === user?.id);

    return (
        <div className={`pb-24 px-4 pt-4 space-y-6 h-screen overflow-y-auto transition-colors duration-300 ${isFloating ? 'bg-slate-950/80' : 'bg-slate-950'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">DJ Hub</h2>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-bold">ARTIST</span>
                </div>
                <div className="flex gap-2">
                    {isElectron && (
                        <button
                            onClick={toggleFloatingMode}
                            className={`p-2 rounded-lg transition ${isFloating ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            title="Toggle Floating Mode"
                        >
                            <Layers size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => logout()}
                        className="p-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition"
                        title="Log Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* RECENT ACTIVITY (Stub) */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Bell size={14} /> Recent Activity
                    </h3>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-slate-500 text-sm italic">No recent notifications.</p>
                </div>
            </section>

            {/* SERIES SECTION */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">My Series</h3>
                    <button onClick={() => setShowSeriesModal(true)} className="text-xs text-purple-400 font-bold px-2 py-1 hover:bg-purple-900/20 rounded flex items-center gap-1">
                        <Plus size={12} /> New Series
                    </button>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {series.length === 0 ? (
                        <div onClick={() => setShowSeriesModal(true)} className="min-w-[140px] h-[100px] bg-slate-900 border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 text-slate-500 hover:text-purple-400 transition">
                            <Plus size={24} />
                            <span className="text-xs font-bold mt-2">Create First</span>
                        </div>
                    ) : (
                        series.map(s => (
                            <div key={s.id} onClick={() => navigate(`/series/${s.id}`)} className="min-w-[140px] bg-slate-900 p-3 rounded-xl border border-slate-700 cursor-pointer hover:border-purple-500 relative group overflow-hidden">
                                <div className="relative z-10">
                                    <p className="font-bold text-sm truncate text-white mb-1">{s.title}</p>
                                    <p className="text-[10px] text-slate-500">{events.filter(e => e.seriesId === s.id).length} events</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* EVENTS SECTION */}
            <section className="flex flex-col min-h-0 flex-1">
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-2 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Events</h3>
                    <button
                        onClick={() => { setEditingEvent({}); setShowEventModal(true); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    >
                        <Plus size={14} /> New Event
                    </button>
                </div>

                <div className="overflow-y-auto pr-1 pb-10 space-y-6 min-h-0 flex-1">
                    {(() => {
                        // Combine logic: Admin sees all, DJ sees own.
                        const myEvents = user?.role === 'ADMIN' ? events : events.filter(e => e.ownerId === user?.id);

                        // Use categorization utility
                        const groupedEvents = groupEventsByDate(myEvents);

                        if (groupedEvents.length === 0) {
                            return (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                    <p className="text-slate-500 text-sm">No events found.</p>
                                </div>
                            );
                        }

                        return groupedEvents.map(group => (
                            <div key={group.category}>
                                <h4 className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 py-1 text-xs font-bold text-slate-500 uppercase mb-2 border-b border-slate-800/50">
                                    {group.category}
                                </h4>
                                <div className="space-y-2">
                                    {group.events.map(evt => {
                                        const isPast = group.category !== 'Today' && group.category !== 'Upcoming';

                                        return (
                                            <div
                                                key={evt.id}
                                                onClick={() => navigate(`/dj/event/${evt.id}`)}
                                                className={`
                                                    rounded-xl p-3 border transition cursor-pointer flex justify-between items-center group
                                                    ${isPast ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700' : 'bg-slate-900 border-slate-800 hover:border-purple-500/50'}
                                                `}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`font-bold ${isPast ? 'text-slate-400' : 'text-white'}`}>
                                                            {evt.title}
                                                        </h3>
                                                        {evt.isLive && <span className="text-[10px] bg-green-900 text-green-200 px-1 rounded font-bold">LIVE</span>}

                                                        {(() => {
                                                            const v = venues.find(v => v.id === evt.venueId || v.name === evt.venueName);
                                                            if (v && v.status === 'PENDING') {
                                                                return (
                                                                    <span className="text-[10px] bg-yellow-900/40 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Venue Pending
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        {/* For Past events, the DATE is crucial. Start with it. */}
                                                        <div className={`flex items-center gap-1 ${isPast ? 'text-slate-300 font-medium' : ''}`}>
                                                            <Calendar size={12} />
                                                            <span>{new Date(evt.date).toDateString()}</span>
                                                        </div>

                                                        {!isPast && (
                                                            <>
                                                                <span>•</span>
                                                                <span className={evt.isLive ? "text-green-400 font-bold" : ""}>
                                                                    {evt.isLive ? 'LIVE' : evt.startTime}
                                                                </span>
                                                            </>
                                                        )}

                                                        {/* Show Venue for context */}
                                                        {evt.venueName && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="truncate max-w-[150px]">{evt.venueName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button className={`
                                                        px-3 py-1.5 rounded-lg text-xs font-bold transition
                                                        ${isPast ? 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white'}
                                                    `}>
                                                        {isPast ? 'History' : 'Dashboard'}
                                                    </button>

                                                    {isPast && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingEvent(evt); setShowEventModal(true); }}
                                                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition opacity-0 group-hover:opacity-100"
                                                            title="Edit Event Details"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </section>

            {showEventModal && (
                <EventModal
                    editingEvent={editingEvent}
                    setEditingEvent={setEditingEvent}
                    onClose={() => setShowEventModal(false)}
                    currentUserId={user?.id}
                    series={series}
                />
            )}

            {showSeriesModal && user?.id && (
                <SeriesModal
                    onClose={() => setShowSeriesModal(false)}
                    currentUserId={user.id}
                />
            )}
            {showSettings && user && (
                <SettingsModal
                    user={user}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );

};
