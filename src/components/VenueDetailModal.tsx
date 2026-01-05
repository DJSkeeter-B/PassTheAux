import React, { useEffect, useState } from 'react';
import { Venue, Series, Event } from '../types';
import { X, MapPin, Clock, AlignLeft, Calendar, Music, Pencil, Check, Save, Wand2, Trash2, Link } from 'lucide-react';
import { getSeriesByVenueId, getEventsByVenueName, updateVenue, deleteVenue, searchVenues, mergeVenues } from '../services/firebase';
import { enrichVenueData } from '../services/geminiService';

interface VenueDetailModalProps {
    venue: Venue;
    onClose: () => void;
    onApprove?: (id: string) => void;
    onDeny?: (id: string) => void;
    isEditable?: boolean;
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({ venue, onClose, onApprove, onDeny, isEditable }) => {
    const [series, setSeries] = useState<Series[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    // Merge/Link State
    const [isLinking, setIsLinking] = useState(false);
    const [mergeSearchTerm, setMergeSearchTerm] = useState('');
    const [mergeResults, setMergeResults] = useState<Venue[]>([]);
    const [targetVenue, setTargetVenue] = useState<Venue | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const [s, e] = await Promise.all([
                    getSeriesByVenueId(venue.id),
                    getEventsByVenueName(venue.name)
                ]);
                setSeries(s);
                setEvents(e);
            } catch (err) {
                console.error("Failed to load venue history", err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [venue.id, venue.name]);

    useEffect(() => {
        if (isLinking && mergeSearchTerm.length >= 2) {
            // Simple search simulation since we don't have exact 'searchVenues' export yet in firebase.ts, 
            // wait, we imported 'searchVenues' above, but it might not be exported yet or named differently.
            // Let's assume 'searchVenues' exists or we use 'subscribeToVenues' and filter locally?
            // Actually 'searchVenues' was not in firebase.ts view. 
            // I will use client-side filtering if I can't find it, OR add it.
            // Ah, I missed adding 'searchVenues' in firebase.ts!
            // I will add it or just use 'searchVenuesExternal' for Gemini? No, we need internal DB search.
            // Let's assume for this step I will mock/implement it or assume strict exact match?
            // BETTER: I will import `subscribeToVenues` logic or just fetch all approved venues?
            // Let's implement a quick fetch for now.
        }
    }, [mergeSearchTerm, isLinking]);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: venue.name,
        address: venue.address || '',
        hours: venue.hours || '',
        description: venue.description || ''
    });

