import { SearchResult } from '../types';

let cachedLibrary: any[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let resolvedHost: string | null = null;

// Helper to find the working URL
const getLexiconUrl = async (): Promise<string | null> => {
    if (resolvedHost) return resolvedHost;

    // 1. Try Default
    const defaultUrl = 'http://localhost:1337';
    try {
        const resp = await fetch(`${defaultUrl}/v1/tracks?limit=1`);
        if (resp.ok) {
            console.log("Connected to Lexicon at default port 1337");
            resolvedHost = defaultUrl;
            return defaultUrl;
        }
    } catch (e) { /* ignore */ }

    // 2. Try Auto-Discovery via Electron
    if ((window as any).electronAPI) {
        console.log("Asking Electron to find Lexicon port...");
        try {
            const port = await (window as any).electronAPI.findLexiconPort();
            if (port) {
                const url = `http://localhost:${port}`;
                console.log(`Electron found Lexicon at ${url}`);
                resolvedHost = url;
                return url;
            }
        } catch (e) {
            console.warn("Electron port discovery failed", e);
        }
    }

    // 3. Fallback: Try known common ports specifically (e.g. 48624) if Electron failed or not available
    // Try both localhost and 127.0.0.1 to avoid resolution issues
    const fallbackPorts = [48624, 53555];
    const hostsToTry = ['localhost', '127.0.0.1'];

    for (const port of fallbackPorts) {
        for (const h of hostsToTry) {
            try {
                const url = `http://${h}:${port}`;
                console.log(`Attempting fallback connection to: ${url}`);
                // Short timeout for fallback checks
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);

                const resp = await fetch(`${url}/v1/tracks?limit=1`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    console.log(`Fallback SUCCESS at ${url}`);
                    resolvedHost = url;
                    return url;
                }
            } catch (e) {
                // Silent catch for fallbacks
            }
        }
    }

    // console.warn("All Lexicon discovery methods failed.");
    return null;
};

// Internal: Syncs the library with pagination
const syncLibrary = async (host: string) => {
    const now = Date.now();
    if (cachedLibrary && (now - lastFetchTime < CACHE_DURATION)) {
        return;
    }

    console.log("Starting full Lexicon sync with pagination...");
    let allTracks: any[] = [];
    let offset = 0;
    const LIMIT = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            console.log(`Fetching tracks chunk (Offset: ${offset}, Limit: ${LIMIT})...`);
            const resp = await fetch(`${host}/v1/tracks?limit=${LIMIT}&offset=${offset}`);
            if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);

            const json = await resp.json();
            const chunk = json.data?.tracks || json.tracks || [];

            if (chunk.length === 0) {
                hasMore = false;
            } else {
                allTracks = [...allTracks, ...chunk];
                offset += LIMIT;
                if (chunk.length < LIMIT) hasMore = false;
            }
        }
    } catch (e) {
        console.error("Sync failed during pagination", e);
        // If we fetched *some* tracks, maybe keep them? 
        // For now, if sync fails, let's keep previous cache or empty to prevent partial state confusion?
        // But throwing here allows the UI to show the error.
        throw e;
    }

    // Post-Process: Fix Artwork URLs
    // Lexicon returns relative paths (e.g. /images/covers/...) or IDs.
    // We map them to absolute URLs using the host.
    allTracks = allTracks.map(t => {
        let art = t.artwork;
        if (art && typeof art === 'string' && art.startsWith('/')) {
            art = `${host}${art}`;
        }
        // Fallback: Try constructing from ID if no artwork path
        if (!art && t.id) {
            // Optimistic guess: Some versions of Lexicon serve art at /v1/tracks/:id/image
            // We won't set this blindly unless we know it works, to avoid 404 spam.
            // For now, just relying on explicit 'artwork' field.
        }

        return {
            ...t,
            // Create a standardized coverUrl property for our UI
            coverUrl: art || null, // UI handles null fallback
            artwork: art // Update original field too just in case
        };
    });

    cachedLibrary = allTracks;
    lastFetchTime = now;
    console.log(`Sync complete. Loaded ${allTracks.length} tracks.`);
};


export const verifyLexiconConnection = async (): Promise<boolean> => {
    const url = await getLexiconUrl();
    return !!url;
};

export const getLexiconPlaylists = async (): Promise<{ id: string, title: string }[]> => {
    try {
        const host = await getLexiconUrl();
        if (!host) return [];

        const url = `${host}/v1/playlists`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Failed to fetch playlists");
        const data = await resp.json();
        // Determine structure (nested folders vs flat) - simplified for now
        // This accepts both {id, title} or {id, name}
        const parseList = (list: any[]): any[] => {
            let res: any[] = [];
            for (const item of list) {
                res.push({ id: item.id, title: item.title || item.name });
                if (item.children) {
                    res = [...res, ...parseList(item.children)];
                }
            }
            return res;
        };

        if (Array.isArray(data)) return parseList(data);
        return [];
    } catch (e) {
        console.error("Error fetching Lexicon playlists", e);
        return [];
    }
};

export const searchLexicon = async (query: string): Promise<SearchResult[]> => {
    try {
        const host = await getLexiconUrl();
        if (!host) {
            console.warn("Lexicon host not found.");
            return [];
        }

        await syncLibrary(host);

        if (!cachedLibrary) return [];

        console.log(`Searching ${cachedLibrary.length} tracks for query: "${query}"`);

        // Client-side Filter
        const lowerQ = query.toLowerCase();
        const results = cachedLibrary.filter((track: any) => {
            const matchTitle = track.title?.toLowerCase().includes(lowerQ);
            const matchArtist = track.artist?.toLowerCase().includes(lowerQ);
            return matchTitle || matchArtist;
        });

        console.log(`Found ${results.length} matches.`);

        // Map to SearchResult
        return results.slice(0, 50).map((track: any) => {
            return {
                id: `lexicon-${track.id}`,
                title: track.title,
                artist: track.artist,
                album: track.album || '',
                coverUrl: track.coverUrl || 'https://placehold.co/60x60/22c55e/ffffff?text=MP3',
                previewUrl: null,
                source: 'LEXICON',
                bpm: track.bpm ? Math.round(track.bpm) : undefined,
                key: track.key || undefined,
                energy: track.energy ? Math.min(100, track.energy * 10) : undefined
            };
        });

    } catch (e) {
        console.error("Lexicon search error", e);
        return [];
    }
};

export const getAllTracksSample = async (): Promise<any[]> => {
    try {
        const host = await getLexiconUrl();
        if (!host) throw new Error("Could not find Lexicon Host.");

        await syncLibrary(host);

        return (cachedLibrary || []).slice(0, 100).map((track: any) => ({
            ...track,
            // Ensure coverUrl is set for the viewer
            coverUrl: track.coverUrl || 'https://placehold.co/60x60/22c55e/ffffff?text=MP3'
        }));
    } catch (e: any) {
        console.error("Debug fetch failed", e);
        throw new Error(e.message || "Unknown error in getAllTracksSample");
    }
};
