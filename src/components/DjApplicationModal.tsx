import React, { useState, useEffect } from 'react';
import { UserProfile, SocialLink, DjRequestStatus } from '../types';
import { Mic, X, Plus, Trash2, Check, AlertTriangle, ExternalLink, Music } from 'lucide-react';
import { submitDjApplication, processDjApplication, updateUserProfile } from '../services/firebase';

interface DjApplicationModalProps {
    user: UserProfile;
    isOpen: boolean;
    onClose: () => void;
    isReviewMode?: boolean; // If true, shows admin review UI (Approve/Deny)
    adminMode?: boolean; // If true, admin can edit fields
}

// Common Vibes/Genres for Suggestions
const SUGGESTED_VIBES = [
    "Open Format", "House", "Hip Hop", "R&B", "Techno", "Afrobeats", "Dancehall",
    "Reggaeton", "Top 40", "Drum & Bass", "Dubstep", "Electronic", "Latin", "Pop", "Rock",
    "Funk", "Soul", "Disco", "Jazz", "Lo-Fi", "Trap", "Trance", "Ambient"
];

export const DjApplicationModal: React.FC<DjApplicationModalProps> = ({ user, isOpen, onClose, isReviewMode = false, adminMode = false }) => {
    const [bio, setBio] = useState('');
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [vibes, setVibes] = useState<string[]>([]);
    const [newPlatform, setNewPlatform] = useState<SocialLink['platform']>('Instagram');
    const [newUrl, setNewUrl] = useState('');
    const [vibeInput, setVibeInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(!isReviewMode); // Default edit mode for fresh applications
    const [validationError, setValidationError] = useState<string | null>(null);

    // Initialize data from user profile
    useEffect(() => {
        if (isOpen && user) {
            setBio(user.bio || '');
            setLinks(user.socialLinks || []);
            setVibes(user.vibes || []);
            // If viewing existing application, start in read-only unless applying fresh
            if (isReviewMode || user.djStatus === 'PENDING' || user.djStatus === 'APPROVED') {
                setIsEditing(false);
            } else {
                setIsEditing(true);
            }
        }
    }, [isOpen, user, isReviewMode]);

    const addLink = () => {
        if (!newUrl) return;
        setLinks([...links, { platform: newPlatform, url: newUrl }]);
        setNewUrl('');
        setValidationError(null);
    };

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const toggleVibe = (vibe: string) => {
        if (vibes.includes(vibe)) {
            setVibes(vibes.filter(v => v !== vibe));
        } else {
            if (vibes.length >= 5) return alert("Max 5 vibes allowed.");
            setVibes([...vibes, vibe]);
        }
    };

    const addCustomVibe = () => {
        if (!vibeInput.trim()) return;
        const formatted = vibeInput.trim();
        if (!vibes.includes(formatted)) {
            if (vibes.length >= 5) return alert("Max 5 vibes allowed.");
            setVibes([...vibes, formatted]);
        }
        setVibeInput('');
    };

    const validateForm = () => {
        if (!bio.trim()) return "Bio is required.";

        // Check for Instagram
        const hasInsta = links.some(l => l.platform === 'Instagram');
        if (!hasInsta) return "Instagram link is mandatory.";

        // Check for Music Source
        const hasMusic = links.some(l => ['SoundCloud', 'MixCloud', 'Spotify'].includes(l.platform));
        if (!hasMusic) return "At least one music link (SoundCloud, MixCloud, or Spotify) is required.";

        if (vibes.length === 0) return "Please select at least one Vibe.";

        return null;
    };

    const handleSubmit = async () => {
        const error = validateForm();
        if (error) {
            setValidationError(error);
            return;
        }

        try {
            setIsSubmitting(true);
            if (isReviewMode || user.djStatus === 'APPROVED' || user.djStatus === 'PENDING') {
                // Update Profile (Admin or User update)
                await updateUserProfile(user.id, { bio, socialLinks: links, vibes });
                setIsEditing(false);
                alert("Profile Updated");
            } else {
                // New Application
                await submitDjApplication(user.id, bio, links, vibes);
                alert("Application Submitted!");
                onClose();
            }
        } catch (error) {
            console.error(error);
            alert("Failed to submit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (confirm("Approve this DJ application?")) {
            await processDjApplication(user.id, true);
            alert("DJ Approved!");
            onClose();
        }
    };

    const handleDeny = async () => {
        if (confirm("Deny this application?")) {
            await processDjApplication(user.id, false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className={`bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] ${isReviewMode ? 'border-l-4 border-l-blue-500' : ''}`}>

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isReviewMode ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'}`}>
                            {isReviewMode ? <AlertTriangle size={24} /> : <Mic size={24} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {isReviewMode ? 'Review DJ Application' : (user.djStatus === 'APPROVED' ? 'My DJ Profile' : 'Become a Party Host')}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {isReviewMode ? `Applicant: @${user.username}` : 'Join the roster and start hosting events.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={24} /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">

                    {/* Status Badge (Review Mode) */}
                    {isReviewMode && (
                        <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-slate-700">
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="w-12 h-12 rounded-full" />
                            <div>
                                <div className="font-bold text-white text-lg">{user.name}</div>
                                <div className="text-slate-400 text-sm">Current Status: <span className={`font-bold ${user.djStatus === 'PENDING' ? 'text-yellow-500' : user.djStatus === 'APPROVED' ? 'text-green-500' : 'text-slate-500'}`}>{user.djStatus || 'NONE'}</span></div>
                            </div>
                        </div>
                    )}

                    {/* BIO SECTION */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Artist Bio</label>
                        {isEditing ? (
                            <textarea
                                className="w-full bg-slate-950 p-4 rounded-xl border border-slate-700 text-white min-h-[120px] focus:border-purple-500 outline-none transition"
                                placeholder="Tell us about yourself..."
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                            />
                        ) : (
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-slate-300 italic whitespace-pre-wrap">
                                {bio || "No bio provided."}
                            </div>
                        )}
                    </div>

                    {/* VIBES SECTION */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Vibes / Genres {isEditing && <span className="text-red-500">*</span>}</label>
                        {isEditing ? (
                            <div className="space-y-3">
                                {/* Selected Vibes */}
                                <div className="flex flex-wrap gap-2">
                                    {vibes.map(v => (
                                        <div key={v} onClick={() => toggleVibe(v)} className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-red-500 transition flex items-center gap-1">
                                            {v} <X size={12} />
                                        </div>
                                    ))}
                                    {vibes.length === 0 && <span className="text-xs text-slate-500 italic">No vibes selected.</span>}
                                </div>

                                {/* Input Custom */}
                                <div className="flex gap-2">
                                    <input
                                        className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-700 text-sm text-white flex-1"
                                        placeholder="Add custom vibe..."
                                        value={vibeInput}
                                        onChange={e => setVibeInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addCustomVibe()}
                                    />
                                    <button onClick={addCustomVibe} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-lg font-bold">Add</button>
                                </div>

                                {/* Suggested */}
                                <div>
                                    <span className="text-xs text-slate-500 block mb-2">Suggestions:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_VIBES.filter(v => !vibes.includes(v)).slice(0, 10).map(v => (
                                            <button key={v} onClick={() => toggleVibe(v)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-700 transition">
                                                + {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {vibes.length > 0 ? vibes.map(v => (
                                    <span key={v} className="bg-purple-900/40 text-purple-300 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20">
                                        {v}
                                    </span>
                                )) : <span className="text-slate-500 italic text-sm">No vibes selected.</span>}
                            </div>
                        )}
                    </div>

                    {/* LINKS SECTION */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Social Links</label>
                            {isEditing && <span className="text-[10px] text-slate-500 text-right">Instagram & Music Link Mandatory</span>}
                        </div>

                        <div className="space-y-2">
                            {links.map((link, idx) => (
                                <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {link.platform === 'Instagram' && <div className="p-1.5 bg-pink-600/20 text-pink-500 rounded"><ExternalLink size={14} /></div>}
                                        {link.platform === 'SoundCloud' && <div className="p-1.5 bg-orange-600/20 text-orange-500 rounded"><Music size={14} /></div>}
                                        {link.platform === 'Spotify' && <div className="p-1.5 bg-green-600/20 text-green-500 rounded"><Music size={14} /></div>}
                                        {link.platform === 'MixCloud' && <div className="p-1.5 bg-blue-600/20 text-blue-500 rounded"><Music size={14} /></div>}
                                        {(link.platform === 'Facebook' || link.platform === 'Other') && <div className="p-1.5 bg-slate-700 text-slate-400 rounded"><ExternalLink size={14} /></div>}

                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-300">{link.platform}</span>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 truncate hover:underline">{link.url}</a>
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => removeLink(idx)} className="text-slate-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {links.length === 0 && !isEditing && <div className="text-slate-500 italic p-2">No links provided.</div>}
                        </div>

                        {/* Add Link Form */}
                        {isEditing && (
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-2 mt-2">
                                <span className="text-xs font-bold text-slate-400">Add Link</span>
                                <div className="flex gap-2">
                                    <select
                                        className="bg-slate-950 text-white text-xs p-2 rounded border border-slate-700 outline-none"
                                        value={newPlatform}
                                        onChange={(e) => setNewPlatform(e.target.value as any)}
                                    >
                                        <option value="Instagram">Instagram</option>
                                        <option value="SoundCloud">SoundCloud</option>
                                        <option value="MixCloud">MixCloud</option>
                                        <option value="Spotify">Spotify</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        className="flex-1 bg-slate-950 text-white text-xs p-2 rounded border border-slate-700 outline-none placeholder:text-slate-600"
                                        placeholder="https://..."
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                    />
                                    <button onClick={addLink} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Validation Error */}
                        {validationError && (
                            <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                                <AlertTriangle size={14} />
                                {validationError}
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
                    {/* Admin Actions for Pending/Approved Users in Review Mode */}
                    {isReviewMode && user.djStatus === 'PENDING' && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-400 font-bold hover:text-white transition">Cancel</button>
                            <button onClick={handleDeny} className="px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-white rounded-xl font-bold transition border border-slate-700 hover:border-red-500/50">Deny Application</button>
                            <button onClick={handleApprove} className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 transition transform hover:scale-105">Approve DJ</button>
                        </>
                    )}

                    {/* Admin Actions for Already Approved DJs (Just View/Edit) */}
                    {isReviewMode && user.djStatus !== 'PENDING' && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-400 font-bold hover:text-white transition">Close</button>
                            {adminMode && (
                                isEditing
                                    ? <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition">Save Changes</button>
                                    : <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition">Edit Profile</button>
                            )}
                        </>
                    )}

                    {/* Regular User & New Application Actions */}
                    {!isReviewMode && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-400 font-bold hover:text-white transition">Cancel</button>
                            {isEditing && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                </button>
                            )}
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold">Edit</button>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};