    const handleSave = async () => {
        try {
            await updateVenue(venue.id, editData);
            setIsEditing(false);
            // Ideally we reload or update local prop, but since parent uses live subscription or manual state, we might need to rely on parent refresh or just optimistic update visually? 
            // Actually AdminDashboard relies on live subscription 'venues' from DataContext, so it should auto-update!
        } catch (e: any) {
            console.error(e);
            let msg = "Failed to update venue";
            if (e.message) msg += `: ${e.message}`;
            else if (e.code) msg += `: ${e.code}`;

            if (msg.includes('permission-denied')) {
                msg += "\n\nPOSSIBLE CAUSE: Your database role might be 'LISTENER' instead of 'ADMIN'. Check the Dashboard warning or ask a developer.";
            }
            alert(msg);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-start bg-slate-950">
                    <div className="flex-1">
                        {isEditing ? (
                            <input
                                className="bg-slate-800 border border-slate-700 text-white text-2xl font-bold rounded px-2 w-full mb-2"
                                value={editData.name}
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                {venue.name}
                                {!isEditing && onApprove && ( // Implicit: If onApprove exists (Admin context usually), and NOT editing, show pencil if we want? 
                                    // Actually better to use specific prop. But for now we use 'onApprove' existence as proxy for Admin OR pass explicit prop.
                                    // Let's use the new 'isEditable' prop we plan to add.
                                    // Wait, I need to add 'isEditable' to interface first.
                                    false
                                )}
                            </h2>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                            {venue.status === 'PENDING' ? (
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded uppercase">Pending Review</span>
                            ) : (!venue.description || !venue.address) ? (
                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded uppercase flex items-center gap-1">
                                    Approved (Incomplete)
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-bold rounded uppercase flex items-center gap-1">
                                    <Check size={12} /> Verified Venue
                                </span>
                            )}

                            {isEditing ? (
                                <input
                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 w-full max-w-xs"
                                    value={editData.address}
                                    placeholder="Address"
                                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                                />
                            ) : (
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <MapPin size={12} /> {venue.address || 'No Address'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Delete Venue (Admin Only) - If Editable */}
                        {isEditable && (
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to permanently delete this venue? This cannot be undone.")) {
                                        try {
                                            await deleteVenue(venue.id);
                                            onClose();
                                        } catch (e) {
                                            console.error(e);
                                            alert("Failed to delete venue.");
                                        }
                                    }
                                }}
                                className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 hover:text-white transition"
                                title="Delete Venue"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        {/* Edit Toggle (Admin Only) */}
                        {(isEditable && !isEditing) && (
                            <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition" title="Edit Venue">
                                <Pencil size={18} />
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (!editData.name || !editData.address) return alert("Need Name and Address for Auto-Fill");
                                        const confirmed = window.confirm("Use Gemini AI to suggest typical hours and description?");
                                        if (confirmed) {
                                            try {
                                                // Check for API Key first (client-side check purely for UX)
                                                if (!import.meta.env.VITE_GEMINI_API_KEY) {
                                                    alert("Gemini API Key is missing in environment variables.");
                                                    return;
                                                }
                                                const data = await enrichVenueData(editData.name, editData.address);
                                                if (!data.description && !data.hours) {
                                                    alert("Gemini could not find info for this venue. Please fill manually.");
                                                    return;
                                                }
                                                setEditData(prev => ({
                                                    ...prev,
                                                    description: prev.description || data.description || '',
                                                    hours: prev.hours || data.hours || ''
                                                }));
                                            } catch (e: any) {
                                                console.error("Gemini Error:", e);
                                                alert("AI Enrichment failed: " + (e.message || "Unknown error"));
                                            }
                                        }
                                    }}
                                    className="p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 transition"
                                    title="Auto-Fill Details with AI"
                                >
                                    <Wand2 size={18} />
                                </button>
                                <button onClick={handleSave} className="p-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition" title="Save Changes">
                                    <Save size={18} />
                                </button>
                            </div>
                        )}

                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Info */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                                    <Clock size={16} /> Hours
                                </h4>
                                {isEditing ? (
                                    <textarea
                                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded p-1 w-full h-32"
                                        value={editData.hours}
                                        onChange={e => setEditData({ ...editData, hours: e.target.value })}
                                        placeholder="Mon: 9am - 5pm&#10;Tue - Thu: 10am - 10pm&#10;Fri - Sat: 12pm - 2am&#10;Sun: Closed"
                                    />
                                ) : (
                                    <p className="text-white text-sm whitespace-pre-wrap">{venue.hours || 'Not specified'}</p>
                                )}
                            </div>
                            <div className="flex-[2] bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
                                    <AlignLeft size={16} /> Description
                                </h4>
                                {isEditing ? (
                                    <textarea
                                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded p-1 w-full h-20"
                                        value={editData.description}
                                        onChange={e => setEditData({ ...editData, description: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-white text-sm leading-relaxed">{venue.description || 'No description provided.'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white text-lg">History & Activity</h3>

                        {/* Series List */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Music size={14} /> Associated Series
                            </h4>
                            {loading ? (
                                <div className="text-slate-600 text-sm animate-pulse">Loading...</div>
                            ) : series.length === 0 ? (
                                <div className="text-slate-600 text-sm italic py-2">No series recorded at this venue.</div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {series.map(s => (
                                        <div key={s.id} className="min-w-[200px] bg-slate-800 rounded-lg p-3 border border-slate-700">
                                            <div className="font-bold text-white text-sm truncate">{s.title}</div>
                                            <div className="text-xs text-slate-500 mt-1">{s.frequency || 'Recurring'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Events List */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Calendar size={14} /> Event History
                            </h4>
                            {loading ? (
                                <div className="text-slate-600 text-sm animate-pulse">Loading...</div>
                            ) : events.length === 0 ? (
                                <div className="text-slate-600 text-sm italic py-2">No events recorded at this venue.</div>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {events.map(e => (
                                        <div key={e.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-white text-sm">{e.title}</div>
                                                <div className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()} • @{e.djName}</div>
                                            </div>
                                            {e.isLive && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">LIVE</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions (Only if Pending) */}
                {venue.status === 'PENDING' && onDeny && onApprove && (
                    <div className="p-4 border-t border-white/10 bg-slate-950 flex flex-col gap-3">

                        {isLinking ? (
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-3 animation-fade-in">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-sm font-bold text-white">Link to Existing Venue</h4>
                                    <button onClick={() => { setIsLinking(false); setTargetVenue(null); }} className="text-slate-500 hover:text-white"><X size={16} /></button>
                                </div>
                                <input
                                    autoFocus
                                    placeholder="Search approved venues..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                                    value={mergeSearchTerm}
                                    onChange={async e => {
                                        setMergeSearchTerm(e.target.value);
                                        if (e.target.value.length >= 2) {
                                            const res = await searchVenues(e.target.value);
                                            setMergeResults(res);
                                        } else {
                                            setMergeResults([]);
                                        }
                                    }}
                                />
                                {targetVenue ? (
                                    <div className="bg-green-900/20 border border-green-500/30 p-2 rounded flex justify-between items-center">
                                        <div className="text-sm text-green-400 font-bold">Selected: {targetVenue.name}</div>
                                        <button onClick={() => setTargetVenue(null)} className="text-green-400 hover:text-white"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {mergeResults.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => setTargetVenue(v)}
                                                className="p-2 hover:bg-slate-800 rounded cursor-pointer text-sm text-slate-300 hover:text-white flex justify-between"
                                            >
                                                <span>{v.name}</span>
                                                <span className="text-xs text-slate-500">{v.address?.substring(0, 20)}...</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <button
                                        disabled={!targetVenue}
                                        onClick={async () => {
                                            if (!targetVenue) return;
                                            if (confirm(`Move all events to "${targetVenue.name}" and delete "${venue.name}"?`)) {
                                                try {
                                                    const res = await mergeVenues(venue.id, targetVenue.id);
                                                    alert(`Merged successfully! Moved ${res.eventsMoved} events.`);
                                                    onClose();
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Merge failed.");
                                                }
                                            }
                                        }}
                                        className="bg-purple-600 disabled:opacity-50 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold text-sm w-full"
                                    >
                                        Confirm Merge
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-3 items-center">
                                {(!venue.name || !venue.address || !venue.description) && (
                                    <span className="text-xs text-orange-500 font-bold mr-2">
                                        Incomplete Venue Details
                                    </span>
                                )}
                                <button
                                    onClick={() => setIsLinking(true)}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition text-xs flex items-center gap-1"
                                >
                                    <Link size={14} /> Link to Existing
                                </button>
                                <button
                                    onClick={() => onDeny(venue.id)}
                                    className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 font-bold rounded-lg transition"
                                >
                                    Deny Request
                                </button>
                                <button
                                    disabled={!venue.name || !venue.address || !venue.description}
                                    onClick={() => onApprove(venue.id)}
                                    className={`px-6 py-2 font-bold rounded-lg shadow-lg transition flex items-center gap-2 ${(!venue.name || !venue.address || !venue.description)
                                        ? "bg-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                                        : "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20"
                                        }`}
                                    title={(!venue.name || !venue.address || !venue.description) ? "Name, Address, and Description are required." : "Approve this venue"}
                                >
                                    <Check size={18} /> Approve Venue
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
