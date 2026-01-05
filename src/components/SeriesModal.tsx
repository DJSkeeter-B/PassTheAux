console.log("DEBUG: SeriesModal MODULE EVALUATING");
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { createSeries, uploadEventImage, searchUsers, searchDjs, createVenue } from '../services/firebase';
import { searchVenuesExternal } from '../services/geminiService';
import { X, Image as ImageIcon, Edit2, Plus, Search, MapPin } from 'lucide-react';
import { UserProfile, Venue } from '../types';

interface SeriesModalProps {
    onClose: () => void;
    currentUserId: string;
    onSeriesCreated?: (newSeriesId: string) => void;
}

export const SeriesModal: React.FC<SeriesModalProps> = ({ onClose, currentUserId, onSeriesCreated }) => {
    const { venues } = useData();
    const [seriesTitle, setSeriesTitle] = useState('');
    const [seriesDescription, setSeriesDescription] = useState('');
    const [seriesPosterFile, setSeriesPosterFile] = useState<File | null>(null);
    const [seriesPosterPreview, setSeriesPosterPreview] = useState<string | null>(null);

    // DJ Search State
    const [seriesDjIds, setSeriesDjIds] = useState<string[]>([]); // Selected IDs
    const [selectedDjs, setSelectedDjs] = useState<UserProfile[]>([]); // Selected Objects for display
    const [djSearchTerm, setDjSearchTerm] = useState('');
    const [djSearchResults, setDjSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // VENUE STATE
    const [seriesVenueId, setSeriesVenueId] = useState('');
    const [venueSearchTerm, setVenueSearchTerm] = useState('');
    const [venueSearchResults, setVenueSearchResults] = useState<any[]>([]);
    const [isSearchingVenues, setIsSearchingVenues] = useState(false);
    const [selectedVenueData, setSelectedVenueData] = useState<{ name: string, address: string, lat?: number, lng?: number } | null>(null);

    // RECURRENCE STATE
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
    const [dayOfWeek, setDayOfWeek] = useState(5); // Default Friday
    const [weekOfMonth, setWeekOfMonth] = useState(1); // Default 1st
    const [autoCreate, setAutoCreate] = useState(false);

    // TEMPLATE STATE
    const [defaultStartTime, setDefaultStartTime] = useState('22:00');
    const [defaultEndTime, setDefaultEndTime] = useState('02:00');
    const [defaultVibes, setDefaultVibes] = useState<string[]>([]);
    const [vibeInput, setVibeInput] = useState('');


    // Manual Venue Request State
    const [showManualVenueForm, setShowManualVenueForm] = useState(false);
    const [manualVenueData, setManualVenueData] = useState({
        name: '',
        address: '',
        hours: '',
        description: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounced Search Effect (DJs + Venues)
    React.useEffect(() => {
        // DJ Search
        const djTimer = setTimeout(async () => {
            if (djSearchTerm.length >= 1) {
                setIsSearching(true);
                // Use searchDjs and filter out listeners
                // Import searchDjs first (will do in separate edit if needed, assuming usage of searchUsers currently)
                // Actually need to update import. Assuming searchUsers for now if searchDjs not imported.
                // Wait, I should use searchDjs.
                const results = await searchDjs(djSearchTerm);
                setDjSearchResults(results.filter(u => !seriesDjIds.includes(u.id)));
                setIsSearching(false);
            } else if (djSearchTerm.length === 0) {
                setDjSearchResults([]);
            }
        }, 300);

        // Venue Search
        const venueTimer = setTimeout(async () => {
            if (venueSearchTerm.length >= 3) {
                setIsSearchingVenues(true);
                const results = await searchVenuesExternal(venueSearchTerm);
                setVenueSearchResults(results);
                setIsSearchingVenues(false);
            } else {
                setVenueSearchResults([]);
            }
        }, 500);

        return () => { clearTimeout(djTimer); clearTimeout(venueTimer); };
    }, [djSearchTerm, seriesDjIds, venueSearchTerm]);

    const handleSearchDjs = (term: string) => {
        setDjSearchTerm(term);
    };

    const addDj = (dj: UserProfile) => {
        if (seriesDjIds.length >= 2) {
            alert("Maximum 2 Resident DJs allowed.");
            return;
        }
        setSeriesDjIds(prev => [...prev, dj.id]);
        setSelectedDjs(prev => [...prev, dj]);
        setDjSearchTerm('');
        setDjSearchResults([]);
    };

    const removeDj = (id: string) => {
        setSeriesDjIds(prev => prev.filter(d => d !== id));
        setSelectedDjs(prev => prev.filter(d => d.id !== id));
    };

    // --- VENUE HANDLERS ---

    const selectVenue = (venue: any) => {
        // Check if this venue already exists in our DB by name
        const existing = venues.find(v => v.name.toLowerCase() === venue.name.toLowerCase());
        if (existing) {
            setSeriesVenueId(existing.id);
            setSelectedVenueData({ name: existing.name, address: existing.address || '' });
        } else {
            setSeriesVenueId(''); // Will need creation
            setSelectedVenueData({
                name: venue.name,
                address: venue.address,
                lat: venue.latitude,
                lng: venue.longitude
            });
        }
        setVenueSearchTerm('');
        setVenueSearchResults([]);
    };

    const clearVenue = () => {
        setSeriesVenueId('');
        setSelectedVenueData(null);
        setVenueSearchTerm('');
    };

    // --- TEMPLATE HANDLERS ---
    const addVibe = () => {
        if (!vibeInput.trim()) return;
        if (!defaultVibes.includes(vibeInput.trim())) {
            setDefaultVibes([...defaultVibes, vibeInput.trim()]);
        }
        setVibeInput('');
    }

    const removeVibe = (v: string) => {
        setDefaultVibes(defaultVibes.filter(item => item !== v));
    }


    const handleManualVenueSubmit = async () => {
        if (!manualVenueData.name || !manualVenueData.address) {
            alert("Venue Name and Address are required.");
            return;
        }

        try {
            // Create Pending Venue immediately
            const newId = await createVenue({
                name: manualVenueData.name,
                address: manualVenueData.address,
                hours: manualVenueData.hours,
                description: manualVenueData.description,
                status: 'PENDING',
            } as any);

            // Select it
            setSeriesVenueId(newId); // createVenue returns ID
            setSelectedVenueData({ name: manualVenueData.name, address: manualVenueData.address });

            // Reset UI
            setShowManualVenueForm(false);
            setManualVenueData({ name: '', address: '', hours: '', description: '' });
            setVenueSearchTerm('');
        } catch (e) {
            console.error("Failed to create venue request", e);
            alert("Failed to submit venue request.");
        }
    };

    const handleCreateSeries = async () => {
        if (!seriesTitle) return;
        setIsSubmitting(true);

        try {
            let finalVenueId = seriesVenueId;

            // If we have selected venue data but no ID (from external search), create it now
            if (!finalVenueId && selectedVenueData) {
                // Double check it wasn't made in the meantime? Unlikely.
                finalVenueId = await createVenue({
                    name: selectedVenueData.name,
                    address: selectedVenueData.address,
                    latitude: selectedVenueData.lat,
                    longitude: selectedVenueData.lng,
                    status: 'PENDING'
                } as any);
            }

            let posterUrl = undefined;
            if (seriesPosterFile) {
                try {
                    posterUrl = await uploadEventImage(seriesPosterFile);
                } catch (e: any) {
                    console.error("Poster upload failed", e);
                    alert(`Poster upload failed: ${e.message || "Unknown error"}. Proceeding without it.`);
                }
            }

            const newSeriesId = await createSeries({
                ownerId: currentUserId,
                title: seriesTitle,
                description: seriesDescription,
                djIds: seriesDjIds,
                djName: selectedDjs.map(d => d.name || d.username).join(" & "),
                venueId: finalVenueId,
                posterUrl,
                isRecurring,
                frequency: isRecurring ? frequency : undefined,
                dayOfWeek: isRecurring ? dayOfWeek : undefined,
                weekOfMonth: isRecurring && frequency === 'MONTHLY' ? weekOfMonth : undefined,
                autoCreate: isRecurring ? autoCreate : undefined,
                // Template Data
                defaultStartTime,
                defaultEndTime,
                defaultVibes
            });

            if (onSeriesCreated) onSeriesCreated(newSeriesId);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to create series.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Event Series</h3>
                        <p className="text-xs text-slate-400">Establish a brand for recurring events.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Col: Poster */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Series Poster</label>
                        <div
                            onClick={() => document.getElementById('series-poster-upload')?.click()}
                            className="aspect-[2/3] bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-slate-900 transition relative overflow-hidden group"
                        >
                            {seriesPosterPreview ? (
                                <>
                                    <img src={seriesPosterPreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <div className="text-xs font-bold text-white flex items-center gap-1"><Edit2 size={12} /> Change</div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSeriesPosterFile(null);
                                            setSeriesPosterPreview(null);
                                            // Reset input value so same file can be selected again if needed
                                            const input = document.getElementById('series-poster-upload') as HTMLInputElement;
                                            if (input) input.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full transition z-10"
                                        title="Remove Poster"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <ImageIcon className="mx-auto mb-2 text-slate-600" size={32} />
                                    <span className="text-xs text-slate-500 font-medium">Upload Poster</span>
                                </div>
                            )}
                        </div>
                        <input
                            id="series-poster-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setSeriesPosterFile(e.target.files[0]);
                                    setSeriesPosterPreview(URL.createObjectURL(e.target.files[0]));
                                }
                            }}
                        />
                    </div>

                    {/* Right Col: Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Series Title</label>
                            <input
                                autoFocus
                                className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-purple-500 outline-none font-bold"
                                placeholder="e.g. Techno Tuesdays"
                                value={seriesTitle}
                                onChange={e => setSeriesTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Description</label>
                            <textarea
                                className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white focus:border-purple-500 outline-none text-sm"
                                placeholder="What is this series about?"
                                rows={3}
                                value={seriesDescription}
                                onChange={e => setSeriesDescription(e.target.value)}
                            />
                        </div>


                        {/* RECURRENCE SETTINGS */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-slate-400 font-bold uppercase">Repeating Event Series?</label>
                                <div
                                    onClick={() => setIsRecurring(!isRecurring)}
                                    className={`w-10 h-5 rounded-full relative cursor-pointer transition ${isRecurring ? 'bg-purple-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>

                            {isRecurring && (
                                <div className="space-y-3 mt-3 pt-3 border-t border-slate-800">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setFrequency('WEEKLY')}
                                            className={`py-2 px-3 text-xs font-bold rounded border ${frequency === 'WEEKLY' ? 'bg-purple-900/30 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
                                        >
                                            Weekly
                                        </button>
                                        <button
                                            onClick={() => setFrequency('MONTHLY')}
                                            className={`py-2 px-3 text-xs font-bold rounded border ${frequency === 'MONTHLY' ? 'bg-purple-900/30 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
                                        >
                                            Monthly
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">On</span>
                                        {frequency === 'MONTHLY' && (
                                            <select
                                                value={weekOfMonth}
                                                onChange={e => setWeekOfMonth(Number(e.target.value))}
                                                className="bg-slate-900 text-white text-xs p-1 rounded border border-slate-700"
                                            >
                                                <option value={1}>1st</option>
                                                <option value={2}>2nd</option>
                                                <option value={3}>3rd</option>
                                                <option value={4}>4th</option>
                                            </select>
                                        )}
                                        <select
                                            value={dayOfWeek}
                                            onChange={e => setDayOfWeek(Number(e.target.value))}
                                            className="flex-1 bg-slate-900 text-white text-xs p-1 rounded border border-slate-700 outline-none"
                                        >
                                            <option value={0}>Sunday</option>
                                            <option value={1}>Monday</option>
                                            <option value={2}>Tuesday</option>
                                            <option value={3}>Wednesday</option>
                                            <option value={4}>Thursday</option>
                                            <option value={5}>Friday</option>
                                            <option value={6}>Saturday</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            checked={autoCreate}
                                            onChange={e => setAutoCreate(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-purple-600"
                                        />
                                        <div>
                                            <div className="text-xs font-bold text-white">Auto-Create Pending Events</div>
                                            <div className="text-[10px] text-slate-500">System will look ahead and create drafts.</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SERIES VENUE SELECTOR */}
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Default Venue</label>

                            {selectedVenueData ? (
                                <div className="bg-slate-950 p-3 rounded border border-green-900/50 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                                            <MapPin size={14} className="text-green-500" />
                                            {selectedVenueData.name}
                                        </div>
                                        <div className="text-xs text-slate-500 ml-5 truncate max-w-[250px]">{selectedVenueData.address}</div>
                                    </div>
                                    <button onClick={clearVenue} className="text-slate-500 hover:text-white p-1 bg-slate-800 rounded">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : showManualVenueForm ? (
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-white uppercase">New Venue Request</h4>
                                        <button onClick={() => setShowManualVenueForm(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
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
                                        className="w-full bg-slate-900 p-2 rounded border border-slate-600 text-xs text-white"
                                        placeholder="Other Notes / Description (Optional)"
                                        rows={2}
                                        value={manualVenueData.description}
                                        onChange={e => setManualVenueData({ ...manualVenueData, description: e.target.value })}
                                    />
                                    <button
                                        onClick={handleManualVenueSubmit}
                                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition"
                                    >
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
                                        <button
                                            onClick={() => setShowManualVenueForm(true)}
                                            className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline"
                                        >
                                            Request a New Venue
                                        </button>
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
                            )}

                            {selectedVenueData && (
                                <div className="mt-1 text-[10px] text-slate-500 italic">
                                    {seriesVenueId ?
                                        (venues.find(v => v.id === seriesVenueId)?.status === 'APPROVED' ?
                                            <span className="text-green-500">✓ Verified Venue</span> :
                                            <span className="text-yellow-500">⚠ Pending Approval</span>)
                                        : <span className="text-yellow-500">⚠ Will be requested on save</span>
                                    }
                                </div>
                            )}
                        </div>

                        <div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Resident DJs (Max 2)</label>

                                {/* Selected DJs Tags */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedDjs.map(dj => (
                                        <div key={dj.id} className="bg-purple-900/50 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                                            <span>{dj.name || dj.username}</span>
                                            <button onClick={() => removeDj(dj.id)} className="hover:text-white"><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <div className="relative">
                                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2 focus-within:border-purple-500 transition">
                                        <Search size={14} className="text-slate-500" />
                                        <input
                                            className="bg-transparent border-none outline-none text-sm text-white flex-1 placeholder:text-slate-600"
                                            placeholder="Search DJs by name or username..."
                                            value={djSearchTerm}
                                            onChange={e => handleSearchDjs(e.target.value)}
                                            disabled={seriesDjIds.length >= 2}
                                        />
                                        {isSearching && <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>}
                                    </div>

                                    {/* Results Dropdown */}
                                    {djSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                            {djSearchResults.map(u => (
                                                <div
                                                    key={u.id}
                                                    className="p-2 hover:bg-slate-700 cursor-pointer flex items-center justify-between group"
                                                    onClick={() => addDj(u)}
                                                >
                                                    <div>
                                                        <div className="text-xs font-bold text-white">{u.name}</div>
                                                        <div className="text-[10px] text-slate-400">@{u.username}</div>
                                                    </div>
                                                    {u.role === 'DJ' && <span className="text-[10px] bg-slate-600 px-1 rounded text-slate-300">DJ</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TEMPLATE SETTINGS SECTION */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Event Defaults (Template)</h4>

                            {/* Time Defaults */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">Default Start Time</label>
                                    <input
                                        type="time"
                                        value={defaultStartTime}
                                        onChange={e => setDefaultStartTime(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block mb-1">Default End Time</label>
                                    <input
                                        type="time"
                                        value={defaultEndTime}
                                        onChange={e => setDefaultEndTime(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                                    />
                                </div>
                            </div>

                            {/* Vibe Defaults */}
                            <div>
                                <label className="text-[10px] text-slate-500 block mb-1">Default Vibes</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {defaultVibes.map(v => (
                                        <span key={v} onClick={() => removeVibe(v)} className="bg-slate-800 text-slate-300 border border-slate-600 px-2 py-0.5 rounded text-[10px] cursor-pointer hover:bg-red-900/50 hover:text-red-400 flex items-center gap-1">
                                            {v} <X size={10} />
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <input
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                                        placeholder="Add vibe (e.g. House, Chill)..."
                                        value={vibeInput}
                                        onChange={e => setVibeInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addVibe()}
                                    />
                                    <button onClick={addVibe} className="bg-slate-800 text-white px-2 rounded hover:bg-slate-700"><Plus size={14} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button onClick={handleCreateSeries} disabled={isSubmitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Creating...</span>
                                    </>
                                ) : 'Create Series'}
                            </button>
                            <button onClick={onClose} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
