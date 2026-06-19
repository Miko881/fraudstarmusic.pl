import type { Track } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// YouTube API / Invidious API / iTunes Search API Service
// ─────────────────────────────────────────────────────────────────────────────

// List of public Invidious instances to try (active, CORS-friendly)
const INVIDIOUS_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.projectsegfau.lt',
  'https://invidious.privacydev.net'
];

/**
 * Retrieves the YouTube Data API Key from config in localStorage or Vite env
 */
function getApiKey(): string | null {
  try {
    const saved = localStorage.getItem('omni_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.youtubeApiKey) {
        return parsed.youtubeApiKey.trim();
      }
    }
  } catch (e) {
    console.error('Error reading YouTube API key from localStorage:', e);
  }
  return (import.meta.env.VITE_YOUTUBE_API_KEY as string) || null;
}

/**
 * Searches YouTube using YouTube Data API v3
 */
async function searchWithYouTubeAPI(query: string, apiKey: string): Promise<Track[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`YouTube API Error: ${res.status} - ${errorData?.error?.message || 'Unknown error'}`);
  }
  
  const data = await res.json();
  if (!data.items || !Array.isArray(data.items)) return [];
  
  return data.items
    .filter((item: any) => item.id && item.id.videoId)
    .map((item: any) => {
      const snippets = item.snippet || {};
      const videoId = item.id.videoId;
      const cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      return {
        id: videoId,
        title: snippets.title || 'Nieznany tytuł',
        artist: snippets.channelTitle || 'Nieznany wykonawca',
        cover,
        duration: 240, // default placeholder, API doesn't return duration in search
        source: 'youtube' as const,
        videoId,
        tag: 'YouTube',
      };
    });
}

/**
 * Searches YouTube using public Invidious instances (CORS fallback)
 */
async function searchWithInvidious(query: string): Promise<Track[]> {
  let lastError = null;
  
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      
      if (!res.ok) continue;
      
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      
      return data
        .filter((item: any) => item.videoId)
        .map((item: any) => {
          const videoId = item.videoId;
          const cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            
          return {
            id: videoId,
            title: item.title || 'Nieznany tytuł',
            artist: item.author || 'Nieznany wykonawca',
            cover,
            duration: item.lengthSeconds || 240,
            source: 'youtube' as const,
            videoId,
            tag: 'YouTube',
          };
        });
    } catch (err: any) {
      lastError = err;
      console.warn(`Invidious instance failed: ${instance} - ${err.message}`);
    }
  }
  
  throw lastError || new Error('All Invidious instances failed');
}

/**
 * Searches iTunes Search API as metadata fallback (CORS-friendly, no keys)
 */
async function searchWithiTunes(query: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15&explicit=yes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API Error: ${res.status}`);
  
  const data = await res.json();
  if (!data.results || !Array.isArray(data.results)) return [];
  
  return data.results
    .filter((item: any) => item.trackName && item.artistName)
    .map((item: any) => {
      const cover = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
      const searchQuery = `${item.artistName} ${item.trackName}`;
      
      return {
        // Use a unique query placeholder ID so Player/OmniProvider knows to resolve it
        id: `itunes-${item.trackId || Math.random()}`,
        title: item.trackName,
        artist: item.artistName,
        cover,
        duration: Math.floor((item.trackTimeMillis || 240000) / 1000),
        source: 'youtube' as const,
        videoId: `itq-${searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, // marker
        tag: item.primaryGenreName || 'Music',
      };
    });
}

/**
 * Main Search Entrance. Tries YouTube API -> Invidious Fallback -> iTunes Fallback.
 */
export async function searchYouTube(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) return [];
  
  const apiKey = getApiKey();
  
  if (apiKey) {
    try {
      console.log('Searching via YouTube Data API...');
      return await searchWithYouTubeAPI(query, apiKey);
    } catch (err) {
      console.warn('YouTube API search failed, falling back to Invidious...', err);
    }
  }
  
  try {
    console.log('Searching via Invidious instances...');
    return await searchWithInvidious(query);
  } catch (err) {
    console.warn('Invidious search failed, falling back to iTunes API...', err);
  }
  
  try {
    console.log('Searching via iTunes Search API (requires runtime resolution)...');
    return await searchWithiTunes(query);
  } catch (err) {
    console.error('All search APIs failed:', err);
    return getMockSearchResults(query);
  }
}

