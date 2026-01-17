import { SearchResult } from '../types';
import { searchSpotify } from './spotifyService';

class PrivacyProxyService {
    private isPrivacyMode: boolean = true;
    private spotifyToken: string | null = null;
    private unsubscribe: (() => void) | null = null;
    private onSafeTrack: ((track: SearchResult | null) => void) | null = null;

    constructor() {
        // Load preference
        const saved = localStorage.getItem('serato_privacy_mode');
        this.isPrivacyMode = saved !== 'false'; // Default to true
    }

    public setSpotifyToken(token: string) {
        this.spotifyToken = token;
    }

    public setPrivacyMode(enabled: boolean) {
        this.isPrivacyMode = enabled;
        localStorage.setItem('serato_privacy_mode', String(enabled));
    }

    public getPrivacyMode() {
        return this.isPrivacyMode;
    }

    public setOnSafeTrack(callback: (track: SearchResult | null) => void) {
        this.onSafeTrack = callback;
    }

    public async startListening(url?: string) {
        if (!window.electronAPI) {
            console.warn("PrivacyProxy: Electron API not available");
            return;
        }

        console.log("PrivacyProxy: Starting Serato Listener...", url);

        // Start backend monitoring
        await window.electronAPI.startSeratoMonitoring({ url });

        // Attach listener
        this.attach();
    }

    public attach() {
        if (!window.electronAPI) return;

        // Subscribe to updates if not already subscribed
        if (this.unsubscribe) this.unsubscribe();

        this.unsubscribe = window.electronAPI.onSeratoUpdate(async (rawTrack: any) => {
            console.log("PrivacyProxy: Received from Serato", rawTrack);
            await this.processTrack(rawTrack);
        });
    }

    public stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (window.electronAPI) {
            window.electronAPI.stopSeratoMonitoring();
        }
    }

    private async processTrack(rawTrack: { artist: string, title: string }) {
        if (!this.onSafeTrack) return;

        // 1. If Privacy Mode is OFF, show raw data (mapped to SearchResult shape)
        if (!this.isPrivacyMode) {
            const track: SearchResult = {
                id: `serato-raw-${Date.now()}`,
                title: rawTrack.title,
                artist: rawTrack.artist,
                album: 'Serato Local',
                coverUrl: '', // No art
                source: 'SERATO',
                previewUrl: null
            };
            this.onSafeTrack(track);
            return;
        }

        // 2. Privacy Mode ON: Verify with Spotify
        if (!this.spotifyToken) {
            console.warn("PrivacyProxy: No Spotify token available for verification. Hiding track.");
            this.onSafeTrack(null); // Fail safe: Hide if we can't verify
            return;
        }

        try {
            // Clean up the query
            const cleanArtist = rawTrack.artist.replace(/\(.*\)/, '').trim();
            const cleanTitle = rawTrack.title.replace(/\(.*\)/, '').replace(/feat\..*/i, '').trim();
            const query = `${cleanArtist} ${cleanTitle}`;

            console.log("PrivacyProxy: Verifying...", query);

            const results = await searchSpotify(query, this.spotifyToken);

            if (results && results.length > 0) {
                // Strict Matching Logic
                // We check the first result. If it's not similar enough, we discard it.
                const match = results[0];

                const artistSim = this.calculateSimilarity(rawTrack.artist.toLowerCase(), match.artist.toLowerCase());
                const titleSim = this.calculateSimilarity(rawTrack.title.toLowerCase(), match.title.toLowerCase());

                // Allow if EITHER:
                // 1. Artist matches strongly (>0.6) AND Title matches moderately (>0.5)
                // 2. Title matches strongly (>0.8) (sometimes artists are "Various Artists")
                const isMatch = (artistSim > 0.6 && titleSim > 0.5) || (titleSim > 0.8 && artistSim > 0.3);

                console.log(`PrivacyProxy: Similarity Check: Artist=${artistSim.toFixed(2)}, Title=${titleSim.toFixed(2)} -> Match? ${isMatch}`);

                if (isMatch) {
                    console.log("PrivacyProxy: Match Found!", match.title);
                    this.onSafeTrack({
                        ...match,
                        source: 'SERATO_VERIFIED' // Mark as trusted
                    });
                } else {
                    console.log("PrivacyProxy: result found but rejected due to low similarity.");
                    this.onSafeTrack(null);
                }

            } else {
                console.log("PrivacyProxy: No Match Found. Hiding.");
                this.onSafeTrack(null);
            }
        } catch (e) {
            console.error("PrivacyProxy: Verification failed", e);
            this.onSafeTrack(null);
        }
    }

    // Levenshtein-like Similarity (0 to 1)
    private calculateSimilarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshtein(longer, shorter);
        return (longer.length - editDistance) / parseFloat(String(longer.length));
    }

    private levenshtein(s1: string, s2: string): number {
        const costs: number[] = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) {
                costs[s2.length] = lastValue;
            }
        }
        return costs[s2.length];
    }
}

export const privacyProxy = new PrivacyProxyService();
