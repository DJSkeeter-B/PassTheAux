import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music, LogOut, Settings, Trash2, ChevronRight, Edit, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { SettingsModal } from '../components/SettingsModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { DjApplicationModal } from '../components/DjApplicationModal';
import { updateUserProfile, getUserPastActivity } from '../services/firebase';
import { HistoryItem, Song } from '../types';

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const { events } = useData();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isDjAppOpen, setIsDjAppOpen] = useState(false);

    // New State for Profile Enhancements
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'hosting'>('overview');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (user && activeTab === 'activity') {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                try {
                    const data = await getUserPastActivity(user.id);
                    setHistory(data);
                } catch (e) {
                    console.error("Failed to fetch history", e);
                } finally {
                    setLoadingHistory(false);
                }
            };
            fetchHistory();
        }
    }, [user, activeTab]);

    if (!user) return null;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // --- COMPUTED STATS ---
    const calculateStats = () => {
        if (!history.length) return null;

        const allRequests: Song[] = history.flatMap(h => h.myRequests);
        const songMap = new Map<string, { song: Song, count: number, approved: number, denied: number }>();

        let bestRequest = allRequests[0];
        let worstRequest = allRequests[0];

        allRequests.forEach(req => {
            const key = `${req.title}-${req.artist}`;
            const existing = songMap.get(key) || { song: req, count: 0, approved: 0, denied: 0 };

            existing.count++;
            if (req.status === 'APPROVED') existing.approved++;
            if (req.status === 'REJECTED') existing.denied++;

            songMap.set(key, existing);

            if (req.votes > (bestRequest?.votes || -Infinity)) bestRequest = req;
            if (req.votes < (worstRequest?.votes || Infinity)) worstRequest = req;
        });

        const sortedByCount = [...songMap.values()].sort((a, b) => b.count - a.count);
        const sortedByApproved = [...songMap.values()].sort((a, b) => b.approved - a.approved);
        const sortedByDenied = [...songMap.values()].sort((a, b) => b.denied - a.denied);

        return {
            topRequests: sortedByCount.slice(0, 3),
            mostApproved: sortedByApproved[0]?.approved > 0 ? sortedByApproved[0] : null,
            mostDenied: sortedByDenied[0]?.denied > 0 ? sortedByDenied[0] : null,
            bestRequest,
            worstRequest
        };
    };

    const stats = calculateStats();

    // Hosted Events (for DJs)
    const hostedEvents = events.filter(e => e.ownerId === user.id || e.djIds?.includes(user.id));

    return (
        <div className="pb-24 pt-10 px-4 min-h-screen bg-slate-950 text-white">
            <h1 className="text-2xl font-bold mb-6">My Profile</h1>

            {/* Profile Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                        alt={user.username}
                        className="w-16 h-16 rounded-full border-2 border-slate-700 hover:scale-105 transition transform duration-300 object-cover"
                    />
                    <div>
                        <h2 className="text-xl font-bold">{user.name}</h2>
                        <p className="text-slate-400 font-medium">@{user.username}</p>
                        <div className="mt-2 text-xs font-bold px-2 py-0.5 bg-slate-800 rounded-full inline-block text-slate-300 border border-slate-700">
                            {user.role}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsEditProfileOpen(true)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition"
                    title="Edit Profile"
                >
                    <Edit size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-900 rounded-xl mb-6 mx-1">
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'activity' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Activity
                </button>
                {(user.role === 'DJ' || user.role === 'ADMIN') && (
                    <button
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'hosting' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        onClick={() => setActiveTab('hosting')}
                    >
                        Hosting
                    </button>
                )}
            </div>

            {/* CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-3 mb-8 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Tools</h3>

                    {user.role === 'ADMIN' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center justify-between transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-900/20 text-yellow-400 rounded-lg group-hover:bg-yellow-900/30 transition">
                                    <Shield size={20} />
                                </div>
                                <span className="font-semibold text-slate-200">Admin Dashboard</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    )}

                    {(user.role === 'DJ' || user.role === 'ADMIN') && (
                        <button
                            onClick={() => navigate('/dj')}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center justify-between transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-900/20 text-purple-400 rounded-lg group-hover:bg-purple-900/30 transition">
                                    <Music size={20} />
                                </div>
                                <span className="font-semibold text-slate-200">DJ Hub</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    )}

                    {/* Lexicon Integration Toggle (Only for Admins/DJs) */}
                    {(user.role === 'ADMIN' || user.role === 'DJ') && (
                        <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-900/20 text-emerald-400 rounded-lg transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database-zap"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 15 21.84" /><path d="M21 5V8" /><path d="M21 12L13 22L15 15L7 16L11 9L21 9" /></svg>
                                </div>
                                <div className='flex flex-col'>
                                    <span className="font-semibold text-slate-200">Lexicon Connection</span>
                                    <span className="text-xs text-slate-500">Enable Local API Integration</span>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={user.lexiconConnectionEnabled || false}
                                    onChange={async (e) => {
                                        try {
                                            await updateUserProfile(user.id, { lexiconConnectionEnabled: e.target.checked });
                                        } catch (err) {
                                            console.error("Failed to update profile setting:", err);
                                            alert("Failed to update setting. Check console.");
                                        }
                                    }}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    )}

                    {/* Become a DJ / Application Status */}
                    {user.role !== 'DJ' && user.role !== 'ADMIN' && user.djStatus !== 'APPROVED' && (
                        <div className="space-y-3">
                            {user.djStatus === 'PENDING' ? (
                                <div className="w-full bg-slate-900 border border-yellow-900/30 p-4 rounded-xl flex items-center justify-between animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-900/20 text-yellow-500 rounded-lg">
                                            <Mic size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-200">DJ Application Pending</span>
                                            <span className="text-xs text-slate-500">Awaiting Admin Approval</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDjAppOpen(true)} className="text-xs text-yellow-500 font-bold hover:underline">View</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsDjAppOpen(true)}
                                    className="w-full bg-gradient-to-r from-purple-900/20 to-indigo-900/20 hover:from-purple-900/30 hover:to-indigo-900/30 border border-purple-500/30 p-4 rounded-xl flex items-center justify-between transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-purple-900/20 group-hover:scale-110 transition">
                                            <Mic size={20} />
                                        </div>
                                        <div className="text-left">
                                            <span className="font-semibold text-white block">Become a Party Host</span>
                                            <span className="text-xs text-purple-300">Create events & accept requests</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-purple-400 group-hover:translate-x-1 transition" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* View My DJ Profile (For Approved DJs) */}
                    {(user.role === 'DJ' || user.role === 'ADMIN') && (
                        <button
                            onClick={() => setIsDjAppOpen(true)}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center justify-between transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-lg group-hover:bg-indigo-900/30 transition">
                                    <Mic size={20} />
                                </div>
                                <span className="font-semibold text-slate-200">My DJ Profile</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                    )}

                    {/* Settings Trigger */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-xl flex items-center justify-between transition group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 text-slate-400 rounded-lg group-hover:bg-slate-700 transition">
                                <Settings size={20} />
                            </div>
                            <span className="font-semibold text-slate-200">Account Settings</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400" />
                    </button>
                </div>
            )}

            {/* CONTENT: HOSTING (DJS ONLY) */}
            {activeTab === 'hosting' && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold">My Events ({hostedEvents.length})</h3>
                    {hostedEvents.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <p>You haven't hosted any events yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {hostedEvents.map(event => (
                                <div key={event.id} onClick={() => navigate(`/event/${event.id}`)} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 hover:border-slate-700 transition cursor-pointer">
                                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
                                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white line-clamp-1">{event.title}</h4>
                                        <p className="text-xs text-slate-400 mb-1">{event.venueName}</p>
                                        <div className="text-xs text-slate-500">
                                            {event.requestCount || 0} Requests
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* CONTENT: ACTIVITY (STATS) */}
            {activeTab === 'activity' && (
                <div className="space-y-6 animate-fade-in">
                    {loadingHistory ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : !history.length ? (
                        <div className="text-center py-12 text-slate-500">
                            <p>No activity recorded yet.</p>
                            <p className="text-xs mt-1">Join an event and make some requests!</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            {stats && (
                                <div className="space-y-6">
                                    {/* Top Requests */}
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Top Requests</h3>
                                        <div className="grid gap-2">
                                            {stats.topRequests.map((item, idx) => (
                                                <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-slate-700 w-4">{idx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-200 truncate">{item.song.title}</div>
                                                            <div className="text-xs text-slate-500 truncate">{item.song.artist}</div>
                                                        </div>
                                                    </div>
                                                    <div className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-300">
                                                        {item.count}x
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.topRequests.length === 0 && <p className="text-slate-500 text-sm">Not enough data.</p>}
                                        </div>
                                    </section>

                                    {/* Best / Worst */}
                                    <section className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                                <div className="p-1 bg-emerald-500/10 rounded"><ChevronRight className="rotate-[-90deg]" size={14} /></div>
                                                <span className="text-xs font-bold uppercase">Best Request</span>
                                            </div>
                                            {stats.bestRequest ? (
                                                <div>
                                                    <div className="font-bold text-slate-200 text-sm line-clamp-1">{stats.bestRequest.title}</div>
                                                    <div className="text-xs text-slate-500 mb-2">{stats.bestRequest.artist}</div>
                                                    <div className="text-lg font-bold text-white">{stats.bestRequest.votes} <span className="text-xs font-normal text-slate-500">votes</span></div>
                                                </div>
                                            ) : <span className="text-xs text-slate-500">N/A</span>}
                                        </div>

                                        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2 text-rose-400">
                                                <div className="p-1 bg-rose-500/10 rounded"><ChevronRight className="rotate-90" size={14} /></div>
                                                <span className="text-xs font-bold uppercase">Worst Request</span>
                                            </div>
                                            {stats.worstRequest ? (
                                                <div>
                                                    <div className="font-bold text-slate-200 text-sm line-clamp-1">{stats.worstRequest.title}</div>
                                                    <div className="text-xs text-slate-500 mb-2">{stats.worstRequest.artist}</div>
                                                    <div className="text-lg font-bold text-white">{stats.worstRequest.votes} <span className="text-xs font-normal text-slate-500">votes</span></div>
                                                </div>
                                            ) : <span className="text-xs text-slate-500">N/A</span>}
                                        </div>
                                    </section>

                                    {/* Approval Stats */}
                                    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                        <div className="p-4 border-b border-slate-800">
                                            <h3 className="text-sm font-bold text-slate-200">Request Performance</h3>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-slate-800">
                                            <div className="p-4">
                                                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Most Approved</div>
                                                {stats.mostApproved ? (
                                                    <div>
                                                        <div className="font-medium text-slate-200 text-sm line-clamp-1">{stats.mostApproved.song.title}</div>
                                                        <div className="text-xs text-green-400 mt-1">{stats.mostApproved.approved} Approvals</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-600">No approvals yet</span>}
                                            </div>
                                            <div className="p-4">
                                                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Most Denied</div>
                                                {stats.mostDenied ? (
                                                    <div>
                                                        <div className="font-medium text-slate-200 text-sm line-clamp-1">{stats.mostDenied.song.title}</div>
                                                        <div className="text-xs text-red-400 mt-1">{stats.mostDenied.denied} Denials</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-600">No denials yet</span>}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* Event History List */}
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Event History</h3>
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <div key={item.event.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-200">{item.event.title}</h4>
                                                    <p className="text-xs text-slate-400">{new Date(item.event.date).toLocaleDateString()} @ {item.event.venueName}</p>
                                                </div>
                                                <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                                                    {item.myRequests.length} Req
                                                </div>
                                            </div>
                                            {/* Mini strip of requests */}
                                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                                {item.myRequests.map(req => (
                                                    <div key={req.id} className="flex-shrink-0 w-12 h-12 rounded bg-slate-800 overflow-hidden relative">
                                                        <img src={req.coverUrl} alt={req.title} className="w-full h-full object-cover opacity-70" />
                                                        {req.status === 'APPROVED' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-tl"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-full py-4 text-slate-500 hover:text-red-400 font-medium transition flex items-center justify-center gap-2 mt-8 border-t border-slate-800/50 pt-8"
            >
                <LogOut size={18} /> Sign Out
            </button>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <SettingsModal user={user} onClose={() => setIsSettingsOpen(false)} />
            )}
            {isEditProfileOpen && (
                <EditProfileModal user={user} onClose={() => setIsEditProfileOpen(false)} />
            )}
            {isDjAppOpen && (
                <DjApplicationModal
                    user={user}
                    isOpen={isDjAppOpen}
                    onClose={() => setIsDjAppOpen(false)}
                    isReviewMode={user.role === 'DJ' || user.djStatus === 'PENDING'} // Review mode if you already applied
                    adminMode={false} // Users only view/submit their own
                />
            )}
        </div>
    );
};
