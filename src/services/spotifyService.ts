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
