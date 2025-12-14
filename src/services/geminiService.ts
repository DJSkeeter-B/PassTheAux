import { GoogleGenerativeAI } from "@google/generative-ai";
import { SearchResult } from '../types';

const apiKey = process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const searchSongs = async (query: string): Promise<SearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Search for songs matching the query: "${query}". Return a JSON array of 5-8 objects with properties: title, artist, album. Do not include markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawData = JSON.parse(cleanedText || '[]');

    return rawData.map((item: any, index: number) => ({
      id: `gemini-${Date.now()}-${index}`,
      title: item.title,
      artist: item.artist,
      album: item.album,
      coverUrl: `https://picsum.photos/seed/${item.artist.replace(/\s/g, '')}${item.title.replace(/\s/g, '')}/300/300`
    }));

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

const searchNominatim = async (query: string) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'PassTheAux/1.0' } });
    const data = await resp.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Nominatim Error:", e);
    return null;
  }
};

export const getCoordinatesFromLocation = async (locationQuery: string): Promise<{ latitude: number, longitude: number } | null> => {
  if (!locationQuery) return null;
  const result = await searchNominatim(locationQuery);
  if (result) {
    return { latitude: parseFloat(result.lat), longitude: parseFloat(result.lon) };
  }
  return null;
};

export const searchVenuesExternal = async (query: string): Promise<{ name: string, address: string, latitude: number, longitude: number }[]> => {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'PassTheAux/1.0' } });
    const data = await resp.json();

    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));
  } catch (e) {
    return [];
  }
}
