import type { Track } from '../types';

// Multiple Invidious instances — open-source YouTube frontend with proper CORS headers
// Unlike Piped, Invidious is specifically designed to allow cross-origin requests
const INVIDIOUS_INSTANCES = [
  'https://iv.ggtyler.dev',
  'https://invidious.nerdvpn.de',
  'https://invidious.lunar.icu',
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
];

// Simple request queue to avoid rate limiting from concurrent calls
let activeRequests = 0;
const MAX_CONCURRENT = 2;
const pendingQueue: Array<() => void> = [];

function throttledFetch(): Promise<void> {
  return new Promise(resolve => {
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      resolve();
    } else {
      pendingQueue.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });
}

function releaseFetch() {
  activeRequests--;
  if (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    if (next) next();
  }
}

/**
 * Fetch from Invidious API with automatic instance failover
 */
async function invidiousFetch(path: string): Promise<any> {
  await throttledFetch();
  try {
    let lastError: any = new Error('All Invidious instances failed');
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const res = await fetch(`${base}${path}`);
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  } finally {
    releaseFetch();
  }
}

/**
 * Map an Invidious video item to our Track type
 */
function invidiousVideoToTrack(item: any): Track | null {
  const videoId = item.videoId;
  if (!videoId || !item.title) return null;

  // Best available thumbnail
  const thumbnails: any[] = item.videoThumbnails || [];
  const thumb = thumbnails.find((t: any) => t.quality === 'medium') ||
                thumbnails.find((t: any) => t.quality === 'high') ||
                thumbnails[0];
  const cover = thumb?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: `yt-${videoId}`,
    title: item.title,
    artist: item.author || 'YouTube',
    cover,
    duration: item.lengthSeconds || 210,
    source: 'youtube' as const,
    videoId,
  };
}

/**
 * Search YouTube via Invidious API (proper CORS, no proxy needed)
 */
async function searchWithInvidious(query: string): Promise<Track[]> {
  try {
    const data = await invidiousFetch(
      `/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
    );
    if (!Array.isArray(data)) return getMockSearchResults(query);

    const tracks: Track[] = data
      .filter((item: any) => item.type === 'video' && item.videoId)
      .map(invidiousVideoToTrack)
      .filter(Boolean) as Track[];

    if (tracks.length === 0) return getMockSearchResults(query);
    return tracks.slice(0, 10);
  } catch (error) {
    console.error('Invidious search failed:', error);
    return getMockSearchResults(query);
  }
}

/**
 * Returns mock/static results if all APIs fail
 */
function getMockSearchResults(query: string): Track[] {
  const normalized = query.toLowerCase();
  const allMocks: Track[] = [
    {
      id: 'yt-JfJY6Y11SgQ',
      title: 'Omnicord Wave - Synthwave Lofi Beats',
      artist: 'Omnicord Records',
      cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
      duration: 180,
      source: 'youtube',
      videoId: 'JfJY6Y11SgQ',
      plays: '1.2M',
      tag: 'Trending'
    },
    {
      id: 'yt-5qap5aO4i9A',
      title: 'Lofi Hip Hop Radio - Beats to Study/Relax to',
      artist: 'ChilledCow',
      cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60',
      duration: 300,
      source: 'youtube',
      videoId: '5qap5aO4i9A',
      plays: '45.1M',
      tag: 'Discovery'
    },
    {
      id: 'yt-tntOCGkgt98',
      title: 'Deep Focus Ambient Music for Coding',
      artist: 'Ambient Waves',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      duration: 240,
      source: 'youtube',
      videoId: 'tntOCGkgt98',
      plays: '3.4M',
      tag: 'Mix'
    }
  ];

  return allMocks.filter(
    t => t.title.toLowerCase().includes(normalized) || t.artist.toLowerCase().includes(normalized)
  );
}

export async function searchYouTube(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) return [];
  return searchWithInvidious(query);
}

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // Try matching list= URL parameter
  const match = trimmed.match(/[&?]list=([^&]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Match standard ID format (18 to 34 chars)
  if (/^[a-zA-Z0-9_-]{18,34}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function scrapeYouTubePlaylist(playlistId: string): Promise<{ name: string; description: string; tracks: Track[] }> {
  try {
    const data = await invidiousFetch(`/api/v1/playlists/${playlistId}`);

    const tracks: Track[] = (data.videos || [])
      .map(invidiousVideoToTrack)
      .filter(Boolean) as Track[];

    return {
      name: data.title || 'Zaimportowana Playlista',
      description: data.description || 'Import z YouTube',
      tracks: tracks.map(t => ({ ...t, source: 'youtube' as const }))
    };
  } catch (error) {
    console.error('Invidious playlist fetch failed:', error);
    throw error;
  }
}
