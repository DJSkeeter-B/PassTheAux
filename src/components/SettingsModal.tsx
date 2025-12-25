
import React, { useState } from 'react';
import { deleteUserAccount, reauthenticateUser, requestAccountDeletion, cancelAccountDeletion, updateUserProfile } from '../services/firebase';
import { UserProfile } from '../types';
import { verifyLexiconConnection } from '../services/lexiconService';
import { X, Trash2, Database, Activity, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSuperAdmin } from '../utils/adminUtils';

interface SettingsModalProps {
    user: UserProfile;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, onClose }) => {
    const navigate = useNavigate();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDeleteAccount = async () => {
        if (!password) {
            setError("Password required to confirm.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await reauthenticateUser(password);
            await deleteUserAccount();
            navigate('/');
            window.location.reload(); // Force full reload to clear state
        } catch (e: any) {
            console.error(e);
            if (e.code === 'auth/wrong-password') {
                setError("Incorrect password.");
            } else {
                setError(`Failed to delete account: ${e.message}`);
            }
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
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

                <div className="space-y-6">
                    {/* Profile Section Stub */}
                    <div className="p-4 bg-slate-800/50 rounded-xl flex items-center gap-4">
                        <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="font-bold text-white">{user.name}</p>
                            <p className="text-sm text-slate-500">@{user.username}</p>
                        </div>
                    </div>

                    {/* Developer/Test Mode - REMOVED */}

// ... existing imports ...

                    // ...



                    {/* Danger Zone - User Actions */}
                    <div className="border border-red-900/30 bg-red-900/10 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Danger Zone</h4>

                        {/* USER: Request Deletion */}
                        {!confirmDelete ? (
                            <div className="space-y-3">
                                {user.deletionRequested ? (
                                    <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg text-center">
                                        <p className="text-xs text-yellow-200 font-bold mb-2">Deletion Request Pending</p>
                                        <button
                                            onClick={() => cancelAccountDeletion(user.id)}
                                            className="text-xs text-slate-400 hover:text-white underline"
                                        >
                                            Cancel Request
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-300 font-bold rounded-lg transition border border-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Request Account Deletion
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs text-red-300">
                                    You are requesting to permanently delete your account. An admin will review and process this request.
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmDelete(false)}
                                        className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            requestAccountDeletion(user.id);
                                            setConfirmDelete(false);
                                            alert("Deletion Requested.");
                                        }}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2"
                                    >
                                        Confirm Request
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
