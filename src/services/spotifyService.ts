import { SearchResult } from '../types';

export const searchSpotify = async (query: string, token: string, offset: number = 0): Promise<SearchResult[]> => {
  if (!query || !token) return [];

  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired or invalid');
      }
      throw new Error('Spotify API Error');
    }

    const data = await response.json();
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      coverUrl: track.album.images.find((img: any) => img.height < 400)?.url || track.album.images[0]?.url || '',
      previewUrl: track.preview_url
    }));
  } catch (error) {
    console.error("Spotify Search Error:", error);
    throw error;
  }
};

export const getAudioFeatures = async (trackId: string, token: string): Promise<{ bpm?: number, key?: string, energy?: number } | null> => {
  if (!trackId || !token) return null;

  try {
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Convert Spotify Key integer to Pitch Class notation (or standard) if needed
    // 0 = C, 1 = C#, 2 = D, etc.
    const pitchClass = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const mode = data.mode === 1 ? 'Major' : 'Minor';
    const keyStr = data.key >= 0 && data.key < 12 ? `${pitchClass[data.key]} ${mode}` : undefined;

    return {
      bpm: Math.round(data.tempo),
      key: keyStr,
      energy: Math.round(data.energy * 100) // Convert 0.0-1.0 to 0-100
    };
  } catch (error) {
    console.error("Spotify Audio Features Error:", error);
    return null;
  }
};