function getMockSearchResults(query: string): Track[] {
  const q = query.toLowerCase();
  const mocks: Track[] = [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
      duration: 212,
      source: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      tag: 'Pop',
    }
  ];
  return mocks.filter(m =>
    m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q)
  );
}

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/[&?]list=([^&]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{18,34}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Scrapes/Fetches YouTube Playlist items. Requires YouTube API Key.
 */
export async function scrapeYouTubePlaylist(playlistId: string): Promise<{
  name: string;
  description: string;
  tracks: Track[];
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Importowanie playlist YouTube wymaga skonfigurowania klucza API w Ustawieniach.');
  }
  
  try {
    // 1. Fetch Playlist Info
    const infoUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) throw new Error(`Status ${infoRes.status} fetching playlist metadata`);
    const infoData = await infoRes.json();
    
    if (!infoData.items || infoData.items.length === 0) {
      throw new Error('Playlista nie została znaleziona lub jest prywatna.');
    }
    
    const playlistSnippet = infoData.items[0].snippet;
    const name = playlistSnippet.title || 'Zaimportowana playlista';
    const description = playlistSnippet.description || 'Zaimportowano z YouTube';
    
    // 2. Fetch Playlist Items
    const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
    const itemsRes = await fetch(itemsUrl);
    if (!itemsRes.ok) throw new Error(`Status ${itemsRes.status} fetching playlist items`);
    const itemsData = await itemsRes.json();
    
    if (!itemsData.items || !Array.isArray(itemsData.items)) {
      return { name, description, tracks: [] };
    }
    
    const tracks: Track[] = itemsData.items
      .filter((item: any) => item.contentDetails && item.contentDetails.videoId)
      .map((item: any) => {
        const snippet = item.snippet || {};
        const videoId = item.contentDetails.videoId;
        const cover = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        return {
          id: videoId,
          title: snippet.title || 'Nieznany tytuł',
          artist: snippet.videoOwnerChannelTitle || snippet.channelTitle || 'Nieznany wykonawca',
          cover,
          duration: 240, // placeholder
          source: 'youtube' as const,
          videoId,
          tag: 'YouTube Playlist'
        };
      });
      
    return { name, description, tracks };
  } catch (err: any) {
    console.error('Playlist import failed:', err);
    throw new Error(`Błąd importu playlisty: ${err.message}`);
  }
}

/**
 * Fetches related YouTube/Invidious tracks based on videoId or artist query
 */
export async function getYouTubeRecommendations(videoId?: string, seedArtist?: string): Promise<Track[]> {
  const apiKey = getApiKey();
  
  if (videoId) {
    // 1. Try YouTube Data API relatedToVideoId if key is configured
    if (apiKey) {
      try {
        console.log('Fetching YouTube related videos via API...');
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&relatedToVideoId=${encodeURIComponent(videoId)}&maxResults=15&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            return data.items
              .filter((item: any) => item.id && item.id.videoId)
              .map((item: any) => {
                const snippets = item.snippet || {};
                const vidId = item.id.videoId;
                return {
                  id: vidId,
                  title: snippets.title || 'Nieznany tytuł',
                  artist: snippets.channelTitle || 'Nieznany wykonawca',
                  cover: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
                  duration: 240,
                  source: 'youtube' as const,
                  videoId: vidId,
                  tag: 'YT Related'
                };
              });
          }
        }
      } catch (err) {
        console.warn('YouTube API relatedToVideoId failed, falling back to Invidious...', err);
      }
    }

    // 2. Try Invidious related videos
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const url = `${instance}/api/v1/videos/${encodeURIComponent(videoId)}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        
        if (res.ok) {
          const data = await res.json();
          if (data.related && Array.isArray(data.related)) {
            return data.related
              .filter((item: any) => item.videoId)
              .slice(0, 15)
              .map((item: any) => {
                const vidId = item.videoId;
                return {
                  id: vidId,
                  title: item.title || 'Nieznany tytuł',
                  artist: item.author || 'Nieznany wykonawca',
                  cover: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
                  duration: item.lengthSeconds || 240,
                  source: 'youtube' as const,
                  videoId: vidId,
                  tag: 'YT Related'
                };
              });
          }
        }
      } catch (err) {
        console.warn(`Invidious related videos failed on ${instance}:`, err);
      }
    }
  }

  // 3. Fallback: Search YouTube using artist or general query
  const query = seedArtist ? `${seedArtist} music` : 'popular music hits';
  try {
    return await searchYouTube(query);
  } catch (err) {
    console.error('All recommendations methods failed:', err);
    return [];
  }
}
