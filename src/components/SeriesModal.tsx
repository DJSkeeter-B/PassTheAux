import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { createSeries, uploadEventImage, searchUsers } from '../services/firebase';
import { X, Image as ImageIcon, Edit2, Plus, Search } from 'lucide-react';
import { UserProfile } from '../types';

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

    const [seriesVenueId, setSeriesVenueId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounced Search Effect
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (djSearchTerm.length >= 1) { // User requested "at least 3 if exist", so lenient search
                setIsSearching(true);
                const results = await searchUsers(djSearchTerm);
                setDjSearchResults(results.filter(u => !seriesDjIds.includes(u.id))); // Filter selected
                setIsSearching(false);
            } else if (djSearchTerm.length === 0) {
                setDjSearchResults([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [djSearchTerm, seriesDjIds]);

    const handleSearchDjs = (term: string) => {
        setDjSearchTerm(term);
        // Effect handles the rest
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

    const handleCreateSeries = async () => {
        if (!seriesTitle) return;
        setIsSubmitting(true);

        try {
            let posterUrl = undefined;
            if (seriesPosterFile) {
                try {
                    posterUrl = await uploadEventImage(seriesPosterFile);
                } catch (e) {
                    console.error("Poster upload failed", e);
                    alert("Poster upload failed, proceeding without it.");
                }
            }

            const newSeriesId = await createSeries({
                ownerId: currentUserId,
                title: seriesTitle,
                description: seriesDescription,
                djIds: seriesDjIds,
                venueId: seriesVenueId,
                posterUrl
            });

            if (onSeriesCreated) onSeriesCreated(newSeriesId);
            onClose();
            // alert("Series Created!"); // Removed annoying alert, UI update should suffice
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

                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Default Venue</label>
                            <select
                                className="w-full bg-slate-950 p-3 rounded-lg border border-slate-700 text-white text-sm outline-none"
                                value={seriesVenueId}
                                onChange={e => setSeriesVenueId(e.target.value)}
                            >
                                <option value="">Select Venue...</option>
                                {venues.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Resident DJs (Max 2)</label>

                                {/* Selected DJs Tags */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedDjs.map(dj => (
                                        <div key={dj.id} className="bg-purple-900/50 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                                            <span>{dj.username}</span>
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
                                            placeholder="Search DJs by username..."
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
                                                    className="p-2 hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                                                    onClick={() => addDj(u)}
                                                >
                                                    <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                                                    <div className="text-xs text-white font-bold">{u.username}</div>
                                                    {u.role === 'DJ' && <span className="text-[10px] bg-slate-600 px-1 rounded text-slate-300">DJ</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
