const EventEmitter = require('events');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SeratoService extends EventEmitter {
    constructor() {
        super();
        this.pollInterval = null;
        this.lastTrack = null;
        this.isMonitoring = false;
        // Default middleware port (e.g., Serato Now Playing app often uses 8000 or 5000)
        // Or if scraping Serato's direct output if we find a way.
        this.targetUrl = 'http://localhost:8000/nowplaying';
    }

    startMonitoring(options = {}) {
        if (this.isMonitoring) return;

        console.log('[SeratoService] Starting monitoring...');
        this.isMonitoring = true;

        if (options.url) this.targetUrl = options.url;

        // 1. Polling Strategy (For Middleware/HTTP outputs)
        this.pollInterval = setInterval(() => {
            this.checkHttpSource();
        }, 3000); // Check every 3 seconds

        // 2. File Watcher Strategy (Optional / specific implementations)
        // This could be enabled if we know the path to a text file provided by another tool
        if (options.watchFile) {
            this.watchFile(options.watchFile);
        }
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        console.log('[SeratoService] Stopping monitoring...');
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.isMonitoring = false;
    }

    async checkHttpSource() {
        console.log("[SeratoService] Polling URL:", this.targetUrl);
        this.emit('status-update', { type: 'info', message: `Polling ${this.targetUrl}` });

        const protocol = this.targetUrl.startsWith('https') ? require('https') : require('http');

        const req = protocol.get(this.targetUrl, (res) => {
            console.log(`[SeratoService] Response Status: ${res.statusCode}`);

            if (res.statusCode !== 200) {
                this.emit('status-update', { type: 'error', code: res.statusCode, message: `HTTP Error ${res.statusCode}` });
            } else {
                this.emit('status-update', { type: 'success', code: 200, message: 'Connected' });
            }

            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log("[SeratoService] Response Length:", data.length);

                // ALWAYS DUMP to file for debugging
                try {
                    const debugPath = path.join(process.cwd(), 'serato_debug.html');
                    console.log('[SeratoService] Dumping HTML to:', debugPath);
                    fs.writeFileSync(debugPath, data);
                } catch (err) {
                    console.error('Failed to write debug file', err);
                }

                try {
                    const json = JSON.parse(data);
                    this.processTrackData(json);
                } catch (e) {
                    // console.log("[SeratoService] Parsing as Text/HTML...");

                    // Regex to find tracks in HTML if it's HTML
                    // Format often: <div class="playlist-trackname">\n  Artist - Title  \n</div>
                    // Relaxed regex to handle variations in attributes
                    const regex = /<div[^>]*class=["'].*?playlist-trackname.*?["'][^>]*>([\s\S]*?)<\/div>/gi;

                    // CRITICAL FIX: The HTML lists tracks newest-first. 
                    // Previously we looped and took the *last* match (oldest).
                    // We must take the *first* match.
                    const match = regex.exec(data);
                    let lastTrackRaw = match ? match[1].trim() : null;

                    if (lastTrackRaw) {
                        console.log("[SeratoService] Latest Track Found:", lastTrackRaw);

                        // Parse "Artist - Title"
                        let artist = 'Unknown';
                        let title = lastTrackRaw;

                        // Some formats use "Artist - Title", others might differ. 
                        // Often Serato outputs "Artist - Title"
                        if (lastTrackRaw.includes(' - ')) {
                            const parts = lastTrackRaw.split(' - ');
                            artist = parts[0];
                            title = parts.slice(1).join(' - ');
                        } else if (lastTrackRaw.includes('-')) {
                            const parts = lastTrackRaw.split('-');
                            artist = parts[0];
                            title = parts.slice(1).join('-');
                        }

                        // Dump to file for debugging
                        try {
                            const debugPath = path.join(process.cwd(), 'serato_debug.html');
                            console.log('[SeratoService] Dumping HTML to:', debugPath);
                            fs.writeFileSync(debugPath, data);
                        } catch (err) {
                            console.error('Failed to write debug file', err);
                        }
                        this.processTrackData({ artist: artist.trim(), title: title.trim() });
                    } else {
                        // Warn if we got 200 OK but regex failed
                        if (res.statusCode === 200 && data.length > 0) {
                            this.emit('status-update', { type: 'warning', message: 'Connected but no tracks found in HTML', snippet: data.substring(0, 100) });
                        }
                    }
                }
            });
        });

        req.on('error', (e) => {
            // Suppress connection refused errors to avoid spamming logs when Serato/Middleware is closed
            if (e.code !== 'ECONNREFUSED') {
                console.log(`[SeratoService] HTTP Check Error: ${e.message}`);
                this.emit('status-update', { type: 'error', message: `Connection Error: ${e.message}` });
            } else {
                this.emit('status-update', { type: 'error', message: 'Connection Refused (Is Serato Live active?)' });
            }
        });

        req.end();
    }

    processTrackData(data) {
        if (!data || !data.title) return;

        // Normalize
        const currentTrack = {
            artist: data.artist || data.performer || 'Unknown',
            title: data.title || 'Unknown',
            deck: data.deck, // Optional
            bpm: data.bpm
        };

        // Check for change
        if (this.isDifferent(this.lastTrack, currentTrack)) {
            console.log('[SeratoService] New Track Detected:', currentTrack);
            this.lastTrack = currentTrack;
            this.emit('track-change', currentTrack);
        }
    }

    isDifferent(t1, t2) {
        if (!t1 || !t2) return true;
        return t1.title !== t2.title || t1.artist !== t2.artist;
    }

    watchFile(filePath) {
        // Simple file watcher for a text file (e.g. "NowPlaying.txt")
        // Useful for "Serato Now Playing" tools that write to a file.
        try {
            if (!fs.existsSync(filePath)) {
                // If file doesn't exist, we can't watch it strictly, 
                // but we might want to poll for existence. For now, warn.
                console.warn('[SeratoService] Watch file does not exist:', filePath);
                return;
            }

            console.log('[SeratoService] Watching file:', filePath);
            fs.watch(filePath, (eventType, filename) => {
                if (eventType === 'change') {
                    fs.readFile(filePath, 'utf8', (err, content) => {
                        if (err) return;
                        // Assuming "Artist - Title" format
                        if (content && content.includes('-')) {
                            const parts = content.split('-').map(s => s.trim());
                            if (parts.length >= 2) {
                                this.processTrackData({ artist: parts[0], title: parts.slice(1).join(' - ') });
                            }
                        }
                    });
                }
            });
        } catch (e) {
            console.error('[SeratoService] File Watch Error:', e);
        }
    }
}

module.exports = new SeratoService();
