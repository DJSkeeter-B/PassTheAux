import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Series, Event } from '../types';
import { subscribeToSeries, subscribeToAllSeries } from '../services/firebase';
import { getAllTracksSample } from '../services/lexiconService';
import { groupEventsByDate } from '../utils/dateUtils';
import { LogOut, Bell, Plus, Calendar, Edit2, Headphones, Layers, Minimize2, Maximize2, X, Music } from 'lucide-react';
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
    const [isWidgetCollapsed, setIsWidgetCollapsed] = useState(true);
    const isElectron = !!(window as any).electronAPI;

    const toggleFloatingMode = async () => {
        if (!(window as any).electronAPI) return;
        const newState = !isFloating;
        setIsFloating(newState);

        // Always reset to collapsed when enabling, restore size when disabling
        if (newState) {
            setIsWidgetCollapsed(true);
            await (window as any).electronAPI.toggleFloating(true);
            await (window as any).electronAPI.resizeWindow(60, 60); // Much smaller
        } else {
            await (window as any).electronAPI.toggleFloating(false);
            await (window as any).electronAPI.resizeWindow(1000, 800);
        }
    };

    const toggleWidgetCollapse = async () => {
        if (!(window as any).electronAPI) return;
        const newCollapsed = !isWidgetCollapsed;
        setIsWidgetCollapsed(newCollapsed);
        if (newCollapsed) {
            await (window as any).electronAPI.resizeWindow(60, 60);
        } else {
            await (window as any).electronAPI.resizeWindow(400, 600);
        }
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

    // Manage body class for floating mode to suppress global layout styles
    useEffect(() => {
        if (isFloating) {
            document.body.classList.add('floating-widget-mode');
        } else {
            document.body.classList.remove('floating-widget-mode');
        }
        return () => {
            document.body.classList.remove('floating-widget-mode');
        }
    }, [isFloating]);

    const myEvents = user?.role === 'ADMIN' ? events : events.filter(e => e.ownerId === user?.id);

    // WIDGET MODE RENDER (Collapsed)
    if (isFloating && isWidgetCollapsed) {
        return (
            <div className="h-screen w-screen bg-transparent overflow-hidden">
                <div
                    onClick={toggleWidgetCollapse}
                    className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center cursor-pointer group relative shadow-lg"
                    style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                >
                    <Music className="w-8 h-8 text-white drop-shadow-md" />
                    {/* Hover Overlay hint */}
                    <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="text-white opacity-80" size={20} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 h-screen overflow-y-auto transition-all duration-300 ${isFloating ? 'bg-slate-950/90 border border-slate-700/50 rounded-2xl p-4 pb-20' : 'pb-24 px-4 pt-4 bg-slate-950'}`}>
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 z-20 bg-transparent">
                <div className="flex items-center gap-3">
                    {/* Compact Header for Expanded Widget */}
                    {isFloating ? (
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> App Active
                        </h2>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white">DJ Hub</h2>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-bold">ARTIST</span>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    {isElectron && (
                        <>
                            {/* Collapse/Expand Controls for Floating Mode */}
                            {isFloating ? (
                                <div className="flex gap-1 bg-slate-800/80 rounded-lg p-1 backdrop-blur-md">
                                    <button
                                        onClick={toggleWidgetCollapse}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                        title="Minimize to Icon"
                                    >
                                        <Minimize2 size={16} />
                                    </button>
                                    <button
                                        onClick={toggleFloatingMode}
                                        className="p-1.5 hover:bg-red-900/50 rounded text-red-400"
                                        title="Close Floating Mode"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={toggleFloatingMode}
                                    className={`p-2 rounded-lg transition ${isFloating ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                    title="Toggle Floating Mode"
                                >
                                    <Layers size={20} />
                                </button>
                            )}
                        </>
                    )}
                    {!isFloating && (
                        <>
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
                        </>
                    )}
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
                                                            <span>{new Date(evt.date + 'T00:00:00').toDateString()}</span>
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

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingEvent(evt); setShowEventModal(true); }}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition opacity-0 group-hover:opacity-100"
                                                        title="Edit Event Details"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
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

            {/* Lexicon Debug Viewer */}
            {!isFloating && (
                <LexiconDebugViewer />
            )}
        </div>
    );

};

const LexiconDebugViewer: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadLibrary = async () => {
        setLoading(true);
        setError('');
        try {
            console.log("Debug Viewer: Calling getAllTracksSample...");
            const data = await getAllTracksSample();
            console.log("Debug Viewer: Result", data?.length);
            if (!data || data.length === 0) {
                setError("Connection attempt finished but no tracks were returned. Check console for 'Lexicon host not found' or fetch errors.");
            }
            setTracks(data || []);
        } catch (e: any) {
            console.error("Debug Viewer Error:", e);
            setError(`Error loading library: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!expanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => { setExpanded(true); loadLibrary(); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-3 py-2 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2"
                >
                    <Layers size={14} /> Verify Lexicon
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Music className="text-purple-500" size={18} />
                        Lexicon Library Viewer
                    </h3>
                    <button onClick={() => setExpanded(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-4 bg-slate-950/50 flex justify-between items-center shrink-0">
                    <div className="text-sm text-slate-400">
                        {loading ? "Connecting & Syncing..." : `${tracks.length} tracks loaded (sample)`}
                    </div>
                    <button
                        onClick={loadLibrary}
                        disabled={loading}
                        className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded"
                    >
                        {loading ? 'Syncing...' : 'Refresh Library'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                    {/* Error State */}
                    {error && (
                        <div className="p-4 text-center text-red-400 bg-red-900/10 rounded border border-red-900/30">
                            {error}
                            <p className="text-[10px] mt-2 text-slate-500">Ensure Lexicon is running and 'Enable Local API' is on.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 text-xs bg-red-900/50 hover:bg-red-900 text-white px-3 py-1 rounded"
                            >
                                Reload App
                            </button>
                        </div>
                    )}

                    {/* Track List */}
                    {!loading && tracks.map((t, i) => (
                        <div key={t.id || i} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded group border border-transparent hover:border-slate-700/50">
                            {/* Art */}
                            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                {t.artwork ? (
                                    <img src={t.artwork} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <Music size={12} className="text-slate-600" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-200 truncate">{t.title}</div>
                                <div className="text-xs text-slate-500 truncate">{t.artist}</div>
                                {i === 0 && (
                                    <div className="mt-1 p-2 bg-black/50 rounded text-[10px] font-mono text-green-400 overflow-x-auto">
                                        RAW: {JSON.stringify(t).slice(0, 200)}...
                                    </div>
                                )}
                            </div>
                            <div className="ml-auto text-[10px] text-slate-600 font-mono">
                                ID: {t.id}
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {!loading && !error && tracks.length === 0 && (
                        <div className="p-10 text-center text-slate-500">
                            Library is empty or connection failed silently.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
