import React, { useState, useEffect } from 'react';
import { Event, Series, Venue } from '../types';
import { Plus, MapPin, Shuffle, X as XIcon, Calendar, ArrowLeft, Check, Music, CornerDownRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { updateEvent, createEvent, uploadEventImage, searchUsers, searchDjs, createVenue, updateEventAsAdmin, subscribeToUserProfile, addVibeTag } from '../services/firebase';
import { searchVenuesExternal, getCoordinatesFromLocation } from '../services/geminiService';
import { getLexiconPlaylists } from '../services/lexiconService';
import { UserProfile } from '../types';
import { SeriesModal } from './SeriesModal';
import { MusicSourceConfig } from './MusicSourceConfig';
import { Database } from 'lucide-react';

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

// --- TIME PICKER COMPONENT ---
const TimePicker12h = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    // Parse 24h value to 12h parts
    const parseTime = (val: string) => {
        if (!val) return { h: '10', m: '00', p: 'PM' };
        const [h24, m] = val.split(':').map(Number);
        const p = h24 >= 12 ? 'PM' : 'AM';
        const h = h24 % 12 || 12;
        return {
            h: h.toString(),
            m: m < 10 ? `0${m}` : m.toString(),
            p
        };
    };

    const { h, m, p } = parseTime(value);

    const updateTime = (newH: string, newM: string, newP: string) => {
        let hour = parseInt(newH);
        if (newP === 'PM' && hour !== 12) hour += 12;
        if (newP === 'AM' && hour === 12) hour = 0;
        const h24Str = hour < 10 ? `0${hour}` : hour.toString();
        // Ensure Minutes are 2 digits?? They are coming from select so they should be.
        const mStr = newM.length === 1 ? `0${newM}` : newM;
        onChange(`${h24Str}:${mStr}`);
    };

    // Generate Minutes (00, 05, ... 55)
    const minutes = Array.from({ length: 12 }, (_, i) => {
        const val = i * 5;
        return val < 10 ? `0${val}` : val.toString();
    });

    return (
        <div className="flex bg-slate-900 rounded border border-slate-600 p-1 gap-1">
            <select
                value={h}
                onChange={(e) => updateTime(e.target.value, m, p)}
                className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer hover:text-purple-400 text-center w-10 appearance-none pl-2"
            >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                    <option key={hour} value={hour} className="bg-slate-900">{hour}</option>
                ))}
            </select>
            <span className="text-slate-500 font-bold">:</span>
            <select
                value={m}
                onChange={(e) => updateTime(h, e.target.value, p)}
                className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer hover:text-purple-400 text-center w-10 appearance-none"
            >
                {minutes.map(min => (
                    <option key={min} value={min} className="bg-slate-900">{min}</option>
                ))}
            </select>
            <div className="w-[1px] bg-slate-700 mx-1"></div>
            <button
                type="button"
                onClick={() => updateTime(h, m, p === 'AM' ? 'PM' : 'AM')}
                className={`text-xs font-bold px-1 rounded ${p === 'AM' ? 'text-slate-400 hover:text-white' : 'text-purple-400 hover:text-purple-300'}`}
            >
                {p}
            </button>
        </div>
    );
};

