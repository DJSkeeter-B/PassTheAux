
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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

    // Results State
    const [lexiconResults, setLexiconResults] = useState<SearchResult[]>([]);
    const [lexiconError, setLexiconError] = useState<boolean>(false);
    const [spotifyResults, setSpotifyResults] = useState<SearchResult[]>([]);

    // UI State
    const [isLexiconExpanded, setIsLexiconExpanded] = useState(false);

    // Pagination (Mainly for Spotify)
    const [offset, setOffset] = useState(0);
    const [hasMoreSpotify, setHasMoreSpotify] = useState(true);

    const MAX_RESULTS = 45;

    // Reset search when query changes
    useEffect(() => {
        setLexiconResults([]);
        setSpotifyResults([]);
        setLexiconError(false);
        setOffset(0);
        setHasMoreSpotify(true);
        setIsLexiconExpanded(false);
    }, [searchQuery]);

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

    const lexiconVisibleResults = isLexiconExpanded ? lexiconResults : lexiconResults.slice(0, 10);
    const showLexiconSeeMore = lexiconResults.length > 10;

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
            <div className="sticky top-0 z-10 bg-slate-950 space-y-3 pb-2 transition-all">
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search for a song..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-3 outline-none focus:border-purple-500 transition-all text-white font-medium shadow-xl"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-3">
                            <Loader2 className="animate-spin text-purple-500" size={20} />
                        </div>
                    )}
                </div>
            </div>

            {/* Results List */}
            <div
                className="flex-1 overflow-y-auto space-y-6 pb-4 pr-1 scrollbar-hide"
                onScroll={handleScroll}
            >
                {/* LEXICON RESULTS SECTION */}
                {eventConfig?.allowLexicon && (
                    <div className="space-y-2">
                        {lexiconResults.length > 0 && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">DJ Library</h3>
                            </div>
                        )}

                        {lexiconError && (
                            <div className="text-center text-red-400 py-6 px-4 bg-red-900/10 rounded-xl border border-red-900/30">
                                <p className="font-bold mb-1 text-sm">Connection Failed</p>
                                <p className="text-xs text-slate-400">Could not reach local DJ library.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {lexiconVisibleResults.map(result => (
                                <SearchResultItem
                                    key={`lex-${result.id}`}
                                    result={result}
                                    onRequest={handleRequestSong}
                                    isRequested={false}
                                />
                            ))}
                        </div>

                        {showLexiconSeeMore && (
                            <button
                                onClick={() => setIsLexiconExpanded(!isLexiconExpanded)}
                                className="w-full py-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                            >
                                {isLexiconExpanded ? (
                                    <>Show Less <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" /></>
                                ) : (
                                    <>See More ({lexiconResults.length - 10}) <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" /></>
                                )}
                            </button>
                        )}

                        {lexiconResults.length === 0 && searchQuery && !isSearching && !lexiconError && (
                            <div className="py-2 px-4 text-xs text-slate-600 italic text-center">
                                No matches in DJ Library
                            </div>
                        )}
                    </div>
                )}

                {/* SPOTIFY RESULTS SECTION */}
                {eventConfig?.allowSpotify && (
                    <div className="space-y-2">
                        {spotifyResults.length > 0 && (
                            <div className="flex items-center gap-2 mb-2 mt-6 px-1">
                                <div className="h-4 w-1 bg-green-500 rounded-full"></div>
                                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider">Spotify Match</h3>
                            </div>
                        )}

                        <div className="space-y-2">
                            {spotifyResults.map(result => (
                                <SearchResultItem
                                    key={`spot-${result.id}`}
                                    result={result}
                                    onRequest={handleRequestSong}
                                    isRequested={false}
                                />
                            ))}
                        </div>

                        {/* More Loading */}
                        {isSearching && offset > 0 && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-purple-500" size={24} />
                            </div>
                        )}

                        {/* End of List */}
                        {!hasMoreSpotify && !isSearching && spotifyResults.length > 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm font-medium animate-fade-in opacity-50">
                                End of results
                            </div>
                        )}
                    </div>
                )}

                {!searchQuery && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-slate-500">
                        <Search size={40} className="mb-4" />
                        <p className="text-sm font-medium">Search for your favorite tracks</p>
                    </div>
                )}
            </div>
        </div>
    );
};
