import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { db, auth } from '../../firebaseConfig';
import { subscribeToDjRequests, subscribeToAllDjs, createVenue, approveVenue, processDjApplication, saveGlobalConfig, subscribeToSeries, adminDeleteUser, cancelAccountDeletion, resetEventsAndRequests, subscribeToDeletionRequests, reauthenticateUser } from '../services/firebase';
import { UserProfile, Event, Series } from '../types';
import { LogOut, Bell, Plus, Calendar, Headphones, Edit2, Settings, AlertTriangle, Trash2 } from 'lucide-react';
import { EventModal } from '../components/EventModal';
import { SettingsModal } from '../components/SettingsModal';

export const AdminDashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const { events, venues, config } = useData();
    const [pendingDjs, setPendingDjs] = useState<UserProfile[]>([]);
    const [allDjs, setAllDjs] = useState<UserProfile[]>([]);
    const [mySeries, setMySeries] = useState<Series[]>([]); // Series State
    const [deletionRequests, setDeletionRequests] = useState<UserProfile[]>([]);

    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Partial<Event>>({});
    const [userSettings, setUserSettings] = useState(false);

    // Venue state
    const [newVenueName, setNewVenueName] = useState('');

    // Config state
    const [localConfig, setLocalConfig] = useState(config);
    useEffect(() => { setLocalConfig(config); }, [config]);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            const unsubRequests = subscribeToDjRequests(setPendingDjs);
            const unsubAll = subscribeToAllDjs(setAllDjs);
            const unsubDel = subscribeToDeletionRequests(setDeletionRequests);
            return () => {
                unsubRequests();
                unsubAll();
                unsubDel();
            }
        }
    }, [user?.role]);

    useEffect(() => {
        if (user?.id) {
            return subscribeToSeries(user.id, setMySeries);
        }
    }, [user?.id]);




    const handleCreateVenue = async () => {
        if (!newVenueName) return;
        await createVenue({ name: newVenueName, status: 'APPROVED' });
        setNewVenueName('');
        alert("Venue Created");
    };

    // Series Modal and DJ Hub logic will be in separate page/modal, 
    // but Admin dashboard also shows events.

    return (
        <div className="pb-24 pt-4 px-4 space-y-6 h-screen overflow-y-auto bg-slate-950">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded font-bold">SUPERUSER</span>
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

            {/* EVENTS SECTION */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Events</h3>
                    <button
                        onClick={() => { setEditingEvent({}); setShowEventModal(true); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                    >
                        <Plus size={14} /> New
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Active Events */}
                    {events.filter(e => !e.isArchived).length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-6 text-center">
                            <p className="text-slate-500 text-sm">No active events.</p>
                        </div>
                    ) : (
                        events.filter(e => !e.isArchived).map(evt => (
                            <div key={evt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center group hover:border-slate-600 transition">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">{evt.title}</h3>
                                        {evt.isLive && <span className="text-[10px] bg-green-900 text-green-200 px-1 rounded font-bold">LIVE</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={12} />
                                        <span>{new Date(evt.date).toDateString()}</span>
                                        <span className="text-purple-400">@{evt.djName}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingEvent(evt); setShowEventModal(true); }} className="p-2 bg-slate-800 text-slate-400 rounded hover:bg-slate-700">
                                        <Edit2 size={16} />
                                    </button>
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
                    <div className="flex gap-2">
                        <input
                            placeholder="Venue Name"
                            className="flex-1 bg-slate-950 p-2 rounded border border-slate-700 text-sm text-white"
                            value={newVenueName} onChange={e => setNewVenueName(e.target.value)}
                        />
                        <button onClick={handleCreateVenue} className="px-4 py-2 bg-purple-600 rounded text-sm font-bold text-white">Add</button>
                    </div>

                    {/* Pending Venues */}
                    {venues.some(v => v.status === 'PENDING') && (
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-yellow-500 uppercase">Pending Approval</h4>
                            {venues.filter(v => v.status === 'PENDING').map(v => (
                                <div key={v.id} className="flex items-center justify-between bg-yellow-900/10 border border-yellow-900/30 p-2 rounded">
                                    <span className="text-sm text-slate-300">{v.name}</span>
                                    <button onClick={() => approveVenue(v.id)} className="text-xs text-green-400 font-bold hover:text-green-300">Approve</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                        {venues.map(v => (
                            <span key={v.id} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">{v.name}</span>
                        ))}
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
                                        <button onClick={() => processDjApplication(dj.id, true)} className="px-2 py-1 bg-green-600 text-white text-xs rounded font-bold">Approve</button>
                                        <button onClick={() => processDjApplication(dj.id, false)} className="px-2 py-1 bg-slate-700 text-white text-xs rounded font-bold">Deny</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Roster */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-500 text-xs uppercase">
                            Active Roster ({allDjs.filter(dj => {
                                // Filter logic: DJ has hosted event OR has upcoming event in next 30 days
                                const hasActivity = events.some(e => {
                                    const isDj = e.ownerId === dj.id || (e.djIds && e.djIds.includes(dj.id));
                                    if (!isDj) return false;

                                    const eventDate = new Date(e.date);
                                    const now = new Date();
                                    const oneMonthFromNow = new Date();
                                    oneMonthFromNow.setDate(now.getDate() + 30);

                                    // Past OR Next 30 Days
                                    return eventDate <= oneMonthFromNow;
                                });
                                return hasActivity;
                            }).length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {allDjs.filter(dj => {
                                // Filter logic: DJ has hosted event OR has upcoming event in next 30 days
                                const hasActivity = events.some(e => {
                                    const isDj = e.ownerId === dj.id || (e.djIds && e.djIds.includes(dj.id));
                                    if (!isDj) return false;

                                    const eventDate = new Date(e.date);
                                    const now = new Date();
                                    const oneMonthFromNow = new Date();
                                    oneMonthFromNow.setDate(now.getDate() + 30);

                                    return eventDate <= oneMonthFromNow;
                                });
                                return hasActivity;
                            }).map(dj => (
                                <div key={dj.id} className="bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-medium text-slate-300">@{dj.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Config Section */}
            <section>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 py-2 border-b border-white/10 mb-4">
                    <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">System</h3>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Spotify Token</label>
                        <input
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                            value={localConfig.spotifyToken || ''}
                            onChange={e => setLocalConfig({ ...localConfig, spotifyToken: e.target.value })}
                        />
                    </div>
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
            <section className="pt-8 border-t border-red-900/30">
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
                                    <div key={req.id} className="bg-slate-900 border border-red-500/20 p-3 rounded-lg flex items-center justify-between">
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
                                                            alert("User deleted.");
                                                        } catch (e) { alert("Delete failed"); console.error(e); }
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
                            Requires Master Admin Password. Deletes all Events, Songs, and Votes. Users and Venues remain.
                        </p>
                    </div>
                </div>
            </section>

            {showEventModal && (
                <EventModal
                    editingEvent={editingEvent}
                    setEditingEvent={setEditingEvent}
                    onClose={() => setShowEventModal(false)}
                    currentUserId={user?.id}
                    series={mySeries}
                />
            )}
            {userSettings && user && (
                <SettingsModal
                    user={user}
                    onClose={() => setUserSettings(false)}
                />
            )}
        </div>
    );
};
