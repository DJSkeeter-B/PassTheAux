import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Series, Event } from '../types';
import { subscribeToSeries } from '../services/firebase';
import { LogOut, Bell, Plus, Calendar, Edit2, Headphones } from 'lucide-react';
import { SeriesModal } from '../components/SeriesModal';
import { EventModal } from '../components/EventModal';
import { SettingsModal } from '../components/SettingsModal';
import { Settings } from 'lucide-react';

export const DjHubPage: React.FC = () => {
    const { user, logout } = useAuth();
    const { events, venues } = useData();
    const navigate = useNavigate();
    const [series, setSeries] = useState<Series[]>([]);

    // Modals
    const [showSeriesModal, setShowSeriesModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (user?.role === 'DJ' && user.id) {
            const unsubscribe = subscribeToSeries(user.id, setSeries);
            return () => unsubscribe();
        }
    }, [user]);

    const myEvents = events.filter(e => e.ownerId === user?.id);
    const activeEvents = myEvents.filter(e => !e.isArchived);
    const archivedEvents = myEvents.filter(e => e.isArchived).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

    return (
        <div className="pb-24 px-4 pt-4 space-y-6 h-screen overflow-y-auto bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">DJ Hub</h2>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-bold">ARTIST</span>
                </div>
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
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Events</h3>
                    <button
                        onClick={() => { setEditingEvent({}); setShowEventModal(true); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    >
                        <Plus size={14} /> New Event
                    </button>
                </div>

                <div className="space-y-3">
                    {activeEvents.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                            <p className="text-slate-500 text-sm">No active events.</p>
                        </div>
                    ) : (
                        activeEvents.map(evt => (
                            <div key={evt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center group hover:border-purple-500/50 transition cursor-pointer" onClick={() => navigate(`/dj/event/${evt.id}`)}>
                                <div>
                                    <h3 className="font-bold text-white">{evt.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={12} />
                                        <span>{new Date(evt.date).toDateString()}</span>
                                        <span>•</span>
                                        <span className={evt.isLive ? "text-green-400 font-bold" : ""}>{evt.isLive ? 'LIVE' : evt.startTime}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="px-3 py-1.5 bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition">
                                        Dashboard
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Archived Section */}
                {archivedEvents.length > 0 && (
                    <div className="pt-4 mt-6 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-right">Archived History</h4>
                        {archivedEvents.map(evt => (
                            <div key={evt.id} className="bg-slate-900/30 border border-slate-800/50 rounded-lg p-3 flex justify-between items-center mb-2 opacity-60 hover:opacity-100 transition">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-400">{evt.title}</h4>
                                    <p className="text-[10px] text-slate-600">{evt.date}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingEvent(evt); setShowEventModal(true); }}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
