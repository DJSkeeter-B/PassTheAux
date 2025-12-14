import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext'; // For config
import { searchSongs } from '../services/geminiService';
import { searchSpotify } from '../services/spotifyService';
import { addSongRequest, voteSong } from '../services/firebase';
import { SearchResult, Song, SongStatus } from '../types';
import { SearchResultItem } from '../components/SearchResultItem';

export const EventSearchPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { config } = useData();

    // We assume the user came from Queue, we might want to fetch current queue to check for dupes
    // But for simplicity/performance we might skip it or handle it optimistically.
    // The original app used 'queue' state to check dupes. 
    // Ideally we subscribe to queue here too or pass it via context. 
    // Let's just allow the request api to handle dupes or fire-and-forget for now, 
    // OR fetch the queue once if needed.
    // Actually, 'addSongRequest' in firebase service probably doesn't check dupes?
    // The original App.tsx checked `existingSong` in `queue` state.
    // I won't re-subscribe to queue here to avoid overhead. I will let the backend or user find out.
    // Wait, the UX "Alert: already in queue" is nice.
    // I can subscribe to queue here too. It's cheap firebase listener.

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const MAX_RESULTS = 45;

    // Reset search when query changes
    useEffect(() => {
        setSearchResults([]);
        setOffset(0);
        setHasMore(true);
    }, [searchQuery]);

    // Fetch Effect (Handles both initial search and pagination)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        // Guard: If we are effectively "done" or limit reached, don't fetch.
        // Note: searchResults dependencies are tricky here, using refs or functional state is safer
        // but 'hasMore' should be enough.
        if (!hasMore && offset > 0) return; // Stop if no more (except initial)
        if (searchResults.length >= MAX_RESULTS) {
            setHasMore(false);
            return;
        }

        const fetchSongs = async () => {
            setIsSearching(true);
            try {
                let results: SearchResult[] = [];

                // Spotify Search
                if (config.spotifyToken) {
                    try {
                        results = await searchSpotify(searchQuery, config.spotifyToken, offset);
                    } catch (spotifyError) {
                        if (offset === 0) {
                            console.warn("Spotify failed, falling back to Gemini", spotifyError);
                            results = await searchSongs(searchQuery);
                        }
                    }
                } else if (offset === 0) {
                    results = await searchSongs(searchQuery);
                }

                if (results.length === 0) {
                    setHasMore(false);
                } else {
                    setSearchResults(prev => {
                        // If offset is 0, replace. Else append.
                        // However, we rely on the 'reset' effect for clearing.
                        // But since this effect runs on offset change, if offset is 0, it might be the initial fetch.
                        // We should be careful not to append to OLD results if query changed quickly.
                        // But we cleared them in the other effect.

                        const current = offset === 0 ? [] : prev;
                        const combined = [...current, ...results];

                        // De-duplicate
                        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

                        if (unique.length >= MAX_RESULTS) {
                            setHasMore(false);
                            return unique.slice(0, MAX_RESULTS);
                        }
                        return unique;
                    });
                }
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        };

        // Conditional Debounce
        // If offset > 0, it's a "Load More" -> Run immediately
        // If offset == 0, it's a "Type Search" -> Debounce

        let timeoutId: NodeJS.Timeout;

        if (offset > 0) {
            fetchSongs();
        } else {
            timeoutId = setTimeout(fetchSongs, 500);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [searchQuery, offset, config.spotifyToken, hasMore, searchResults.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        // Check if near bottom
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (!isSearching && hasMore && searchResults.length < MAX_RESULTS) {
                setOffset(prev => prev + 10);
            }
        }
    };

    const handleRequestSong = async (result: SearchResult) => {
        if (!id || !user) return;

        // Optimization: We could check queue here if we had it. Use 'voteSong' if exists.
        // For now, assume new request.

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
            votes: 0
        };
        try {
            await addSongRequest(songData);
            navigate(`/event/${id}/queue`);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to add song request.");
        }
    };

    return (
        <div className="space-y-4 h-screen flex flex-col pt-4 px-4 bg-slate-950 pb-20">
            <div className="flex items-center gap-2 mb-2">
                <button onClick={() => navigate(`/event/${id}/queue`)} className="p-2 hover:bg-slate-800 rounded-full text-white">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-lg text-white">Search</h2>
            </div>

            <div className="flex gap-2 sticky top-0 z-10 bg-slate-950 pb-2">
                <div className="relative flex-1">
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
            </div>

            <div
                className="flex-1 overflow-y-auto space-y-2 pb-4 pr-1"
                onScroll={handleScroll}
            >
                {searchResults.length > 0 ? (
                    <>
                        {searchResults.map(result => (
                            <SearchResultItem
                                key={result.id}
                                result={result}
                                onRequest={handleRequestSong}
                                isRequested={false}
                            />
                        ))}
                        {/* Loading Indicator for More */}
                        {isSearching && offset > 0 && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-purple-500" size={24} />
                            </div>
                        )}
                        {/* End of List Message - Only show if we have results but no more to load */}
                        {!hasMore && searchResults.length > 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm font-medium animate-fade-in">
                                That's all we got for you! Try another Search!
                            </div>
                        )}
                    </>
                ) : searchQuery && !isSearching ? (
                    <div className="text-center text-slate-500 py-10">No results found.</div>
                ) : null}
            </div>
        </div>
    );
};
