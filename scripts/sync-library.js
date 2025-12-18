import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:48624/v1/tracks';
const TARGET_FILE = path.join(__dirname, '../src/data/lexicon-library.json');

async function syncLibrary() {
    console.log('🔄 Connecting to Lexicon DJ Local API...');

    try {
        const limit = 1000;
        let offset = 0;
        let allTracks = [];
        let total = 0;

        // First fetch to get total count
        process.stdout.write(`Fetching initial data... `);
        const initialResponse = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);
        if (!initialResponse.ok) throw new Error(`API Error: ${initialResponse.status}`);
        const initialJson = await initialResponse.json();

        if (!initialJson.data || !initialJson.data.tracks) {
            throw new Error('Invalid API response: missing data.tracks');
        }

        total = initialJson.data.total;
        console.log(`✅ Found ${total} tracks in library.`);

        allTracks = allTracks.concat(initialJson.data.tracks);
        offset += limit;

        // Fetch the rest
        while (offset < total) {
            process.stdout.write(`Fetching tracks ${offset} to ${Math.min(offset + limit, total)}... `);
            const response = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);

            if (!response.ok) {
                console.log('❌');
                throw new Error(`API Error: ${response.status}`);
            }

            const json = await response.json();
            const tracks = json.data.tracks;

            if (tracks && tracks.length > 0) {
                allTracks = allTracks.concat(tracks);
                console.log(`Matched ${tracks.length}`);
            } else {
                console.log('No tracks received (unexpected).');
                break;
            }

            offset += limit;
        }

        console.log(`✅ Total tracks downloaded: ${allTracks.length}`);

        // Transform data for PassTheAux
        console.log('⚙️  Processing library...');
        const cleanedLibrary = allTracks.map(track => {
            // Parse genre string like "[Pop] [Dance]" -> ["Pop", "Dance"]
            let genres = [];
            if (track.genre) {
                const matches = track.genre.match(/\[(.*?)\]/g);
                if (matches) {
                    genres = matches.map(g => g.replace(/[\[\]]/g, ''));
                } else {
                    // Fallback if not in bracket format
                    genres = [track.genre];
                }
            }

            return {
                id: track.id,
                title: track.title,
                artist: track.artist,
                bpm: track.bpm,
                key: track.key, // Camelot key usually
                genres: genres,
                energy: track.energy, // 1-10 usually or 0-?
                lastPlayed: track.lastPlayed,
                playCount: track.playCount,
                tags: track.tags // Array of tag IDs
            };
        });

        // Write to file
        fs.writeFileSync(TARGET_FILE, JSON.stringify(cleanedLibrary, null, 2));

        console.log(`💾 Saved library to ${TARGET_FILE}`);
        console.log('🚀 Ready for PassTheAux!');

    } catch (error) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            console.error('❌ Could not connect to Lexicon. Is the app running and Local API enabled?');
        } else {
            console.error('\n❌ Sync failed:', error);
        }
    }
}

syncLibrary();
