
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext'; // For config
import { searchSongs } from '../services/geminiService';
import { searchSpotify, getAudioFeatures } from '../services/spotifyService';
import { searchLexicon } from '../services/lexiconService';
import { addSongRequest, voteSong, subscribeToUserProfile, updateUserProfile } from '../services/firebase';
import { SearchResult, Song, SongStatus, UserProfile } from '../types';
import { SearchResultItem } from '../components/SearchResultItem';

export const EventSearchPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { config } = useData();

    // Combined Search Query
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Tab State
    type Tab = 'LEXICON' | 'SPOTIFY';
    const [activeTab, setActiveTab] = useState<Tab>('SPOTIFY');

    // Results State
    const [lexiconResults, setLexiconResults] = useState<SearchResult[]>([]);
    const [lexiconError, setLexiconError] = useState<boolean>(false);
    const [spotifyResults, setSpotifyResults] = useState<SearchResult[]>([]);


    // ...

    // Reset search when query changes
    useEffect(() => {
        setLexiconResults([]);
        setSpotifyResults([]);
        setLexiconError(false);
        setOffset(0);
        setHasMoreSpotify(true);
    }, [searchQuery]);

    // ... inside fetch effect ...
    // ... inside fetch effect ...
    // ... handling display ...

    // Pagination (Mainly for Spotify)
    const [offset, setOffset] = useState(0);
    const [hasMoreSpotify, setHasMoreSpotify] = useState(true);

    const MAX_RESULTS = 45;

    // Reset search when query changes


    // Config State
    const [eventConfig, setEventConfig] = useState<{
        allowSpotify: boolean;
        allowLexicon: boolean;
        ownerId?: string;
        playlistIds?: string[]
    } | null>(null);

    // Load Config
    useEffect(() => {
        if (!id) return;
        const fetchConfig = async () => {
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../../firebaseConfig');

                if (db) {
                    const snap = await getDoc(doc(db, "events", id));
                    if (snap.exists()) {
                        const data = snap.data();
                        const sources = data.searchSources || ['SPOTIFY'];
                        const allowSpotify = sources.includes('SPOTIFY');
                        const allowLexicon = sources.includes('LEXICON');



                        console.log("Event Config Loaded:", { allowSpotify, allowLexicon });

                        setEventConfig({
                            allowSpotify,
                            allowLexicon,
                            ownerId: data.ownerId,
                            playlistIds: data.lexiconPlaylistIds
                        });

                        // Default to Lexicon tab if preferred
                        if (allowLexicon && !allowSpotify) {
                            setActiveTab('LEXICON');
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load event config", e);
            }
        };
        fetchConfig();
    }, [id]);

    // Fetch Effect
    useEffect(() => {
        if (!searchQuery.trim() || !eventConfig) {
            return;
        }

        // Debounce
        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Parallel Promises
                const promises = [];

                // 1. Lexicon Search
                // Use simplified check. Service handles discovery.
                if (eventConfig.allowLexicon && offset === 0) {
                    // console.log("Searching Lexicon...");
                    promises.push(
                        searchLexicon(searchQuery)
                            .then(res => {
                                setLexiconResults(res);
                                setLexiconError(false);
                            })
                            // If service throws (discovery failed repeatedly), we show error
                            .catch(e => {
                                console.warn("Lexicon search failed", e);
                                setLexiconError(true);
                            })
                    );
                }

                // 2. Spotify Search
                if (eventConfig.allowSpotify && hasMoreSpotify) {
                    if (config.spotifyToken) {
                        promises.push(
                            searchSpotify(searchQuery, config.spotifyToken, offset)
                                .then(res => {
                                    if (res.length === 0) setHasMoreSpotify(false);
                                    if (offset === 0) setSpotifyResults(res);
                                    else setSpotifyResults(prev => [...prev, ...res]); // Append for pagination
                                })
                                .catch(e => {
                                    console.warn("Spotify failed", e);
                                    if (offset === 0 && !eventConfig.allowLexicon) {
                                        // Only fallback to Gemini if Lexicon isn't the alternative
                                        searchSongs(searchQuery).then(r => setSpotifyResults(r));
                                    }
                                })
                        );
                    } else if (offset === 0) {
                        promises.push(
                            searchSongs(searchQuery).then(res => setSpotifyResults(res))
                        );
                    }
                }

                await Promise.all(promises);

            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, offset === 0 ? 500 : 0); // Debounce typing, immediate load more

        return () => clearTimeout(timeoutId);

    }, [searchQuery, offset, config.spotifyToken, eventConfig]); // Removed hasMoreSpotify dep to avoid loop

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (activeTab === 'LEXICON') return; // No pagination for Lexicon yet

        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (!isSearching && hasMoreSpotify && spotifyResults.length < MAX_RESULTS * 2) {
                setOffset(prev => prev + 10);
            }
        }
    };

    const handleRequestSong = async (result: SearchResult) => {
        if (!id || !user) return;

        let metadata: any = {};

        // 1. Check for existing metadata (e.g. from Lexicon)
        if (result.bpm || result.key || result.energy) {
            metadata = {
                bpm: result.bpm,
                key: result.key,
                energy: result.energy
            };
        } else if ((!result.source || result.source === 'SPOTIFY') && config.spotifyToken) {
            // 2. Fallback: Fetch from Spotify if not present and is Spotify track
            try {
                const trackId = result.id;
                const features = await getAudioFeatures(trackId, config.spotifyToken);
                if (features) {
                    metadata = features;
                }
            } catch (e) {
                console.warn("Failed to fetch audio features", e);
            }
        }

        const songData: Omit<Song, 'id'> = {
            eventId: id,
            title: result.title,
            artist: result.artist,
            album: result.album,
            coverUrl: result.coverUrl,
            status: SongStatus.PENDING,
            requesterName: user.name,
            requesterId: user.id,
            timestamp: Date.now(),
            votes: 0,
            source: result.source, // Persist source
            ...metadata // Inject bpm, key, energy
        };
        try {
            await addSongRequest(songData);
            navigate(`/event/${id}/queue`);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to add song request.");
        }
    };

    const activeResults = activeTab === 'LEXICON' ? lexiconResults : spotifyResults;

    return (
        <div className="space-y-4 h-screen flex flex-col pt-4 px-4 bg-slate-950 pb-20">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <button onClick={() => navigate(`/event/${id}/queue`)} className="p-2 hover:bg-slate-800 rounded-full text-white">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-lg text-white">Search</h2>
            </div>

            {/* Search Bar */}
            <div className="sticky top-0 z-10 bg-slate-950 space-y-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search for a song..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-3 outline-none focus:border-purple-500 transition-all text-white font-medium"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-3">
                            <Loader2 className="animate-spin text-purple-500" size={20} />
                        </div>
                    )}
                </div>

                {/* Tab Bar - Only show if both sources are available or configured */}
                {eventConfig && eventConfig.allowLexicon && eventConfig.allowSpotify && (
                    <div className="flex gap-4 border-b border-slate-800">
                        <button
                            onClick={() => setActiveTab('LEXICON')}
                            className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'LEXICON'
                                ? 'text-white opacity-100'
                                : 'text-slate-400 opacity-40 hover:opacity-70'
                                }`}
                        >
                            DJ Library
                            {activeTab === 'LEXICON' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('SPOTIFY')}
                            className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'SPOTIFY'
                                ? 'text-white opacity-100'
                                : 'text-slate-400 opacity-40 hover:opacity-70'
                                }`}
                        >
                            Spotify Matches
                            {activeTab === 'SPOTIFY' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Results List */}
            <div
                className="flex-1 overflow-y-auto space-y-2 pb-4 pr-1"
                onScroll={handleScroll}
            >
                {activeResults.length > 0 ? (
                    <>
                        {activeResults.map(result => (
                            <SearchResultItem
                                key={result.id}
                                result={result}
                                onRequest={handleRequestSong}
                                isRequested={false}
                            />
                        ))}

                        {/* More Loading */}
                        {isSearching && offset > 0 && activeTab === 'SPOTIFY' && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-purple-500" size={24} />
                            </div>
                        )}

                        {/* End of List */}
                        {!hasMoreSpotify && activeTab === 'SPOTIFY' && !isSearching && (
                            <div className="text-center py-8 text-slate-500 text-sm font-medium animate-fade-in">
                                That's all we got!
                            </div>
                        )}
                    </>
                ) : activeTab === 'LEXICON' && lexiconError ? (
                    <div className="text-center text-red-400 py-10 px-4 bg-red-900/10 rounded-xl m-4 border border-red-900/30">
                        <div className="mb-3 flex justify-center"><div className="p-3 bg-red-900/20 rounded-full"><Loader2 className="animate-spin" size={20} /></div></div>

                        <p className="font-bold mb-2 text-sm text-red-300">Connection Failed</p>
                        <p className="text-xs text-slate-400 mb-4">
                            Could not reach the local DJ library.
                        </p>
                        <div className="text-left text-[10px] text-slate-500 space-y-1 bg-black/20 p-3 rounded">
                            <p>1. Ensure Lexicon is running on this computer.</p>
                            <p>2. Ensure "Enable Local API" is checked.</p>
                            <p>3. Guests must be on the same WiFi as the DJ.</p>
                        </div>
                        {/* DEBUG INFO */}
                        <div className="mt-4 p-2 bg-black/50 rounded text-[10px] font-mono text-left text-slate-500 overflow-x-auto">
                            <p>DEBUG: Connection failed.</p>
                            <p>Error: {String(lexiconError)}</p>
                        </div>
                    </div>
                ) : activeTab === 'LEXICON' && lexiconResults.length === 0 && !isSearching ? (
                    <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
                        <p>No results found in DJ Library.</p>
                        {/* DEBUG INFO - Even if connected but no results */}
                        <div className="mt-4 p-2 bg-black/50 rounded text-[10px] font-mono text-left text-slate-500 overflow-x-auto w-full max-w-xs">
                            <p className="text-yellow-500">DEBUG INFO:</p>
                            <p>Query: "{searchQuery}"</p>
                            <p>Offset: 0</p>
                        </div>
                        {/* Manual Trigger for Discovery */}
                        <button
                            onClick={async () => {
                                if ((window as any).electronAPI) {
                                    try {
                                        const port = await (window as any).electronAPI.findLexiconPort();
                                        if (port) {
                                            alert(`Electron found Lexicon on port ${port}. Trying to reload...`);
                                            window.location.reload();
                                        } else {
                                            alert("Electron could not find a running Lexicon process (checked 'lsof'). Ensure Lexicon is open.");
                                        }
                                    } catch (e) {
                                        alert("Error during discovery: " + e);
                                    }
                                } else {
                                    alert("Electron API not available. Are you in the desktop app?");
                                }
                            }}
                            className="text-[10px] text-slate-500 underline mt-2"
                        >
                            Force Rediscover Port
                        </button>
                    </div>
                ) : searchQuery && !isSearching ? (
                    <div className="text-center text-slate-500 py-10 flex flex-col items-center gap-2">
                        <p>No results found in {activeTab === 'LEXICON' ? 'DJ Library' : 'Spotify'}.</p>
                        {eventConfig?.allowLexicon && eventConfig?.allowSpotify && (
                            <button
                                onClick={() => setActiveTab(activeTab === 'LEXICON' ? 'SPOTIFY' : 'LEXICON')}
                                className="text-purple-400 underline text-sm"
                            >
                                Check {activeTab === 'LEXICON' ? 'Spotify' : 'DJ Library'}?
                            </button>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
