import React, { useEffect, useState } from 'react';
import { Event, UserProfile } from '../types';
import { subscribeToUserProfile } from '../services/firebase';
import { getLexiconPlaylists } from '../services/lexiconService';
import { Database, Music } from 'lucide-react';

interface Props {
    editingEvent: Partial<Event>;
    setEditingEvent: React.Dispatch<React.SetStateAction<Partial<Event>>>;
    markDirty: (field: string) => void;
    ownerId: string;
}

export const MusicSourceConfig: React.FC<Props> = ({ editingEvent, setEditingEvent, markDirty, ownerId }) => {
    const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
    const [lexiconPlaylists, setLexiconPlaylists] = useState<{ id: string, title: string }[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);

    useEffect(() => {
        // Fetch owner profile to check for Lexicon config
        const unsub = subscribeToUserProfile(ownerId, (p) => {
            setOwnerProfile(p);
        });
        return () => unsub();
    }, [ownerId]);

    const toggleSource = (source: 'SPOTIFY' | 'LEXICON') => {
        const current = editingEvent.searchSources || ['SPOTIFY'];
        let next = [...current];

        if (next.includes(source)) {
            // Don't allow removing the last source
            if (next.length === 1) return alert("You must have at least one music source enabled.");
            next = next.filter(s => s !== source);
        } else {
            next.push(source);
        }

        setEditingEvent(prev => ({ ...prev, searchSources: next }));
        markDirty('searchSources');
    };

    const isLexiconEnabled = (editingEvent.searchSources || ['SPOTIFY']).includes('LEXICON');
    const hasLexiconConfig = ownerProfile?.lexiconConfig?.enabled;

    useEffect(() => {
        if (isLexiconEnabled && hasLexiconConfig && ownerProfile?.lexiconConfig?.host) {
            setLoadingPlaylists(true);
            getLexiconPlaylists(ownerProfile.lexiconConfig.host).then(playlists => {
                setLexiconPlaylists(playlists);
                setLoadingPlaylists(false);
            });
        }
    }, [isLexiconEnabled, hasLexiconConfig, ownerProfile?.lexiconConfig?.host]);

    const togglePlaylist = (pid: string) => {
        const current = editingEvent.lexiconPlaylistIds || [];
        let next = [...current];
        if (next.includes(pid)) {
            next = next.filter(id => id !== pid);
        } else {
            next.push(pid);
        }
        setEditingEvent(prev => ({ ...prev, lexiconPlaylistIds: next }));
        markDirty('lexiconPlaylistIds');
    };

    if (!hasLexiconConfig) return null; // Hide entire section if user hasn't set up integration

    return (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Music size={16} className="text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Music Sources</h4>
            </div>

            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${(editingEvent.searchSources || ['SPOTIFY']).includes('SPOTIFY')
                            ? 'bg-green-600 border-green-500'
                            : 'bg-slate-900 border-slate-600 group-hover:border-green-500'
                        }`}>
                        {(editingEvent.searchSources || ['SPOTIFY']).includes('SPOTIFY') && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </div>
                    <span className="text-sm text-white">Spotify</span>
                </label>

                <label className={`flex items-center gap-2 cursor-pointer group ${!hasLexiconConfig ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div
                        onClick={() => hasLexiconConfig && toggleSource('LEXICON')}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition ${(editingEvent.searchSources || []).includes('LEXICON')
                                ? 'bg-purple-600 border-purple-500'
                                : 'bg-slate-900 border-slate-600 group-hover:border-purple-500'
                            }`}>
                        {(editingEvent.searchSources || []).includes('LEXICON') && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </div>
                    <span className="text-sm text-white">Lexicon Library</span>
                </label>
            </div>

            {/* Playlist Filter */}
            {isLexiconEnabled && (
                <div className="ml-1 border-l-2 border-slate-800 pl-4 mt-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-slate-400">Limit to Playlists (Optional)</label>
                        <button onClick={() => setEditingEvent(prev => ({ ...prev, lexiconPlaylistIds: [] }))} className="text-[10px] text-purple-400 underline">Clear Filters</button>
                    </div>

                    {loadingPlaylists ? (
                        <div className="text-xs text-slate-500 italic">Loading playlists...</div>
                    ) : lexiconPlaylists.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-900/50 p-2 rounded">
                            {lexiconPlaylists.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => togglePlaylist(p.id)}
                                    className={`text-xs p-2 rounded cursor-pointer border transition truncate ${(editingEvent.lexiconPlaylistIds || []).includes(p.id)
                                            ? 'bg-purple-900/30 border-purple-500/50 text-purple-200'
                                            : 'bg-slate-800 border-transparent hover:bg-slate-700 text-slate-300'
                                        }`}
                                >
                                    {p.title}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">No playlists found in your library.</div>
                    )}
                </div>
            )}
        </div>
    );
};
