import type { Track } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Data API v3 / Invidious / iTunes Fallback Service
// ─────────────────────────────────────────────────────────────────────────────

/** Public Invidious instances – ordered by reliability. Rotated on CORS/failure. */
const INVIDIOUS_INSTANCES = [
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.io.lol',
  'https://invidious.fdn.fr',
  'https://yt.artemislena.eu',
  'https://invidious.projectsegfau.lt',
];

// ─── Quota tracking ──────────────────────────────────────────────────────────

const QUOTA_KEY = 'omni_yt_quota_exceeded_date';

/** Returns true if we've already hit the daily YouTube quota today. */
function isQuotaExceeded(): boolean {
  try {
    const stored = localStorage.getItem(QUOTA_KEY);
    if (!stored) return false;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return stored === today;
  } catch {
    return false;
  }
}

/** Mark quota as exceeded for today. Resets automatically next day. */
function markQuotaExceeded(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(QUOTA_KEY, today);
    console.warn('[YouTube] Daily quota exceeded — switching to Invidious for the rest of the day.');
  } catch { /* ignore */ }
}

// ─── API key ─────────────────────────────────────────────────────────────────

/**
 * Returns the YouTube Data API key.
 * Priority: user override (Settings / localStorage) → embedded .env key.
 */
function getApiKey(): string | null {
  // 1. User-configured override (Settings page)
  try {
    const saved = localStorage.getItem('omni_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.youtubeApiKey && parsed.youtubeApiKey.trim()) {
        return parsed.youtubeApiKey.trim();
      }
    }
  } catch (e) {
    console.error('[YouTube] Error reading API key from localStorage:', e);
  }
  // 2. Built-in key from .env
  const envKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  return envKey && envKey.trim() ? envKey.trim() : null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapYouTubeItem(item: any): Track {
  const snippets = item.snippet || {};
  const videoId: string = (item.id?.videoId ?? item.id) as string;
  return {
    id: videoId,
    title: snippets.title || 'Nieznany tytuł',
    artist: snippets.channelTitle || 'Nieznany wykonawca',
    cover: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration: 240,
    source: 'youtube' as const,
    videoId,
    tag: 'YouTube',
  };
}

function mapInvidiousItem(item: any): Track {
  const videoId: string = item.videoId as string;
  return {
    id: videoId,
    title: item.title || 'Nieznany tytuł',
    artist: item.author || 'Nieznany wykonawca',
    cover: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration: item.lengthSeconds || 240,
    source: 'youtube' as const,
    videoId,
    tag: 'YouTube',
  };
}

/**
 * Checks if a fetch Response represents a quota-exceeded error.
 * YouTube returns HTTP 403 with reason "quotaExceeded" or "dailyLimitExceeded".
 */
async function checkForQuotaError(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const clone = res.clone();
    const body = await clone.json();
    const reason: string = body?.error?.errors?.[0]?.reason ?? '';
    return reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
  } catch {
    return false;
  }
}

// ─── YouTube Data API v3 ─────────────────────────────────────────────────────

async function searchWithYouTubeAPI(query: string, apiKey: string): Promise<Track[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`;
  const res = await fetch(url);

  if (await checkForQuotaError(res)) {
    markQuotaExceeded();
    throw new Error('QUOTA_EXCEEDED');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube API ${res.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await res.json();
  return (data.items ?? []).filter((i: any) => i?.id?.videoId).map(mapYouTubeItem);
}

async function getRelatedWithYouTubeAPI(videoId: string, apiKey: string): Promise<Track[]> {
  // Note: relatedToVideoId was deprecated in Aug 2023 in the free tier.
  // We use a search query instead: "<title> artist" which is more reliable.
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&relatedToVideoId=${encodeURIComponent(videoId)}&maxResults=15&key=${apiKey}`;
  const res = await fetch(url);

  if (await checkForQuotaError(res)) {
    markQuotaExceeded();
    throw new Error('QUOTA_EXCEEDED');
  }
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);

  const data = await res.json();
  return (data.items ?? []).filter((i: any) => i?.id?.videoId).map(mapYouTubeItem);
}

// ─── Invidious ───────────────────────────────────────────────────────────────

/**
 * Try each Invidious instance in turn. Returns first successful result.
 * Uses a 5-second per-instance timeout.
 */
