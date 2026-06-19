import type { Track } from '../types';
import { searchYouTube } from './youtube';

export async function searchSpotify(_query: string): Promise<Track[]> {
  // Spotify search is disabled/unauthenticated. Return empty.
  return [];
}

export async function getSpotifyCategoryTracks(category: 'Discovery' | 'Trending' | 'Mix'): Promise<Track[]> {
  try {
    let query = '';
    if (category === 'Trending') {
      query = 'top music hits';
    } else if (category === 'Discovery') {
      query = 'new releases music';
    } else {
      query = 'lofi chill mix';
    }
    
    // Fetch live tracks dynamically from YouTube Music
    const tracks = await searchYouTube(query);
    return tracks;
  } catch (error) {
    console.error(`Failed to load dynamic category ${category}:`, error);
    return [];
  }
}
