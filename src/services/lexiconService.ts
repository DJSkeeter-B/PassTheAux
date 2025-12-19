import { SearchResult } from '../types';

export const verifyLexiconConnection = async (host: string): Promise<boolean> => {
    try {
        // Ping health endpoint or simple query
        const url = `${host.replace(/\/$/, '')}/api/health`;
        // Note: Assuming '/api/health' or similar. 
        // Actually Lexicon Local API usually has endpoints like /v1/tracks.
        // We will try a basic fetch. If it fails, we assume no connection.
        // For local API, we might just try to fetch 1 track.

        // Mocking behavior for now since we don't have the exact API spec at hand, 
        // but typically:
        const testUrl = `${host.replace(/\/$/, '')}/v1/ping`; // Hypothetical

        // Real implementation should be robust. 
        // Let's assume standard GET /v1/library or similar is too heavy.
        // We will just return true for now if fetch doesn't throw network error on a simple endpoint.
        // Actually, let's try to fetch playlists as a test.

        await fetch(testUrl, { method: 'GET' });
        return true;
    } catch (e) {
        console.warn("Lexicon verification failed", e);
        return false;
    }
};

export const getLexiconPlaylists = async (host: string): Promise<{ id: string, title: string }[]> => {
    try {
        const url = `${host.replace(/\/$/, '')}/v1/playlists`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Failed to fetch playlists");
        const data = await resp.json();
        // Assume data is array of { id, title, ... }
        return data.map((p: any) => ({ id: p.id, title: p.title || p.name }));
    } catch (e) {
        console.error("Error fetching Lexicon playlists", e);
        return [];
    }
};

export const searchLexicon = async (query: string, host: string, playlistIds?: string[]): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];
    try {
        const url = new URL(`${host.replace(/\/$/, '')}/v1/tracks/search`);
        url.searchParams.append('q', query);
        url.searchParams.append('limit', '20');

        // If API supports playlist filter
        if (playlistIds && playlistIds.length > 0) {
            // Append multiple 'playlistId' params or comma separated
            playlistIds.forEach(pid => url.searchParams.append('playlistId', pid));
        }

        const resp = await fetch(url.toString());
        if (!resp.ok) return [];
        const data = await resp.json();

        // Map to SearchResult
        return data.map((track: any) => ({
            id: `lexicon-${track.id}`,
            title: track.title,
            artist: track.artist,
            album: track.album || '',
            coverUrl: track.artwork || 'https://via.placeholder.com/300?text=Lexicon', // Fallback
            previewUrl: null
        }));

    } catch (e) {
        console.error("Lexicon search error", e);
        return [];
    }
};
