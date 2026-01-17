
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { db, auth } from '../../firebaseConfig';
import { subscribeToDjRequests, subscribeToAllDjs, createVenue, approveVenue, deleteVenue, processDjApplication, saveGlobalConfig, subscribeToSeries, subscribeToAllSeries, adminDeleteUser, cancelAccountDeletion, resetEventsAndRequests, subscribeToDeletionRequests, reauthenticateUser, toggleDjActiveStatus, searchUsers, markAsViewed, checkUserArchive, toggleUserHistory } from '../services/firebase';
// ... (imports unchanged)

// ... inside component ...


import { UserProfile, Event, Series, Venue } from '../types';
import { LogOut, Bell, Plus, Calendar, Headphones, Edit2, Settings, AlertTriangle, Trash2, X, Music, CheckCircle } from 'lucide-react';
import { searchVenuesExternal } from '../services/geminiService';
import { EventModal } from '../components/EventModal';
import { SettingsModal } from '../components/SettingsModal';
import { VenueDetailModal } from '../components/VenueDetailModal';
import { DjApplicationModal } from '../components/DjApplicationModal';
import { groupEventsByDate } from '../utils/dateUtils';
import { isAdmin, isSuperAdmin } from '../utils/adminUtils';

// Simple Error Boundary Component for internal use
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("AdminDashboard Crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-red-500">
                    <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
                    <p className="text-sm text-slate-400">The Admin Dashboard encountered a critical error. Check the console for details.</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 text-white">Reload Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AdminDashboardContent: React.FC = () => {
    const { user, logout } = useAuth();
    // Defensive destructuring to prevent crash if DataContext is loading or null
    const { events = [], venues = [], config = {} } = useData() || {};
    const [pendingDjs, setPendingDjs] = useState<UserProfile[]>([]);
    const [allDjs, setAllDjs] = useState<UserProfile[]>([]);
    const [mySeries, setMySeries] = useState<Series[]>([]); // Series State
    const [deletionRequests, setDeletionRequests] = useState<UserProfile[]>([]);

    // Safety check for user role
    const isSuper = React.useMemo(() => {
        try {
            return user ? isAdmin(user) : false;
        } catch (e) { console.error("isAdmin check failed", e); return false; }
    }, [user]);

    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});
    const [viewingApplication, setViewingApplication] = useState<UserProfile | null>(null);
    const [archiveStatus, setArchiveStatus] = useState<any>(null);
    const [viewingVenue, setViewingVenue] = useState<Venue | null>(null);
    const [userSettings, setUserSettings] = useState(false);



    // Venue state
    const [newVenueName, setNewVenueName] = useState('');
    const [venueSearchResults, setVenueSearchResults] = useState<{ name: string, address: string, latitude: number, longitude: number }[]>([]);
    const [selectedVenueData, setSelectedVenueData] = useState<{ address: string, latitude: number, longitude: number } | null>(null);

    // Config state
    const [localConfig, setLocalConfig] = useState(config);
    // Fix: Deep compare or just set on mount/change. Using JSON.stringify for simple config object stability.
    useEffect(() => {
        if (JSON.stringify(config) !== JSON.stringify(localConfig)) {
            setLocalConfig(config);
        }
    }, [JSON.stringify(config)]);

    // User Management State
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
    const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);



    useEffect(() => {
        if (isSuper) {
            const unsubRequests = subscribeToDjRequests(setPendingDjs);
            const unsubAll = subscribeToAllDjs(setAllDjs);
            const unsubDel = subscribeToDeletionRequests(setDeletionRequests);
            return () => {
                unsubRequests();
                unsubAll();
                unsubDel();
            }
        }
    }, [isSuper]);

    useEffect(() => {
        if (isSuper) {
            return subscribeToAllSeries(setMySeries);
        } else if (user?.id) {
            return subscribeToSeries(user.id, setMySeries);
        }
    }, [user?.id, isSuper]);




    const handleCreateVenue = async () => {
        if (!newVenueName) return;
        await createVenue({
            name: newVenueName,
            status: 'APPROVED',
            ...(selectedVenueData || {})
        });
        setNewVenueName('');
        setSelectedVenueData(null);
        alert("Venue Created");
    };

    // Series Modal and DJ Hub logic will be in separate page/modal, 
    // but Admin dashboard also shows events.

    return (
        <div className="pb-24 pt-4 px-4 space-y-6 h-screen overflow-y-auto bg-slate-950">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
                    {isSuperAdmin(user) && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-bold">SUPERUSER</span>
                    )}
                </div>
                <button
                    onClick={() => setUserSettings(true)}
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

            {/* NOTIFICATIONS SECTION */}
            <section className="mb-6">
                {(() => {
                    // 0. SYSTEM ALERTS (Role Mismatch)
                    const roleMismatch = user && isAdmin(user) && user.role !== 'ADMIN';

                    // 1. Venue Requests (Ready for Approval)
                    const venueRequests = venues.filter(v => v.status === 'PENDING' && v.name && v.address && v.description).map(v => ({
                        type: 'VENUE_REQUEST',
                        id: v.id,
                        title: `Venue Ready: ${v.name}`,
                        subtitle: v.address,
                        data: v
                    }));

                    // 1b. Incomplete Venue Requests
                    const incompleteVenues = venues.filter(v => v.status === 'PENDING' && (!v.name || !v.address || !v.description)).map(v => {
                        const missing = [];
                        if (!v.name) missing.push('Name');
                        if (!v.address) missing.push('Address');
                        if (!v.description) missing.push('Description');
                        return {
                            type: 'MISSING_INFO',
                            id: v.id,
                            title: `Incomplete Request: ${v.name || 'Unnamed Venue'}`,
                            subtitle: `Missing: ${missing.join(', ')}`,
                            data: v,
                            alertType: 'VENUE'
                        };
                    });

                    // 2. DJ Requests
                    const djRequests = pendingDjs.map(dj => ({
                        type: 'DJ_REQUEST',
                        id: dj.id,
                        title: `DJ Application: ${dj.name}`,
                        subtitle: `@${dj.username}`,
                        data: dj
                    }));

                    // 3. Deletion Requests
                    const delRequests = deletionRequests.map(req => ({
                        type: 'DELETION_REQUEST',
                        id: req.id,
                        title: `Deletion Request: ${req.name}`,
                        subtitle: `Requested: ${req.deletionRequestedAt ? new Date(req.deletionRequestedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}`,
                        data: req
                    }));

                    // 4. Missing Info Alerts (Events)
                    const eventAlerts = events.filter(e => !e.isArchived && (!e.imageUrl || !e.djName)).map(e => ({
                        type: 'MISSING_INFO',
                        id: e.id,
                        title: `Missing Info: ${e.title}`,
                        subtitle: !e.imageUrl ? 'Missing Cover Image' : 'Missing DJ Name',
                        data: e,
                        alertType: 'EVENT'
                    }));

                    // 5. Missing Info Alerts (Approved Venues - Legacy cleanup)
                    const venueAlerts = venues.filter(v => v.status === 'APPROVED' && (!v.address || !v.description)).map(v => ({
                        type: 'MISSING_INFO',
                        id: v.id,
                        title: `Missing Info: ${v.name}`,
                        subtitle: 'Venue approved but missing details',
                        data: v,
                        alertType: 'VENUE'
                    }));

                    // 6. New Events (Unseen by Admin)
                    const newEvents = events.filter(e => !e.isArchived && e.hasAdminViewed === false && new Date(e.date) > new Date()).map(e => ({
                        type: 'NEW_EVENT',
                        id: e.id,
                        title: `New Event: ${e.title}`,
                        subtitle: `${new Date(e.date).toLocaleDateString()} @ ${e.venueName}`,
                        data: e
                    }));

                    // 7. New Series (Unseen by Admin)
                    const newSeriesList = mySeries.filter(s => s.hasAdminViewed === false).map(s => ({
                        type: 'NEW_SERIES',
                        id: s.id,
                        title: `New Series: ${s.title}`,
                        subtitle: `${s.frequency} Series`,
                        data: s
                    }));

                    const allNotifications = [...venueRequests, ...incompleteVenues, ...djRequests, ...delRequests, ...eventAlerts, ...venueAlerts, ...newEvents, ...newSeriesList];

                    if (roleMismatch) {
                        allNotifications.unshift({
                            type: 'SYSTEM_ALERT',
                            id: 'role-mismatch',
                            title: 'Role Mismatch Detected',
                            subtitle: `Your DB Role is '${user?.role}' but you are a Super Admin. Write ops will fail.`,
                            data: null
                        } as any);
                    }

                    if (allNotifications.length === 0) return null;

                    return (
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Bell size={16} className="text-purple-400" /> Notifications ({allNotifications.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {allNotifications.map((notif, idx) => (
                                    <div key={`${notif.type}-${notif.id}-${idx}`} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between shadow-sm hover:border-purple-500/30 transition group">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                {notif.type === 'SYSTEM_ALERT' && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                                {notif.type === 'MISSING_INFO' && <AlertTriangle size={14} className="text-yellow-500" />}
                                                {notif.type === 'DELETION_REQUEST' && <Trash2 size={14} className="text-red-500" />}
                                                {(notif.type === 'VENUE_REQUEST' || notif.type === 'DJ_REQUEST') && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                                                <span className={`font-bold text-sm ${notif.type === 'SYSTEM_ALERT' ? 'text-red-400' : 'text-white'}`}>{notif.title}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 ml-6">{notif.subtitle}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {notif.type === 'VENUE_REQUEST' && (
                                                <button onClick={() => setViewingVenue(notif.data as Venue)} className="text-xs bg-purple-600 px-2 py-1 rounded text-white font-bold">Review</button>
                                            )}
                                            {notif.type === 'DJ_REQUEST' && (
                                                <button onClick={() => setViewingApplication(notif.data as UserProfile)} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white font-bold">Review Application</button>
                                            )}
                                            {notif.type === 'DELETION_REQUEST' && (
                                                <button onClick={() => {
                                                    const element = document.getElementById(`deletion-request-${notif.id}`);
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                                        // Wait for scroll to likely finish/start before highlighting
                                                        setTimeout(() => {
                                                            element.classList.add('bg-red-500/40', 'ring-4', 'ring-red-500'); // Stronger highlight

                                                            // Remove after a longer delay
                                                            setTimeout(() => {
                                                                element.classList.remove('bg-red-500/40', 'ring-4', 'ring-red-500');
                                                            }, 3000);
                                                        }, 500);
                                                    } else {
                                                        document.getElementById('danger-zone')?.scrollIntoView({ behavior: 'smooth' });
                                                    }
                                                }} className="text-xs border border-red-500/50 text-red-400 px-2 py-1 rounded font-bold hover:bg-red-900/20">Go to Danger Zone</button>
                                            )}
                                            {notif.type === 'MISSING_INFO' && (
                                                <button
                                                    onClick={() => {
                                                        if ((notif as any).alertType === 'EVENT') {
                                                            setEditingEvent(notif.data as Event);
                                                            setShowEventModal(true);
                                                        } else {
                                                            setViewingVenue(notif.data as Venue);
                                                        }
                                                    }}
                                                    className="text-xs border border-yellow-500/50 text-yellow-400 px-2 py-1 rounded font-bold hover:bg-yellow-900/20"
                                                >
                                                    Fix
                                                </button>
                                            )}
                                            {(notif.type === 'NEW_EVENT' || notif.type === 'NEW_SERIES') && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const targetId = notif.type === 'NEW_EVENT' ? `event-${notif.id}` : `series-${notif.id}`;
                                                            const element = document.getElementById(targetId);
                                                            if (element) {
                                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                element.classList.add('bg-purple-500/30', 'ring-2', 'ring-purple-500');
                                                                setTimeout(() => element.classList.remove('bg-purple-500/30', 'ring-2', 'ring-purple-500'), 2000);
                                                            }
                                                        }}
                                                        className="text-xs bg-slate-800 text-white px-2 py-1 rounded font-bold hover:bg-slate-700"
                                                    >
                                                        Jump
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation(); // Prevent any parent clicks
                                                            try {
                                                                console.log(`Dismissing ${notif.type} ${notif.id}`);
                                                                await markAsViewed(notif.type === 'NEW_EVENT' ? 'events' : 'series', notif.id);
                                                            } catch (err: any) {
                                                                console.error("Dismiss failed", err);
                                                                alert(`Failed to dismiss: ${err.message}`);
                                                            }
                                                        }}
                                                        title="Dismiss"
                                                        className="p-1 text-slate-500 hover:text-white"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </section>

            {/* EVENTS SECTION */}
            <section className="flex flex-col min-h-[300px]">
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-2 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Events</h3>
                    <button
                        onClick={() => { setEditingEvent({}); setShowEventModal(true); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    >
                        <Plus size={14} /> New
                    </button>
                </div>

                <div className="overflow-y-auto pr-1 pb-4 space-y-6 max-h-[500px]">
                    {(() => {
                        // Admin sees ALL events
                        const groupedEvents = groupEventsByDate(events);

                        if (groupedEvents.length === 0) {
                            return (
                                <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-6 text-center">
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
                                                id={`event-${evt.id}`}
                                                className={`
                                                    bg-slate-900 border rounded-xl p-4 flex justify-between items-center group transition duration-500
                                                    ${isPast ? 'border-slate-800/60 opacity-75 hover:opacity-100' : 'border-slate-800 hover:border-slate-600'}
                                                `}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`font-bold ${isPast ? 'text-slate-400' : 'text-white'}`}>
                                                            {evt.title}
                                                        </h3>
                                                        {evt.isLive && <span className="text-[10px] bg-green-900 text-green-200 px-1 rounded font-bold">LIVE</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Calendar size={12} />
                                                        <span>{new Date(evt.date).toDateString()}</span>
                                                        <span className="text-purple-400">@{evt.djName}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setEditingEvent(evt); setShowEventModal(true); }}
                                                        className="p-2 bg-slate-800 text-slate-400 rounded hover:bg-slate-700"
                                                        title="Edit Event"
                                                    >
                                                        <Edit2 size={16} />
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

            {/* SERIES SECTION (New) */}
            <section className="flex flex-col min-h-[200px] mb-6">
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-2 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Series</h3>
                </div>

                <div className="overflow-y-auto pr-1 pb-4 space-y-2 max-h-[300px]">
                    {mySeries.length === 0 ? (
                        <p className="text-slate-500 text-xs italic p-4 border border-dashed border-slate-800 rounded-lg">No series found.</p>
                    ) : (
                        mySeries.map(series => (
                            <div
                                key={series.id}
                                id={`series-${series.id}`}
                                className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center group hover:border-purple-500/30 transition duration-500"
                            >
                                <div>
                                    <h4 className="font-bold text-white text-sm">{series.title}</h4>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span className="text-purple-400">{series.frequency}</span>
                                        <span>•</span>
                                        <span>Owned by {series.ownerId ? series.ownerId.substring(0, 6) : 'Unknown'}...</span>
                                    </div>
                                </div>
                                <div className="text-slate-600">
                                    <Music size={16} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* VENUES SECTION */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Venues</h3>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                placeholder="Search Venue Name..."
                                className="flex-1 bg-slate-950 p-2 rounded border border-slate-700 text-sm text-white"
                                value={newVenueName}
                                onChange={async (e) => {
                                    setNewVenueName(e.target.value);
                                    setSelectedVenueData(null); // Clear manual data on type
                                    if (e.target.value.length >= 3) {
                                        const res = await searchVenuesExternal(e.target.value);
                                        setVenueSearchResults(res);
                                    } else {
                                        setVenueSearchResults([]);
                                    }
                                }}
                            />
                            {/* Allow manual add if needed, or disable to force search */}
                            <button onClick={handleCreateVenue} className="px-4 py-2 bg-purple-600 rounded text-sm font-bold text-white">Add</button>
                        </div>

                        {/* Linked Address Indicator */}
                        {selectedVenueData && (
                            <div className="flex items-center gap-2 text-xs text-green-400 mt-1 bg-green-900/10 p-1 rounded border border-green-900/30">
                                <span className="font-bold">✓ Linked:</span> {selectedVenueData.address}
                            </div>
                        )}

                        {venueSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                {venueSearchResults.map((v, idx) => (
                                    <div key={idx} className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-white border-b border-slate-700/50" onClick={() => {
                                        setNewVenueName(v.name);
                                        setSelectedVenueData({ address: v.address, latitude: v.latitude, longitude: v.longitude });
                                        setVenueSearchResults([]);
                                    }}>
                                        <div className="font-bold">{v.name}</div>
                                        <div className="text-xs text-slate-400">{v.address}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Venues - REQUIRED SECTION */}
                    {venues.some(v => v.status === 'PENDING') && (
                        <div className="space-y-2 mt-4">
                            <h4 className="text-xs font-bold text-yellow-500 uppercase border-b border-yellow-900/30 pb-1">
                                <AlertTriangle size={12} className="inline mr-1" /> Requested Venues (Action Required)
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {venues.filter(v => v.status === 'PENDING').map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => setViewingVenue(v)}
                                        className="flex items-center justify-between bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-lg hover:bg-yellow-900/20 cursor-pointer group transition"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition">{v.name}</span>
                                            <span className="text-xs text-slate-500">{v.address}</span>
                                        </div>
                                        <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">Review</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Approved Venues List */}
                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Approved Venues</h4>
                        <div className="flex flex-wrap gap-2">
                            {venues.filter(v => v.status === 'APPROVED').map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setViewingVenue(v)}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700 transition"
                                >
                                    {v.name}
                                </button>
                            ))}
                            {venues.filter(v => v.status === 'APPROVED').length === 0 && (
                                <p className="text-slate-600 text-xs italic">No approved venues yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* DJS SECTION */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">DJ Mgmt</h3>
                </div>
                <div className="space-y-4">
                    {/* Pending */}
                    {pendingDjs.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="font-bold text-yellow-500 text-xs uppercase">Pending Approval</h4>
                            {pendingDjs.map(dj => (
                                <div key={dj.id} className="bg-slate-900 border border-yellow-900/30 p-3 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <img src={dj.avatarUrl} className="w-8 h-8 rounded-full" alt={dj.name} />
                                        <span className="text-sm font-bold text-white">{dj.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setViewingApplication(dj)} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-bold">Review Application</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Roster */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-500 text-xs uppercase">
                            Admin / DJ Roster ({allDjs.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {allDjs.map(dj => (
                                <div key={dj.id} className={`px-2 py-1 rounded border flex items-center gap-2 ${dj.isActive !== false ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/50 border-red-900/30'}`}>
                                    <button
                                        onClick={() => toggleDjActiveStatus(dj.id, dj.isActive !== false)}
                                        className={`w-2 h-2 rounded-full transition-colors ${dj.isActive !== false ? 'bg-green-500 hover:bg-red-500' : 'bg-red-500 hover:bg-green-500'}`}
                                        title={dj.isActive !== false ? "Click to Deactivate" : "Click to Activate"}
                                    />
                                    <span className={`text-xs font-medium ${dj.isActive !== false ? 'text-slate-300' : 'text-red-400/50 line-through'}`}>
                                        @{dj.username}
                                    </span>
                                    <button onClick={() => setViewingApplication(dj)} className="ml-1 p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition" title="View Profile">
                                        <Headphones size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* USER MANAGEMENT SECTION */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">User Directory</h3>
                </div>

                {/* User Search & Management */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                    <div className="relative">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                                placeholder="Search users by name or username..."
                                onChange={async (e) => {
                                    const term = e.target.value;
                                    setUserSearchTerm(term);
                                    if (term.length >= 3) {
                                        const results = await searchUsers(term);
                                        setUserSearchResults(results);
                                    } else {
                                        setUserSearchResults([]);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    {userSearchResults.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {userSearchResults.map(u => (
                                <div key={u.id} className="p-3 bg-slate-950/50 rounded-lg flex items-center justify-between border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatarUrl} className="w-8 h-8 rounded-full" alt={u.name} />
                                        <div>
                                            <p className="font-bold text-white text-sm">{u.name}</p>
                                            <a href={`/p/${u.username}`} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline">@{u.username}</a>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setSelectedUserForHistory(u);
                                            // Status check
                                            const status = await checkUserArchive(u.email || '');
                                            setArchiveStatus(status);
                                        }}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-white transition"
                                    >
                                        Manage
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* History Management Panel */}
                    {selectedUserForHistory && (
                        <div className="mt-4 p-4 bg-purple-900/10 border border-purple-500/30 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-purple-300 text-sm">History Management: {selectedUserForHistory.name}</h4>
                                    <p className="text-xs text-slate-400">Manage connection to past account data.</p>
                                </div>
                                <button onClick={() => { setSelectedUserForHistory(null); setArchiveStatus(null); }} className="text-slate-500 hover:text-white"><X size={16} /></button>
                            </div>

                            {archiveStatus ? (
                                <div className="space-y-3">
                                    <div className="bg-black/40 p-2 rounded text-xs space-y-1">
                                        <div className="flex justify-between"><span className="text-slate-500">Original UID:</span> <span className="font-mono text-slate-300">{archiveStatus.originalUid}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Deleted At:</span> <span className="text-slate-300">{archiveStatus.deletedAt ? new Date(archiveStatus.deletedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Status:</span>
                                            <span className={`font-bold ${archiveStatus.reconnectedToUid === selectedUserForHistory.id ? 'text-green-400' : 'text-slate-400'}`}>
                                                {archiveStatus.reconnectedToUid === selectedUserForHistory.id ? 'CONNECTED' : (archiveStatus.reconnectedToUid ? 'Linked to Other' : 'DISCONNECTED')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {archiveStatus.reconnectedToUid === selectedUserForHistory.id ? (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm("Disconnect history? Events will revert to original owner.")) return;
                                                    await toggleUserHistory(selectedUserForHistory.id, selectedUserForHistory.email!, 'DISCONNECT');
                                                    setArchiveStatus({ ...archiveStatus, reconnectedToUid: null });
                                                    alert("Disconnected.");
                                                }}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded text-xs"
                                            >
                                                Disconnect History
                                            </button>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm(`Connect history from ${archiveStatus.deletedAt ? new Date(archiveStatus.deletedAt.seconds * 1000).toLocaleDateString() : 'Archive'}?`)) return;
                                                    await toggleUserHistory(selectedUserForHistory.id, selectedUserForHistory.email!, 'CONNECT');
                                                    setArchiveStatus({ ...archiveStatus, reconnectedToUid: selectedUserForHistory.id });
                                                    alert("Connected.");
                                                }}
                                                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!!archiveStatus.reconnectedToUid}
                                            >
                                                {archiveStatus.reconnectedToUid ? 'Unavailable (Linked)' : 'Connect History'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 bg-slate-950/30 rounded text-slate-500 text-xs italic">
                                    No archived history found for {selectedUserForHistory.email}.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Config Section */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">System</h3>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">

                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Master Admin Password (For Danger Zone)</label>
                        <input
                            type="password"
                            placeholder="Set a secure password..."
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                            value={localConfig.adminPassword || ''}
                            onChange={e => setLocalConfig({ ...localConfig, adminPassword: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => saveGlobalConfig(localConfig)} className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded">Save Config</button>
                    </div>
                </div>
            </section>

            {/* DANGER ZONE (Admin Only) */}
            <section id="danger-zone" className="pt-8 border-t border-red-900/30">
                <h3 className="font-bold text-red-500 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} /> Danger Zone
                </h3>

                <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4 space-y-6">
                    {/* Account Deletion Requests */}
                    <div>
                        <h4 className="font-bold text-slate-400 text-xs uppercase mb-3">Deletion Requests ({deletionRequests.length})</h4>
                        {deletionRequests.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No active requests.</p>
                        ) : (
                            <div className="space-y-2">
                                {deletionRequests.map(req => (
                                    <div
                                        key={req.id}
                                        id={`deletion-request-${req.id}`}
                                        className={`bg-slate-900 border border-red-500/20 p-3 rounded-lg flex items-center justify-between transition-all duration-1000 ${viewingVenue?.id === req.id ? 'bg-red-900/40 ring-2 ring-red-500' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-500/10 p-2 rounded-full text-red-400">
                                                <Trash2 size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{req.name}</div>
                                                <div className="text-xs text-slate-400">@{req.username}</div>
                                                <div className="text-[10px] text-red-400 mt-0.5">Requested: {req.deletionRequestedAt ? new Date(req.deletionRequestedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`PERMANENTLY DELETE user ${req.name}? This cannot be undone.`)) {
                                                        try {
                                                            await adminDeleteUser(req.id);
                                                            alert("User and their data deleted successfully.");
                                                        } catch (e: any) {
                                                            alert(`Delete failed: ${e.message || "Unknown error"}`);
                                                            console.error("Admin Delete Error:", e);
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition shadow-lg shadow-red-900/20"
                                            >
                                                Approve Delete
                                            </button>
                                            <button
                                                onClick={() => cancelAccountDeletion(req.id)}
                                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Wipe History */}
                    <div className="pt-4 border-t border-red-900/20">
                        <h4 className="font-bold text-slate-400 text-xs uppercase mb-3">System Actions</h4>
                        <button
                            onClick={async () => {
                                if (window.confirm("CRITICAL WARNING: This will delete ALL Events and Song Requests from the database. This cannot be undone. Are you sure?")) {

                                    // SECURITY CHECK: Master Admin Password
                                    const masterPassword = config.adminPassword;

                                    if (!masterPassword) {
                                        alert("Error: No Master Admin Password set in System Config. Please set one first.");
                                        return;
                                    }

                                    const input = prompt("Enter Master Admin Password to confirm wipe:");

                                    if (input === masterPassword) {
                                        try {
                                            await resetEventsAndRequests();
                                            alert("System Reset Complete. All events and requests have been wiped.");
                                            window.location.reload();
                                        } catch (e: any) {
                                            alert("Reset Failed: " + e.message);
                                        }
                                    } else {
                                        alert("Incorrect Password. Action Cancelled.");
                                    }
                                }
                            }}
                            className="w-full py-4 bg-red-950 hover:bg-red-900 text-red-400 font-bold rounded-xl transition border border-red-900/50 flex items-center justify-center gap-2 group"
                        >
                            <div className="p-1 bg-red-900/50 rounded group-hover:bg-red-800 transition"><AlertTriangle size={18} /></div>
                            Wipe Event History & Requests
                        </button>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                            Requires Master Admin Password. Deletes all Events, Songs, Series, and Votes. Users and Venues remain.
                        </p>
                    </div>
                </div>
            </section>

            {
                showEventModal && (
                    <EventModal
                        editingEvent={editingEvent}
                        setEditingEvent={setEditingEvent}
                        onClose={() => setShowEventModal(false)}
                        currentUserId={user?.id}
                        series={mySeries}
                    />
                )
            }
            {
                viewingApplication && (
                    <DjApplicationModal
                        user={viewingApplication}
                        isOpen={!!viewingApplication}
                        onClose={() => setViewingApplication(null)}
                        isReviewMode={true}
                        adminMode={true}
                    />
                )
            }
            {
                userSettings && user && (
                    <SettingsModal
                        user={user as UserProfile}
                        onClose={() => setUserSettings(false)}
                    />
                )
            }
            {
                viewingVenue && (
                    <VenueDetailModal
                        venue={viewingVenue}
                        onClose={() => setViewingVenue(null)}
                        isEditable={true}
                        onApprove={async (id) => {
                            await approveVenue(id);
                            setViewingVenue(null);
                            alert("Venue Approved");
                        }}
                        onDeny={async (id) => {
                            if (confirm("Reject and delete this venue request?")) {
                                await deleteVenue(id);
                                setViewingVenue(null);
                            }
                        }}
                    />
                )
            }
        </div>

    );
};

export const AdminDashboardPage: React.FC = () => {
    return (
        <ErrorBoundary>
            <AdminDashboardContent />
        </ErrorBoundary>
    );
};