async function tryInvidiousInstances<T>(
  buildUrl: (instance: string) => string,
  processData: (data: any, instance: string) => T | null,
): Promise<T> {
  let lastErr: Error = new Error('No Invidious instances available');

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(buildUrl(instance), { signal: ctrl.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      const result = processData(data, instance);
      if (result !== null) return result;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Invidious] ${instance} failed:`, err.message);
    }
  }
  throw lastErr;
}

async function searchWithInvidious(query: string): Promise<Track[]> {
  console.log('[Invidious] Searching via Invidious instances...');
  return tryInvidiousInstances(
    (inst) => `${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds`,
    (data) => {
      if (!Array.isArray(data)) return null;
      const results = data.filter((i: any) => i.videoId).map(mapInvidiousItem);
      return results.length > 0 ? results : null;
    },
  );
}

/**
 * Get related videos from Invidious using SEARCH (not /videos/:id) to avoid CORS issues.
 * We search for "<title> <artist>" which gives decent related results.
 */
async function getRelatedWithInvidious(seedQuery: string, count = 15): Promise<Track[]> {
  console.log('[Invidious] Fetching recommendations via Invidious search...');
  return tryInvidiousInstances(
    (inst) => `${inst}/api/v1/search?q=${encodeURIComponent(seedQuery)}&type=video&fields=videoId,title,author,lengthSeconds`,
    (data) => {
      if (!Array.isArray(data)) return null;
      const results = data.filter((i: any) => i.videoId).slice(0, count).map(mapInvidiousItem);
      return results.length > 0 ? results : null;
    },
  );
}

// ─── iTunes fallback ─────────────────────────────────────────────────────────

async function searchWithiTunes(query: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15&explicit=yes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API ${res.status}`);

  const data = await res.json();
  return (data.results ?? [])
    .filter((i: any) => i.trackName && i.artistName)
    .map((i: any) => {
      const cover = (i.artworkUrl100 ?? '').replace('100x100bb', '400x400bb') ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
      const searchQuery = `${i.artistName} ${i.trackName}`;
      return {
        id: `itunes-${i.trackId || Math.random()}`,
        title: i.trackName,
        artist: i.artistName,
        cover,
        duration: Math.floor((i.trackTimeMillis || 240000) / 1000),
        source: 'youtube' as const,
        videoId: `itq-${searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        tag: i.primaryGenreName || 'Music',
      };
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Main search entry point.
 * Flow: YouTube Data API (if key present & quota OK) → Invidious → iTunes
 */
export async function searchYouTube(query: string): Promise<Track[]> {
  if (!query || !query.trim()) return [];

  const apiKey = getApiKey();

  // Try YouTube API only if key present and today's quota is not blown
  if (apiKey && !isQuotaExceeded()) {
    try {
      console.log('[YouTube] Searching via YouTube Data API...');
      return await searchWithYouTubeAPI(query, apiKey);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED') {
        console.warn('[YouTube] Quota exceeded — falling back to Invidious.');
      } else {
        console.warn('[YouTube] API search failed, trying Invidious...', err);
      }
    }
  } else if (isQuotaExceeded()) {
    console.log('[YouTube] Daily quota already exceeded — using Invidious directly.');
  }

  try {
    return await searchWithInvidious(query);
  } catch (invErr) {
    console.warn('[YouTube] Invidious search failed, trying iTunes...', invErr);
  }

  try {
    console.log('[YouTube] Falling back to iTunes Search API...');
    return await searchWithiTunes(query);
  } catch (err) {
    console.error('[YouTube] All search methods failed:', err);
    return [];
  }
}

/**
 * Fetch YouTube recommendations based on a videoId and/or seed query.
 * Used by Discovery, Trending, Mix sections and the Now Playing panel.
 *
 * Flow: 
 *  1. YouTube Data API (related OR search by seedQuery) — primary, uses built-in key
 *  2. Invidious search — fallback when quota exceeded or API key missing
 *  3. iTunes — last resort
 */
export async function getYouTubeRecommendations(
  videoId?: string,
  seedArtist?: string,
  seedTitle?: string,
): Promise<Track[]> {
  const apiKey = getApiKey();
  const seedQuery = [seedTitle, seedArtist].filter(Boolean).join(' ') || 'popular music hits';

  // 1. YouTube Data API — primary (always try if key present and quota not exceeded)
  if (apiKey && !isQuotaExceeded()) {
    // 1a. Try relatedToVideoId if we have a videoId
    if (videoId) {
      try {
        console.log('[YouTube] Fetching related videos via YouTube API...');
        const results = await getRelatedWithYouTubeAPI(videoId, apiKey);
        if (results.length > 0) return results;
      } catch (err: any) {
        if (err.message === 'QUOTA_EXCEEDED') {
          console.warn('[YouTube] Quota exceeded — falling back to Invidious.');
        } else {
          console.warn('[YouTube] relatedToVideoId failed, trying seedQuery search...', err);
        }
      }
    }

    // 1b. Try YouTube API search with seedQuery (works without videoId too)
    if (!isQuotaExceeded()) {
      try {
        console.log('[YouTube] Searching via YouTube Data API...');
        const results = await searchWithYouTubeAPI(seedQuery, apiKey);
        if (results.length > 0) return results;
      } catch (err: any) {
        if (err.message === 'QUOTA_EXCEEDED') {
          console.warn('[YouTube] Quota exceeded — falling back to Invidious.');
        } else {
          console.warn('[YouTube] YouTube API search failed, trying Invidious...', err);
        }
      }
    }
  } else if (isQuotaExceeded()) {
    console.log('[YouTube] Daily quota exceeded — using Invidious directly.');
  }

  // 2. Invidious — CORS-safe search-based approach (only as fallback)
  try {
    return await getRelatedWithInvidious(seedQuery);
  } catch (invErr) {
    console.warn('[YouTube] Invidious recommendations failed, trying iTunes...', invErr);
  }

  // 3. iTunes — last resort
  try {
    console.log('[YouTube] Falling back to iTunes Search API...');
    return await searchWithiTunes(seedQuery);
  } catch (err) {
    console.error('[YouTube] All recommendation methods failed:', err);
    return [];
  }
}

// ─── Playlist import ─────────────────────────────────────────────────────────

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/[&?]list=([^&]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{18,34}$/.test(trimmed)) return trimmed;
  return null;
}

export async function scrapeYouTubePlaylist(playlistId: string): Promise<{
  name: string;
  description: string;
  tracks: Track[];
}> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Importowanie playlist YouTube wymaga klucza API w Ustawieniach.');
  }
  if (isQuotaExceeded()) {
    throw new Error('Dzienny limit YouTube API został osiągnięty. Spróbuj ponownie jutro.');
  }

  // Playlist info
  const infoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  );
  if (await checkForQuotaError(infoRes)) {
    markQuotaExceeded();
    throw new Error('Dzienny limit YouTube API został osiągnięty.');
  }
  if (!infoRes.ok) throw new Error(`Status ${infoRes.status} fetching playlist metadata`);
  const infoData = await infoRes.json();

  if (!infoData.items?.length) {
    throw new Error('Playlista nie została znaleziona lub jest prywatna.');
  }

  const playlistSnippet = infoData.items[0].snippet;
  const name = playlistSnippet.title || 'Zaimportowana playlista';
  const description = playlistSnippet.description || 'Zaimportowano z YouTube';

  // Playlist items
  const itemsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`
  );
  if (await checkForQuotaError(itemsRes)) {
    markQuotaExceeded();
    throw new Error('Dzienny limit YouTube API został osiągnięty.');
  }
  if (!itemsRes.ok) throw new Error(`Status ${itemsRes.status} fetching playlist items`);
  const itemsData = await itemsRes.json();

  const tracks: Track[] = (itemsData.items ?? [])
    .filter((item: any) => item?.contentDetails?.videoId)
    .map((item: any) => {
      const snippet = item.snippet || {};
      const videoId: string = item.contentDetails.videoId;
      return {
        id: videoId,
        title: snippet.title || 'Nieznany tytuł',
        artist: snippet.videoOwnerChannelTitle || snippet.channelTitle || 'Nieznany wykonawca',
        cover: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 240,
        source: 'youtube' as const,
        videoId,
        tag: 'YouTube Playlist',
      };
    });

  return { name, description, tracks };
}

// ─── Category helpers ────────────────────────────────────────────────────────

/** Searches YouTube for tracks matching a Discovery / Trending / Mix category keyword. */
export async function getYouTubeCategoryTracks(
  category: 'Discovery' | 'Trending' | 'Mix',
): Promise<Track[]> {
  const queries: Record<typeof category, string> = {
    Discovery: 'new music 2025 indie hits',
    Trending: 'trending music 2025 viral hits',
    Mix: 'popular music mix 2025',
  };
  return searchYouTube(queries[category]);
}
