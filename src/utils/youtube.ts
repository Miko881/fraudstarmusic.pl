import type { Track } from '../types';

// Multiple Piped API instances for failover
// Piped is an open-source YouTube frontend with a public API that supports CORS
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://piped-api.garudalinux.org',
  'https://api.piped.projectsegfau.lt',
];

/**
 * Fetch from Piped API with automatic instance failover
 */
async function pipedFetch(path: string): Promise<any> {
  let lastError: any = new Error('All Piped instances failed');
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Map a Piped stream item to our Track type
 */
function pipedStreamToTrack(item: any): Track | null {
  // url looks like "/watch?v=VIDEO_ID"
  const videoId = item.url?.split('v=')?.[1]?.split('&')?.[0];
  if (!videoId || !item.title) return null;

  // Piped thumbnails from pipedimg.kavin.rocks sometimes have ?host= params
  let cover = item.thumbnail || '';

  return {
    id: `yt-${videoId}`,
    title: item.title,
    artist: item.uploaderName || 'YouTube',
    cover,
    duration: item.duration || 210,
    source: 'youtube' as const,
    videoId,
  };
}

/**
 * Search YouTube via Piped API (JSON, no CORS issues)
 */
async function searchWithPiped(query: string): Promise<Track[]> {
  try {
    const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=videos`);
    if (!data?.items || !Array.isArray(data.items)) return getMockSearchResults(query);

    const tracks: Track[] = data.items
      .filter((item: any) => item.type === 'stream' || item.duration)
      .map(pipedStreamToTrack)
      .filter(Boolean) as Track[];

    if (tracks.length === 0) return getMockSearchResults(query);
    return tracks.slice(0, 10);
  } catch (error) {
    console.error('Piped search failed:', error);
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
  return searchWithPiped(query);
}

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();

  // Try matching list= URL parameter
  const match = trimmed.match(/[&?]list=([^&]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Match standard ID format (usually starts with PL or similar, 18 to 34 chars)
  if (/^[a-zA-Z0-9_-]{18,34}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function scrapeYouTubePlaylist(playlistId: string): Promise<{ name: string; description: string; tracks: Track[] }> {
  try {
    const data = await pipedFetch(`/playlists/${playlistId}`);

    const tracks: Track[] = (data.relatedStreams || [])
      .map(pipedStreamToTrack)
      .filter(Boolean) as Track[];

    const name = data.name || 'Zaimportowana Playlista';
    const description = data.shortDescription || 'Import z YouTube';

    return {
      name,
      description,
      tracks: tracks.map(t => ({ ...t, source: 'youtube' as const }))
    };
  } catch (error) {
    console.error('Piped playlist fetch failed:', error);
    throw error;
  }
}
