import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music, LogOut, Settings, Trash2, ChevronRight, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SettingsModal } from '../components/SettingsModal';
import { EditProfileModal } from '../components/EditProfileModal';

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
