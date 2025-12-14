import React, { useState, useEffect } from 'react';
import { Event, Series, Venue } from '../types';
import { Plus, MapPin, Shuffle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { updateEvent, createEvent, uploadEventImage, searchUsers } from '../services/firebase';
import { searchVenuesExternal, getCoordinatesFromLocation } from '../services/geminiService';
import { UserProfile } from '../types';

interface EventModalProps {
    editingEvent: Partial<Event>;
    setEditingEvent: React.Dispatch<React.SetStateAction<Partial<Event>>>;
    onClose: () => void;
    onSave?: () => void;
    currentUserId?: string;
    series: Series[]; // Pass in series if needed, or use context
}

const DEFAULT_EVENT_IMAGES = [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop", // Party Crowd
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop", // DJ Console
    "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop", // Neon
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop", // Club
    "https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=800&auto=format&fit=crop"  // Vibes
];

export const EventModal: React.FC<EventModalProps> = ({ editingEvent, setEditingEvent, onClose, onSave, currentUserId, series }) => {
    const { venues } = useData();
    const [imageUploadProgress, setImageUploadProgress] = useState(false);
    const [venueSearchResults, setVenueSearchResults] = useState<{ name: string, address: string, latitude: number, longitude: number }[]>([]);
    const [isSearchingVenues, setIsSearchingVenues] = useState(false);

    // DJ Search State
    const [djSearchTerm, setDjSearchTerm] = useState('');
    const [djSearchResults, setDjSearchResults] = useState<UserProfile[]>([]);
    const [isSearchingDjs, setIsSearchingDjs] = useState(false);

    // Mock "Selected DJ Objects" (since we only store IDs on event, we might need to fetch them if editing, 
    // but for now we'll rely on the IDs or search results to populate this on fresh search)
    // For editing existing events, we might not show the tags if we don't have the user objects loaded. 
    // Simplification: We will just allow adding new ones for now.
    const [selectedDjObjects, setSelectedDjObjects] = useState<UserProfile[]>([]);

    // Debounced DJ Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (djSearchTerm.length >= 1) {
                setIsSearchingDjs(true);
                const results = await searchUsers(djSearchTerm);
                const currentIds = editingEvent.djIds || [];
                setDjSearchResults(results.filter(u => !currentIds.includes(u.id)));
                setIsSearchingDjs(false);
            } else {
                setDjSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [djSearchTerm, editingEvent.djIds]);

    const addDj = (dj: UserProfile) => {
        const currentIds = editingEvent.djIds || [];
        if (currentIds.length >= 2) return alert("Max 2 DJs");

        setEditingEvent(prev => ({
            ...prev,
            djIds: [...(prev.djIds || []), dj.id],
            // Update legacy display name if first DJ
            djName: (prev.djIds || []).length === 0 ? dj.username : prev.djName
        }));
        setSelectedDjObjects(prev => [...prev, dj]);
        setDjSearchTerm('');
        setDjSearchResults([]);
        markDirty('djIds');
    };

    const removeDj = (id: string) => {
        setEditingEvent(prev => ({
            ...prev,
            djIds: (prev.djIds || []).filter(d => d !== id)
        }));
        setSelectedDjObjects(prev => prev.filter(d => d.id !== id));
        markDirty('djIds');
    };

    // Track which fields users have manually edited to prevent unwanted overwrites
    const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

    const markDirty = (field: string) => {
        setDirtyFields(prev => new Set(prev).add(field));
    };

    const handleSeriesChange = (seriesId: string) => {
        setEditingEvent(prev => ({ ...prev, seriesId }));

        if (!seriesId) return;
        const selectedSeries = series.find(s => s.id === seriesId);
        if (!selectedSeries) return;

        const v = selectedSeries.venueId ? venues.find(v => v.id === selectedSeries.venueId) : null;

        setEditingEvent(prev => {
            const updates: Partial<Event> = {};

            if (!dirtyFields.has('title')) updates.title = selectedSeries.title; // Default logic can append Vol. X later if needed
            if (!dirtyFields.has('description') && selectedSeries.description) updates.description = selectedSeries.description;
            if (!dirtyFields.has('djIds') && selectedSeries.djIds) updates.djIds = selectedSeries.djIds;
            if (!dirtyFields.has('venueName') && v) {
                updates.venueName = v.name;
                updates.latitude = v.latitude;
                updates.longitude = v.longitude;
                updates.distance = v.address;
            }
            if (!dirtyFields.has('imageUrl') && selectedSeries.posterUrl) updates.imageUrl = selectedSeries.posterUrl;

            return { ...prev, ...updates };
        });
    };

    const handleSaveEvent = async () => {
        if (!currentUserId && !editingEvent.ownerId) return;
        try {
            const djIds = editingEvent.djIds || [];
            let status = 'READY';
            let isPublic = editingEvent.isPublic ?? true;

            // Sanitization
            const cleanData: any = {
                ...editingEvent,
                ownerId: editingEvent.ownerId || currentUserId,
                title: editingEvent.title || 'Untitled Event',
                isLive: editingEvent.isLive ?? false,
                acceptingRequests: editingEvent.acceptingRequests ?? true,
                isArchived: editingEvent.isArchived ?? false,
                isPublic,
                status,
                date: editingEvent.date || new Date().toISOString().split('T')[0],
                startTime: editingEvent.startTime || '',
                endTime: editingEvent.endTime || '',
                latitude: editingEvent.latitude ?? null,
                longitude: editingEvent.longitude ?? null,
                distance: editingEvent.distance || '',
                djIds,
                seriesId: editingEvent.seriesId || '',
                venueName: editingEvent.venueName || '',
                description: editingEvent.description || '',
                imageUrl: editingEvent.imageUrl || DEFAULT_EVENT_IMAGES[Math.floor(Math.random() * DEFAULT_EVENT_IMAGES.length)]
            };

            delete cleanData.id;

            if (editingEvent.id) {
                await updateEvent(editingEvent.id, cleanData);
            } else {
                await createEvent(cleanData, currentUserId);
            }
            if (onSave) onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error saving event: " + e);
        }
    };

    const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            setImageUploadProgress(true);
            const url = await uploadEventImage(file);
            setEditingEvent(prev => ({ ...prev, imageUrl: url }));
            setImageUploadProgress(false);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Image upload failed.");
            setImageUploadProgress(false);
        }
    };

    const [venueSearchTerm, setVenueSearchTerm] = useState(editingEvent.venueName || '');

    // Sync local term if editingEvent changes externally (autofills)
    useEffect(() => {
        if (editingEvent.venueName !== venueSearchTerm) {
            setVenueSearchTerm(editingEvent.venueName || '');
        }
    }, [editingEvent.venueName]);

    // Debounced Venue Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (venueSearchTerm.length >= 3) {
                // Only search if it looks like a user typing a new venue, not selecting an existing one
                // We can distinguish by checking if the term matches a known venue exactly? 
                // Actually, standard google maps style is to just search.
                // We'll limit it to when the dropdown is likely requested.
                // For now, simple debounce to external API.
                setIsSearchingVenues(true);
                try {
                    const results = await searchVenuesExternal(venueSearchTerm);
                    setVenueSearchResults(results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearchingVenues(false);
                }
            } else {
                setVenueSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [venueSearchTerm]);

    const selectVenue = (v: { name: string, address: string, latitude: number, longitude: number }) => {
        setEditingEvent(prev => ({
            ...prev,
            venueName: v.name,
            distance: v.address,
            latitude: v.latitude,
            longitude: v.longitude
        }));
        setVenueSearchResults([]);
        // Don't need to update venueSearchTerm here as the effect above might do it, 
        // OR we should update it to match selection.
        setVenueSearchTerm(v.name);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-lg border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white">{editingEvent.id ? 'Edit Event' : 'Create New Event'}</h3>

                <div className="space-y-3">
                    {/* DJ Selection */}
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">DJs / Hosts (Max 2)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(editingEvent.djIds || []).map(id => {
                                // Try to find display object
                                const obj = selectedDjObjects.find(d => d.id === id);
                                return (
                                    <div key={id} className="bg-purple-900/50 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                                        <span>{obj ? obj.username : (id === editingEvent.ownerId ? 'You' : 'DJ')}</span>
                                        <button onClick={() => removeDj(id)} className="hover:text-white"><Plus size={12} className="rotate-45" /></button>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="relative">
                            <input
                                className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white"
                                placeholder="Search DJs..."
                                value={djSearchTerm}
                                onChange={e => setDjSearchTerm(e.target.value)}
                            />
                            {isSearchingDjs && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>}

                            {djSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                    {djSearchResults.map(u => (
                                        <div key={u.id} className="p-2 hover:bg-slate-700 cursor-pointer flex items-center gap-2" onClick={() => addDj(u)}>
                                            <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                            <div className="text-xs text-white font-bold">{u.username}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Event Title</label>
                        <input
                            className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white"
                            value={editingEvent.title || ''}
                            onChange={e => {
                                setEditingEvent({ ...editingEvent, title: e.target.value });
                                markDirty('title');
                            }}
                            placeholder="e.g. Summer Vibes 2024"
                        />
                    </div>

                    {/* Date & Time Section */}
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-700 space-y-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white focus:border-purple-500 outline-none"
                                value={editingEvent.date || ''}
                                max="9999-12-31"
                                onChange={e => {
                                    setEditingEvent({ ...editingEvent, date: e.target.value });
                                    markDirty('date');
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white focus:border-purple-500 outline-none"
                                    value={editingEvent.startTime || ''}
                                    onChange={e => {
                                        setEditingEvent({ ...editingEvent, startTime: e.target.value });
                                        markDirty('startTime');
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">End Time</label>
                                <input
                                    type="time"
                                    className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-white focus:border-purple-500 outline-none"
                                    value={editingEvent.endTime || ''}
                                    onChange={e => {
                                        setEditingEvent({ ...editingEvent, endTime: e.target.value });
                                        markDirty('endTime');
                                    }}
                                />
                            </div>
                        </div>

                        {/* Next Day Indicator Logic */}
                        {editingEvent.startTime && editingEvent.endTime && editingEvent.endTime < editingEvent.startTime && (
                            <div className="text-[10px] text-purple-300 bg-purple-900/20 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-2">
                                <Shuffle size={10} />
                                Event ends the following day ({new Date(new Date(editingEvent.date || '').getTime() + 86400000).toLocaleDateString()})
                            </div>
                        )}
                    </div>

                    {/* Series Selection */}
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Series (Optional)</label>
                        <select
                            className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white"
                            value={editingEvent.seriesId || ''}
                            onChange={e => handleSeriesChange(e.target.value)}
                        >
                            <option value="">None</option>
                            {series.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        {editingEvent.seriesId && !dirtyFields.has('title') && (
                            <p className="text-[10px] text-slate-500 mt-1">
                                Autofilled from "{series.find(s => s.id === editingEvent.seriesId)?.title}"
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Venue / Location</label>
                        <div className="flex gap-2 mb-2">
                            <select
                                className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-white"
                                onChange={(e) => {
                                    const v = venues.find(v => v.name === e.target.value);
                                    if (v) {
                                        setEditingEvent({
                                            ...editingEvent,
                                            venueName: v.name,
                                            latitude: v.latitude,
                                            longitude: v.longitude,
                                            distance: v.address
                                        });
                                    }
                                }}
                                value={venues.find(v => v.name === editingEvent.venueName)?.name || ''}
                            >
                                <option value="">Select Approved Venue...</option>
                                <option value="manual">-- Search / Manual --</option>
                                {venues.filter(v => v.status === 'APPROVED').map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                            </select>
                        </div>

                        {/* Status Warning */}
                        {editingEvent.venueName && !venues.find(v => v.name === editingEvent.venueName && v.status === 'APPROVED') && (
                            <div className="bg-yellow-900/20 border border-yellow-900/50 p-3 rounded-lg flex items-center gap-2 mb-2">
                                <span className="text-xs text-yellow-500 font-bold">
                                    Note: Using an unapproved venue will keep this event as PENDING until the venue is approved by an Admin.
                                </span>
                            </div>
                        )}

                        {/* Venue Search Integration */}
                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-white"
                                    placeholder="Search for a venue..."
                                    value={venueSearchTerm}
                                    onChange={e => {
                                        setVenueSearchTerm(e.target.value);
                                        // Update parent immediately or on selection? 
                                        // Ideally we keep editingEvent in sync for 'manual' entry
                                        setEditingEvent({ ...editingEvent, venueName: e.target.value });
                                    }}
                                />
                                {isSearchingVenues && <div className="p-3"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}
                            </div>

                            {venueSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 max-h-60 overflow-y-auto shadow-2xl">
                                    {venueSearchResults.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0"
                                            onClick={() => selectVenue(result)}
                                        >
                                            <div className="font-bold text-sm text-white">{result.name}</div>
                                            <div className="text-xs text-slate-400">{result.address}</div>
                                        </div>
                                    ))}
                                    <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-900 cursor-pointer" onClick={() => setVenueSearchResults([])}>Close Results</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Cover Image</label>
                        <div className="grid grid-cols-[1fr,auto] gap-2 mb-2">
                            <input
                                className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white text-xs"
                                value={editingEvent.imageUrl || ''}
                                onChange={e => setEditingEvent({ ...editingEvent, imageUrl: e.target.value })}
                                placeholder="https://... (or upload)"
                            />
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelected}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button className="h-full px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xs flex items-center gap-1">
                                    {imageUploadProgress ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Plus size={14} />} Upload
                                </button>
                            </div>
                        </div>
                        {editingEvent.imageUrl && (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                                <img src={editingEvent.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveEvent} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl">
                        {editingEvent.id ? 'Save Changes' : 'Create Event'}
                    </button>
                    <button onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