export const EventModal: React.FC<EventModalProps> = ({ editingEvent, setEditingEvent, onClose, currentUserId, series = [], onSave }) => {
    const { venues, config } = useData(); // Context access
    const { user } = useAuth();
    const [imageUploadProgress, setImageUploadProgress] = useState(false);
    const [venueSearchResults, setVenueSearchResults] = useState<{ name: string, address: string, latitude: number, longitude: number }[]>([]);
    const [isSearchingVenues, setIsSearchingVenues] = useState(false);
    const [venueSearchTerm, setVenueSearchTerm] = useState('');

    // Wizard State
    const [step, setStep] = useState(editingEvent.id ? 2 : 1); // 1 = Series Context, 2 = Details

    // New Modal State
    const [showSeriesModal, setShowSeriesModal] = useState(false);

    // Manual Venue Request State
    const [showManualVenueForm, setShowManualVenueForm] = useState(false);
    const [manualVenueData, setManualVenueData] = useState({
        name: '',
        address: '',
        hours: '',
        description: ''
    });

    // DJ Search State
    const [djSearchTerm, setDjSearchTerm] = useState('');
    const [djSearchResults, setDjSearchResults] = useState<UserProfile[]>([]);
    const [isSearchingDjs, setIsSearchingDjs] = useState(false);
    const [selectedDjObjects, setSelectedDjObjects] = useState<UserProfile[]>([]);

    // Vibe Tags State
    const [tagInput, setTagInput] = useState('');

    // Track dirty fields
    const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
    const markDirty = (field: string) => {
        setDirtyFields(prev => new Set(prev).add(field));
    };

    // Initialize venue search term (Decoupled from editingEvent.venueName)
    useEffect(() => {
        if (editingEvent.venueName && !venueSearchTerm) {
            // Logic to preset? No, keep it separate so user sees "Selected" UI.
        }
    }, [editingEvent.venueName]);

    // Debounced DJ Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (djSearchTerm.length >= 1) {
                setIsSearchingDjs(true);
                const results = await searchDjs(djSearchTerm);
                const currentIds = editingEvent.djIds || [];
                setDjSearchResults(results.filter(u => !currentIds.includes(u.id) && u.isActive !== false));
                setIsSearchingDjs(false);
            } else {
                setDjSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [djSearchTerm, editingEvent.djIds]);

    // Initial DJ Hydration (Fix for "Letters vs Names")
    useEffect(() => {
        const hydrateDjs = async () => {
            if (editingEvent.djIds && editingEvent.djIds.length > 0) {
                // If we already have objects for all, skip
                const missingIds = editingEvent.djIds.filter(id => !selectedDjObjects.some(obj => obj.id === id));

                if (missingIds.length > 0) {
                    // We need to fetch these users. 
                    // Optimization: We can reuse 'searchUsers' or make a 'getUsersByIds' helper.
                    // For now, let's just search by ID? No, searchUsers searches name/username.
                    // Let's implement a quick fetch loop or assume we can rely on 'searchDjs' if we knew names, but we don't.
                    // We need a way to get user profiles by ID. 
                    // Let's us 'subscribeToUserProfile' for each or just accept we might need a new service method `getUsersByIds`.
                    // For this quick fix, I'll assume we can use a temporary helper here or modify `searchUsers`? 
                    // Actually, I can just use `subscribeToUserProfile` once for each to get data.

                    const newObjects: UserProfile[] = [];
                    for (const id of missingIds) {
                        // We'll use a one-time promise wrapper around subscribeToUserProfile or just fetch doc directly?
                        // Since we are in a component, let's use the service but we need a Promise-based 'getUser'.
                        // 'firebase.ts' has `subscribeToUserProfile`. Let's mock a get or use internal logic? 
                        // Actually `getDoc(doc(db, "users", uid))` is standard. 
                        // BUT I should not import `getDoc` etc here if I want to keep service abstraction layer clean.
                        // Let's check `searchUsers`.
                        // I will add a simple `fetchUser` logic here using `subscribeToUserProfile` which is available.

                        await new Promise<void>((resolve) => {
                            const unsub = subscribeToUserProfile(id, (profile) => {
                                if (profile) newObjects.push(profile);
                                unsub();
                                resolve();
                            });
                        });
                    }

                    if (newObjects.length > 0) {
                        setSelectedDjObjects(prev => {
                            // Merge and unique
                            const combined = [...prev, ...newObjects];
                            return Array.from(new Map(combined.map(item => [item.id, item])).values());
                        });
                    }
                }
            }
        };
        hydrateDjs();
    }, [editingEvent.djIds]);

    // Debounced Venue Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (venueSearchTerm.length >= 2) {
                setIsSearchingVenues(true);
                try {
                    const termLower = venueSearchTerm.toLowerCase();

                    // 1. Local Search (Approved & Pending)
                    const localMatches = venues.filter(v =>
                        v.name.toLowerCase().includes(termLower) ||
                        (v.address && v.address.toLowerCase().includes(termLower))
                    );

                    const approved = localMatches.filter(v => v.status === 'APPROVED');
                    const pending = localMatches.filter(v => v.status === 'PENDING');

                    // 2. External Search
                    const externalResults = await searchVenuesExternal(venueSearchTerm);

                    // Filter out external that match local names to avoid duplicates
                    const newExternal = externalResults.filter(ext => !localMatches.some(loc => loc.name === ext.name));

                    // Combine with metadata for UI
                    setVenueSearchResults([
                        ...approved.map(v => ({ ...v, source: 'APPROVED' as const })),
                        ...pending.map(v => ({ ...v, source: 'PENDING' as const })),
                        ...newExternal.map(v => ({ ...v, source: 'EXTERNAL' as const, status: 'PENDING', id: undefined }))
                    ] as any[]);

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
    }, [venueSearchTerm, venues]);


    // --- HANDLERS ---

    const addDj = (dj: UserProfile) => {
        const currentIds = editingEvent.djIds || [];
        if (currentIds.length >= 2) return alert("Max 2 DJs");

        setEditingEvent(prev => ({
            ...prev,
            djIds: [...(prev.djIds || []), dj.id]
        }));
        setSelectedDjObjects(prev => [...prev, dj]);
        setDjSearchTerm('');
        setDjSearchResults([]);
        markDirty('djIds');
    };

    // Auto-sync djName whenever selectedDjObjects changes
    useEffect(() => {
        if (selectedDjObjects.length > 0) {
            const names = selectedDjObjects.map(d => d.name || d.username).join(" & ");
            setEditingEvent(prev => ({ ...prev, djName: names }));
            if (names !== editingEvent.djName) markDirty('djName');
        }
    }, [selectedDjObjects]);

    const removeDj = (id: string) => {
        setEditingEvent(prev => ({
            ...prev,
            djIds: (prev.djIds || []).filter(d => d !== id)
        }));
        setSelectedDjObjects(prev => prev.filter(d => d.id !== id));
        markDirty('djIds');
    };

    const applySeriesData = (seriesId: string) => {
        if (!seriesId) return;
        const selectedSeries = series.find(s => s.id === seriesId);
        if (!selectedSeries) return;

        const v = selectedSeries.venueId ? venues.find(v => v.id === selectedSeries.venueId) : null;

        setEditingEvent(prev => {
            const updates: Partial<Event> = {};
            updates.seriesId = seriesId;

            if (!dirtyFields.has('title')) updates.title = selectedSeries.title;
            if (!dirtyFields.has('description') && selectedSeries.description) updates.description = selectedSeries.description;
            // Handle DJs
            if (!dirtyFields.has('djIds') && selectedSeries.djIds && selectedSeries.djIds.length > 0) {
                updates.djIds = selectedSeries.djIds;
            }
            // Handle Venue
            if (!dirtyFields.has('venueName') && v) {
                updates.venueName = v.name;
                updates.latitude = v.latitude;
                updates.longitude = v.longitude;
                updates.distance = v.address;
                setVenueSearchTerm('');
            }
            // Handle Image
            if (!dirtyFields.has('imageUrl') && selectedSeries.posterUrl) updates.imageUrl = selectedSeries.posterUrl;

            return { ...prev, ...updates };
        });
    }

    const handleSeriesChange = (val: string) => {
        if (val === 'create_new') {
            setShowSeriesModal(true);
            return;
        }
        setEditingEvent(prev => ({ ...prev, seriesId: val }));
        if (val) applySeriesData(val);
    };

    const handleContinueToDetails = (selectedSeriesId: string | null) => {
        if (selectedSeriesId) {
            handleSeriesChange(selectedSeriesId);
        }
        setStep(2);
    };

    const selectVenue = (v: any) => {
        setEditingEvent(prev => ({
            ...prev,
            venueName: v.name,
            venueId: v.id, // Set ID if available (Local)
            distance: v.address,
            latitude: v.latitude,
            longitude: v.longitude
        }));
        setVenueSearchResults([]);
        setVenueSearchTerm('');
    };

    const clearVenue = () => {
        setEditingEvent(prev => ({
            ...prev,
            venueName: '',
            venueId: undefined, // Clear ID
            distance: '',
            latitude: undefined,
            longitude: undefined
        }));
        setVenueSearchTerm('');
    };

    const handleManualVenueSubmit = async () => {
        if (!manualVenueData.name || !manualVenueData.address) {
            alert("Venue Name and Address are required.");
            return;
        }
        try {
            const newId = await createVenue({
                name: manualVenueData.name,
                address: manualVenueData.address,
                hours: manualVenueData.hours,
                description: manualVenueData.description,
                status: 'PENDING',
            } as any);

            // Select it locally
            setEditingEvent(prev => ({
                ...prev,
                venueName: manualVenueData.name,
                venueId: newId, // Capture new ID
                distance: manualVenueData.address,
            }));

            setShowManualVenueForm(false);
            setManualVenueData({ name: '', address: '', hours: '', description: '' });
        } catch (e) {
            console.error("Failed to create venue request", e);
            alert("Failed to Submit Venue Request: " + e);
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
        } catch (error: any) {
            console.error("Upload failed", error);
            const msg = typeof error === 'string' ? error : (error.message || "Unknown error");
            alert(`Image upload failed: ${msg}`);
            setImageUploadProgress(false);
        }
    };

    const handleSaveEvent = async () => {
        if (!currentUserId && !editingEvent.ownerId) return;

        // Validation
        if (!editingEvent.title?.trim()) {
            alert("Please enter an Event Title.");
            return;
        }
        if (!editingEvent.date) {
            alert("Please select a Date.");
            return;
        }
        if (!editingEvent.venueName?.trim()) {
            alert("Please select or enter a Venue.");
            return;
        }

        try {
            const cleanData: any = {
                ...editingEvent,
                ownerId: editingEvent.ownerId || currentUserId,
                title: editingEvent.title || 'Untitled Event',
                isLive: editingEvent.isLive ?? false,
                isPublic: editingEvent.isPublic ?? true,
                status: 'READY', // Default to READY
                date: editingEvent.date || new Date().toISOString().split('T')[0],
                venueName: editingEvent.venueName || '',
                description: editingEvent.description || '',
                imageUrl: editingEvent.imageUrl || DEFAULT_EVENT_IMAGES[0],
                acceptingRequests: editingEvent.autoStartRequests === true ? true : (editingEvent.acceptingRequests ?? false)
            };
            delete cleanData.id;

            if (editingEvent.id) {
                try {
                    await updateEvent(editingEvent.id, cleanData);
                } catch (e: any) {
                    // If permission denied, try Admin override
                    if (e.code === 'permission-denied') {
                        try {
                            console.log("Permission denied, attempting Admin Override...");
                            await updateEventAsAdmin(editingEvent.id, cleanData);
                        } catch (adminError: any) {
                            console.error("Admin Update Failed:", adminError);
                            alert(`Admin Update Failed: ${adminError.message}`);
                            throw adminError;
                        }
                    } else {
                        throw e;
                    }
                }
            } else {
                await createEvent(cleanData, currentUserId);
            }

            // Ensure venue creation logic for manual edits (not manual requests which logic handles already)
            if (cleanData.venueName) {
                const existingVenue = venues.find(v => v.name.toLowerCase() === cleanData.venueName.toLowerCase());
                if (!existingVenue) {
                    await createVenue({
                        name: cleanData.venueName,
                        address: cleanData.distance,
                        latitude: cleanData.latitude,
                        longitude: cleanData.longitude,
                        status: 'PENDING'
                    } as any);
                }
            }

            if (onSave) onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error saving event: " + e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">

            {/* STEP 1: SERIES SELECTION WIZARD */}
            {step === 1 && (
                <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-lg border border-slate-800 shadow-2xl space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white text-center">New Event</h2>
                        <p className="text-slate-400 text-center text-sm">Is this event part of a recurring series?</p>
                    </div>

                    <div className="grid gap-4">
                        {/* Option 1: EXISTING SERIES */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 group-hover:text-white transition">
                                    <Shuffle size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white">Yes, Existing Series</h3>

                                    <select
                                        className="mt-2 w-full bg-slate-900 text-xs text-white p-2 rounded border border-slate-700 outline-none cursor-pointer hover:bg-slate-800 transition"
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => {
                                            if (e.target.value === 'create_new') {
                                                setShowSeriesModal(true);
                                            } else if (e.target.value) {
                                                handleContinueToDetails(e.target.value);
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Series...</option>
                                        <option value="create_new" className="text-purple-400 uppercase font-bold text-[10px]">+ Create New Series</option>
                                        {series.map(s => (
                                            <option key={s.id} value={s.id}>{s.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Option 2: ONE-OFF EVENT */}
                        <button
                            onClick={() => handleContinueToDetails(null)}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-white/30 transition text-left flex items-center gap-3 group w-full"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">No, One-time Event</h3>
                                <p className="text-xs text-slate-500">Create a standard event.</p>
                            </div>
                        </button>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-800">
                        <button onClick={onClose} className="text-slate-500 hover:text-white text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* STEP 2: DETAILS (Original Standard Form) */}
            {step === 2 && (
                <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">

                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            {!editingEvent.id && (
                                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {editingEvent.id ? 'Edit Event' : 'Event Details'}
                                </h3>
                                {/* Badge if Series Attached */}
                                {editingEvent.seriesId && (
                                    <div className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1 mt-1">
                                        <Shuffle size={10} />
                                        {series.find(s => s.id === editingEvent.seriesId)?.title || 'Series Event'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white"><XIcon size={20} /></button>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Event Title <span className="text-red-500">*</span></label>
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
                                <label className="text-xs text-slate-400 block mb-1">Date <span className="text-red-500">*</span></label>
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
                                    <TimePicker12h
                                        value={editingEvent.startTime || '21:00'}
                                        onChange={(val) => {
                                            setEditingEvent({ ...editingEvent, startTime: val });
                                            markDirty('startTime');
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">End Time</label>
                                    <TimePicker12h
                                        value={editingEvent.endTime || '02:00'}
                                        onChange={(val) => {
                                            setEditingEvent({ ...editingEvent, endTime: val });
                                            markDirty('endTime');
                                        }}
                                    />
                                    {/* Ends Next Day Hint */}
                                    {editingEvent.startTime && editingEvent.endTime && editingEvent.endTime < editingEvent.startTime && (
                                        <p className="text-[10px] text-purple-400 mt-1.5 flex items-center gap-1">
                                            <CornerDownRight size={10} />
                                            Ends following day
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Venue Selection */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Venue / Location <span className="text-red-500">*</span></label>
                            {editingEvent.venueName ? (
                                <div className="space-y-2">
                                    <div className="bg-slate-950 p-3 rounded border border-green-900/50 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                                <MapPin size={14} className="text-green-500" />
                                                {editingEvent.venueName}
                                            </div>
                                            <div className="text-xs text-slate-500 ml-5 truncate max-w-[250px]">{editingEvent.distance}</div>
                                        </div>
                                        <button onClick={clearVenue} className="text-slate-500 hover:text-white p-1 bg-slate-800 rounded">
                                            <XIcon size={14} />
                                        </button>
                                    </div>

                                    {/* PENDING VENUE WARNING */}
                                    {/* Check if venueId points to a PENDING venue, OR if matched by name */}
                                    {(() => {
                                        const linkedVenue = venues.find(v => v.id === editingEvent.venueId || v.name === editingEvent.venueName);
                                        if (linkedVenue && linkedVenue.status === 'PENDING') {
                                            return (
                                                <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg flex gap-3 items-start">
                                                    <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div></div>
                                                    <div>
                                                        <p className="text-xs text-yellow-200 font-bold">Venue Pending Approval</p>
                                                        <p className="text-[10px] text-yellow-500/80 leading-relaxed mt-1">
                                                            This venue is awaiting Admin verification. Your event will not be public until the venue is approved. We've already notified the admins!
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            ) : showManualVenueForm ? (
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-white uppercase">New Venue Request</h4>
                                        <button onClick={() => setShowManualVenueForm(false)} className="text-slate-500 hover:text-white"><XIcon size={14} /></button>
                                    </div>
                                    <input
                                        className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-xs text-white"
                                        placeholder="Venue Name *"
                                        value={manualVenueData.name}
                                        onChange={e => setManualVenueData({ ...manualVenueData, name: e.target.value })}
                                    />
                                    <input
                                        className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-xs text-white"
                                        placeholder="Address / Location *"
                                        value={manualVenueData.address}
                                        onChange={e => setManualVenueData({ ...manualVenueData, address: e.target.value })}
                                    />
                                    <input
                                        className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-xs text-white"
                                        placeholder="Hours of Operation (Optional)"
                                        value={manualVenueData.hours}
                                        onChange={e => setManualVenueData({ ...manualVenueData, hours: e.target.value })}
                                    />
                                    <textarea
                                        className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-xs text-white h-16"
                                        placeholder="Description (Optional)"
                                        value={manualVenueData.description}
                                        onChange={e => setManualVenueData({ ...manualVenueData, description: e.target.value })}
                                    />
                                    <button onClick={handleManualVenueSubmit} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition">
                                        Submit Request & Select
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-white"
                                            placeholder="Search for a venue..."
                                            value={venueSearchTerm}
                                            onChange={e => setVenueSearchTerm(e.target.value)}
                                        />
                                        {isSearchingVenues && <div className="p-3"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}
                                    </div>
                                    <div className="mt-1 flex justify-end">
                                        <button onClick={() => setShowManualVenueForm(true)} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline">
                                            Request a New Venue
                                        </button>
                                    </div>
                                    {venueSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 max-h-60 overflow-y-auto shadow-2xl divide-y divide-slate-700/50">
                                            {venueSearchResults.map((result: any, idx) => (
                                                <div key={idx} className="p-3 hover:bg-slate-700 cursor-pointer flex justify-between items-center group" onClick={() => selectVenue(result)}>
                                                    <div>
                                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                                            {result.name}
                                                            {result.source === 'APPROVED' && <div className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold">Verified</div>}
                                                            {result.source !== 'APPROVED' && <div className="px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 text-[10px] rounded uppercase font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span> Pending Approval</div>}
                                                        </div>
                                                        <div className="text-xs text-slate-400">{result.address}</div>
                                                    </div>
                                                    {result.source === 'APPROVED' && <div className="text-green-500 opacity-0 group-hover:opacity-100"><Check size={14} /></div>}
                                                </div>
                                            ))}
                                            <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-900 cursor-pointer" onClick={() => setVenueSearchResults([])}>Close Results</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* DJs */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">DJs / Hosts (Max 2)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(editingEvent.djIds || []).map(id => {
                                    const obj = selectedDjObjects.find(d => d.id === id);
                                    // Fallback if object not found (e.g. existing event loading refs not yet implemented fully here for all IDs, but 'updateEvent' might not have them? 
                                    // Actually we rely on 'selectedDjObjects'.
                                    return (
                                        <div key={id} className="bg-purple-900/40 text-purple-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-purple-500/30">
                                            <span>
                                                {obj ? (
                                                    // Show Name (Display Name) and Username
                                                    <span className="flex items-center gap-1">
                                                        {obj.name} <span className="text-purple-400/60 font-normal">@{obj.username}</span>
                                                    </span>
                                                ) : (id === editingEvent.ownerId ? 'You' : 'ID: ' + id.substring(0, 4))}
                                            </span>
                                            <button onClick={() => removeDj(id)} className="hover:text-white"><XIcon size={12} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                            {(editingEvent.djIds || []).length < 2 && (
                                <div className="relative">
                                    <input
                                        className="w-full bg-slate-950 p-2 rounded border border-slate-700 text-white text-xs"
                                        placeholder="Search by DJ Name or Username..."
                                        value={djSearchTerm}
                                        onChange={e => setDjSearchTerm(e.target.value)}
                                    />
                                    {isSearchingDjs && <div className="absolute right-2 top-2"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}

                                    {djSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 z-50 max-h-40 overflow-y-auto">
                                            {djSearchResults.map(dj => (
                                                <div
                                                    key={dj.id}
                                                    className="p-2 hover:bg-slate-700 cursor-pointer flex items-center justify-between group"
                                                    onClick={() => addDj(dj)}
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold text-white">{dj.name}</div>
                                                        <div className="text-[10px] text-slate-400">@{dj.username}</div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 text-purple-400 font-bold text-[10px] uppercase">
                                                        Select
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Music Source Configuration */}
                        <MusicSourceConfig
                            editingEvent={editingEvent}
                            setEditingEvent={setEditingEvent}
                            markDirty={markDirty}
                            ownerId={editingEvent.ownerId || currentUserId || ''}
                        />

                        {/* Description */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Description</label>
                            <textarea
                                className="w-full bg-slate-950 p-3 rounded border border-slate-700 text-white h-24 text-sm"
                                placeholder="Tell us about the event..."
                                value={editingEvent.description || ''}
                                onChange={e => {
                                    setEditingEvent({ ...editingEvent, description: e.target.value });
                                    markDirty('description');
                                }}
                            />
                        </div>

                        {/* Vibe Tags */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Vibe Tags (Select relevant vibes)</label>

                            {/* Selected Tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {editingEvent.vibeTags?.map(tag => (
                                    <div key={tag} className="bg-purple-600/20 border border-purple-500/50 text-purple-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                        <span>#{tag}</span>
                                        <button
                                            onClick={() => {
                                                setEditingEvent(prev => ({
                                                    ...prev,
                                                    vibeTags: (prev.vibeTags || []).filter(t => t !== tag)
                                                }));
                                                markDirty('vibeTags');
                                            }}
                                            className="hover:text-white"
                                        >
                                            <XIcon size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!editingEvent.vibeTags || editingEvent.vibeTags.length === 0) && (
                                    <span className="text-slate-600 text-xs italic">No vibes selected yet.</span>
                                )}
                            </div>

                            {/* Available Tags Selection */}
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Available Vibes:</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(config.availableVibeTags || []).filter(t => !(editingEvent.vibeTags || []).includes(t)).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                setEditingEvent(prev => ({
                                                    ...prev,
                                                    vibeTags: [...(prev.vibeTags || []), tag]
                                                }));
                                                markDirty('vibeTags');
                                            }}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs px-2 py-1 rounded-full border border-slate-700 transition"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                    {(config.availableVibeTags || []).length === 0 && <span className="text-xs text-slate-600">No system tags. Add one below!</span>}
                                </div>

                                {/* Add New Tag (Admin Only) */}
                                {(user?.role === 'ADMIN') && (
                                    <div className="mt-3 flex gap-2 border-t border-slate-800 pt-2">
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                                            placeholder="Create new vibe tag..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!tagInput.trim()) return;
                                                const newTag = tagInput.trim();
                                                // Add to global
                                                await addVibeTag(newTag);
                                                // Also auto-select it for this event
                                                setEditingEvent(prev => ({
                                                    ...prev,
                                                    vibeTags: [...(prev.vibeTags || []), newTag]
                                                }));
                                                markDirty('vibeTags');
                                                setTagInput('');
                                            }}
                                            className="px-3 py-1 bg-purple-900/50 hover:bg-purple-900 border border-purple-500/30 text-purple-300 text-xs font-bold rounded transition"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cover Image */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Cover Image</label>
                            <div className="relative w-full">
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="event-image-upload"
                                    onChange={handleImageSelected}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="event-image-upload"
                                    className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-700 border-dashed rounded text-xs text-slate-400 flex items-center justify-center gap-2 cursor-pointer transition"
                                >
                                    {imageUploadProgress ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
                                    {editingEvent.imageUrl ? 'Change Image' : 'Upload Cover Image'}
                                </label>
                            </div>
                            {editingEvent.imageUrl && (
                                <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                                    <img src={editingEvent.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                        <button onClick={handleSaveEvent} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20">
                            {editingEvent.id ? 'Save Changes' : 'Create Event'}
                        </button>
                        <button onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">
                            Cancel
                        </button>
                    </div>

                </div>
            )}

            {showSeriesModal && currentUserId && (
                <SeriesModal
                    onClose={() => setShowSeriesModal(false)}
                    currentUserId={currentUserId}
                    onSeriesCreated={(newId) => {
                        handleSeriesChange(newId);
                        setStep(2); // Auto advance
                    }}
                />
            )}

        </div>
    );
};
