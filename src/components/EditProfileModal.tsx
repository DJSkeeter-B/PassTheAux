import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Camera, Save, Loader2 } from 'lucide-react';
import { updateUserProfile, uploadEventImage } from '../services/firebase';

interface EditProfileModalProps {
    user: UserProfile;
    onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose }) => {
    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
    const [allowRepeatRequests, setAllowRepeatRequests] = useState(user.allowRepeatRequests || false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            setUploading(true);
            // Re-using the event image uploader for now as it handles compression
            // In a larger app, we might want a specific 'avatars/' bucket path.
            const url = await uploadEventImage(file);
            setAvatarUrl(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!username.trim() || !name.trim()) {
            alert("Name and Username are required.");
            return;
        }

        // Strict Username Validation: lowercase letters and numbers only
        const usernameRegex = /^[a-z0-9]+$/;
        if (!usernameRegex.test(username)) {
            alert("Username must contain only lowercase letters and numbers (no spaces or special characters).");
            return;
        }

        try {
            setLoading(true);
            await updateUserProfile(user.id, {
                name: name.trim(),
                // username: username.trim(), // Remove username update
                avatarUrl,
                allowRepeatRequests
            });
            onClose();
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
                    disabled={loading}
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>

                <div className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-purple-500 transition relative">
                                <img
                                    src={avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=random`}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-purple-400" size={24} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full text-white shadow-lg cursor-pointer hover:bg-purple-500 transition">
                                <Camera size={16} />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        {user.role === 'DJ' && (
                            <div className="mt-2 px-3 py-1 bg-purple-900/50 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-200 uppercase tracking-widest">
                                Official DJ Account
                            </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Click camera to change photo</p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1 font-bold uppercase">Display Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition"
                                placeholder="Your Name"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1 font-bold uppercase">Username</label>
                            <div className="relative opacity-50">
                                <span className="absolute left-3 top-3 text-slate-500">@</span>
                                <input
                                    value={username}
                                    readOnly
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-7 text-slate-400 cursor-not-allowed outline-none"
                                    placeholder="username"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Usernames cannot be changed. Contact Admin for changes.
                            </p>
                        </div>

                        {/* DJ Settings */}
                        {user.role === 'DJ' && (
                            <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">DJ Settings</h4>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-white">Allow Repeat Requests</p>
                                        <p className="text-[10px] text-slate-400">If enabled, previously played songs can be requested again in your events.</p>
                                    </div>
                                    <button
                                        onClick={() => setAllowRepeatRequests(!allowRepeatRequests)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${allowRepeatRequests ? 'bg-purple-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${allowRepeatRequests ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleSave}
                        disabled={loading || uploading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
