import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music, LogOut, Settings, Trash2, ChevronRight, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SettingsModal } from '../components/SettingsModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { updateUserProfile } from '../services/firebase';

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    if (!user) return null;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

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

            {/* Role Based Actions */}
            <div className="space-y-3 mb-8">
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

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-full py-4 text-slate-500 hover:text-red-400 font-medium transition flex items-center justify-center gap-2 mt-auto"
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
        </div>
    );
};
