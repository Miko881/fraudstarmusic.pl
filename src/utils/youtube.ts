import type { Track } from '../types';


function unescapeYTResponse(dataEscaped: string): string {
  // 1. Replace double backslashes \\ with single backslash \
  let str = dataEscaped.replace(/\\\\/g, '\\');

  // 2. Replace hex escapes \xHH with their character equivalents
  str = str.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // 3. Replace escaped single quotes \' with ' (since single quotes should not be escaped in JSON)
  str = str.replace(/\\'/g, "'");

  return str;
}

/**
 * Robust fetch helper that rotates between public CORS proxies in production to avoid 403 limits
 */
async function fetchHtmlWithFallbackProxies(targetUrl: string): Promise<string> {
  const proxies = [
    // 1. CORS.lol (Works great with YouTube Music search queries and special characters)
    `https://api.cors.lol/?url=${encodeURIComponent(targetUrl)}`,
    `https://cors.lol/?url=${encodeURIComponent(targetUrl)}`,
    // 2. CodeTabs CORS Proxy
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    // 3. AllOrigins (Raw HTML option)
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  let lastError: any = new Error("All proxies failed");
  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const text = await response.text();
        // Basic check to ensure we got a valid response (not a proxy error shell)
        if (text && text.length > 500 && !text.includes("CORS Proxy Error") && !text.includes("403 Forbidden")) {
          return text;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Recursive collector that extracts music items from YouTube Music Initial Data structure
 */
function collectTracksFromYTMusic(obj: any, tracks: Track[] = []): Track[] {
  if (!obj || typeof obj !== 'object') return tracks;

  // Check if this object is a track representation on music.youtube.com
  if (obj.musicResponsiveListItemRenderer) {
    const renderer = obj.musicResponsiveListItemRenderer;

    // Extract videoId
    let videoId = renderer.playlistItemData?.videoId;
    if (!videoId) {
      videoId = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
    }
    if (!videoId) {
      const runs = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
      const watchEndpoint = runs?.[0]?.navigationEndpoint?.watchEndpoint;
      videoId = watchEndpoint?.videoId;
    }

    // Extract Title
    const titleColumn = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer;
    const title = titleColumn?.text?.runs?.[0]?.text || '';

    // Extract Artist (ignoring type badges, separator dots, views, and duration)
    const artistColumn = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer;
    const artistRuns = artistColumn?.text?.runs || [];
    const runTexts = artistRuns.map((r: any) => r.text).filter((t: string) => t !== ' • ');
    const types = ['song', 'video', 'artist', 'album', 'playlist', 'single', 'ep', 'utwór', 'teledysk', 'artysta', 'album', 'składanka'];

    let artist = 'YouTube Music';
    if (runTexts.length > 0) {
      const first = runTexts[0].toLowerCase().trim();
      if (types.includes(first) && runTexts.length > 1) {
        artist = runTexts[1];
      } else {
        artist = runTexts[0];
      }
    }

    // Extract Thumbnail
    let cover = '';
    const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    if (thumbnails && thumbnails.length > 0) {
      cover = thumbnails[thumbnails.length - 1].url; // Take higher res thumbnail if available
      if (cover.includes('w120-h120')) {
        cover = cover.replace('w120-h120', 'w500-h500');
      }
      cover = cover.replace(/\\u0026/g, '&').replace(/u0026/g, '&');
    }

    // Parse simple duration like "4:32" to seconds
    let duration = 210;
    for (const col of renderer.flexColumns || []) {
      const colRuns = col.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      for (const run of colRuns) {
        const text = run.text || '';
        if (/^\d+:\d+(:\d+)?$/.test(text)) {
          const parts = text.split(':').map(Number);
          if (parts.length === 2) duration = parts[0] * 60 + parts[1];
          else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          break;
        }
      }
    }

    if (videoId && title) {
      // Prevent duplicates from multiple categories in the same search result page
      if (!tracks.some(t => t.videoId === videoId)) {
        tracks.push({
          id: `ytm-${videoId}`,
          title,
          artist,
          cover,
          duration,
          source: 'youtube',
          videoId
        });
      }
    }
  }

  // Also extract from musicCardShelfRenderer (Top Result card)
  if (obj.musicCardShelfRenderer) {
    const renderer = obj.musicCardShelfRenderer;
    const videoId = renderer.buttons?.[0]?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId || renderer.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
    const title = renderer.title?.runs?.[0]?.text || '';

    // Extract artist name
    const subtitleRuns = renderer.subtitle?.runs || [];
    const runTexts = subtitleRuns.map((r: any) => r.text).filter((t: string) => t !== ' • ');
    const types = ['song', 'video', 'artist', 'album', 'playlist', 'single', 'ep', 'utwór', 'teledysk', 'artysta', 'album', 'składanka'];

    let artist = 'YouTube Music';
    if (runTexts.length > 0) {
      const first = runTexts[0].toLowerCase().trim();
      if (types.includes(first) && runTexts.length > 1) {
        artist = runTexts[1];
      } else {
        artist = runTexts[0];
      }
    }

    let cover = '';
    const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    if (thumbnails && thumbnails.length > 0) {
      cover = thumbnails[thumbnails.length - 1].url;
      if (cover.includes('w120-h120')) {
        cover = cover.replace('w120-h120', 'w500-h500');
      }
      cover = cover.replace(/\\u0026/g, '&').replace(/u0026/g, '&');
    }

    if (videoId && title && !tracks.some(t => t.videoId === videoId)) {
      tracks.push({
        id: `ytm-${videoId}`,
        title,
        artist,
        cover,
        duration: 220,
        source: 'youtube',
        videoId
      });
    }
  }

  // Recurse into all child elements
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object') {
      collectTracksFromYTMusic(obj[key], tracks);
    }
  }

  return tracks;
}

/**
 * Fallback YouTube Music Scraper using public gadgets proxy targeting music.youtube.com
 */
async function searchWithScraper(query: string): Promise<Track[]> {
  try {
    const isDev = import.meta.env.DEV;
    let html = '';
    
    if (isDev) {
      const response = await fetch(`/api/ytm/search?q=${encodeURIComponent(query)}&gl=US&hl=en`);
      if (!response.ok) throw new Error("Local proxy fetch failed");
      html = await response.text();
    } else {
      const targetUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}&gl=US&hl=en`;
      html = await fetchHtmlWithFallbackProxies(targetUrl);
    }

    const tracks: Track[] = [];

    // Parse all occurrences of initialData.push in the HTML page.
    // In YouTube Music, search shelf renders are pushed into this array as hex-escaped strings.
    // We use a robust regex that matches single-quoted strings containing escaped quotes (\') or backslashes.
    const regex = /initialData\.push\({\s*path:\s*'([^']+)'(?:,\s*params:\s*JSON\.parse\('(?:[^'\\]*(?:\\[\s\S][^'\\]*)*)'\))?,\s*data:\s*'([^'\\]*(?:\\[\s\S][^'\\]*)*)'/g;
    let match;
    let foundSearchData = false;

    while ((match = regex.exec(html)) !== null) {
      const path = match[1];
      const dataEscaped = match[2];

      if (path.includes('/search')) {
        foundSearchData = true;
        const jsonStr = unescapeYTResponse(dataEscaped);

        try {
          const searchData = JSON.parse(jsonStr);
          collectTracksFromYTMusic(searchData, tracks);
        } catch (err: any) {
          console.error("Failed to parse search data chunk:", err);
          if (err instanceof SyntaxError && err.message) {
            const matchOffset = err.message.match(/position (\d+)/);
            if (matchOffset) {
              const pos = parseInt(matchOffset[1], 10);
              const start = Math.max(0, pos - 50);
              const end = Math.min(jsonStr.length, pos + 50);
              console.warn("Context around JSON error position " + pos + ":", jsonStr.substring(start, end));
            }
          }
        }
      }
    }

    if (!foundSearchData || tracks.length === 0) {
      // If we didn't find the push block, try standard ytInitialData (fallback)
      const startIdx = html.indexOf('ytInitialData =');
      if (startIdx !== -1) {
        const endIdx = html.indexOf(';</script>', startIdx);
        if (endIdx !== -1) {
          const jsonStr = html.substring(startIdx + 'ytInitialData ='.length, endIdx).trim();
          try {
            const data = JSON.parse(jsonStr);
            collectTracksFromYTMusic(data, tracks);
          } catch (e) {
            console.error("Failed to parse fallback ytInitialData:", e);
          }
        }
      }
    }

    if (tracks.length === 0) {
      return getMockSearchResults(query);
    }

    return tracks.slice(0, 10);
  } catch (error) {
    console.error("YouTube Music search scraping failed:", error);
    return getMockSearchResults(query);
  }
}

/**
 * Returns mock/static results if YouTube is blocked or fails
 */
function getMockSearchResults(query: string): Track[] {
  const normalized = query.toLowerCase();
  const allMocks: Track[] = [
    {
      id: "yt-JfJY6Y11SgQ",
      title: "Omnicord Wave - Synthwave Lofi Beats",
      artist: "Omnicord Records",
      cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
      duration: 180,
      source: 'youtube',
      videoId: "JfJY6Y11SgQ",
      plays: "1.2M",
      tag: "Trending"
    },
    {
      id: "yt-5qap5aO4i9A",
      title: "Lofi Hip Hop Radio - Beats to Study/Relax to",
      artist: "ChilledCow",
      cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60",
      duration: 300,
      source: 'youtube',
      videoId: "5qap5aO4i9A",
      plays: "45.1M",
      tag: "Discovery"
    },
    {
      id: "yt-tntOCGkgt98",
      title: "Deep Focus Ambient Music for Coding",
      artist: "Ambient Waves",
      cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      duration: 240,
      source: 'youtube',
      videoId: "tntOCGkgt98",
      plays: "3.4M",
      tag: "Mix"
    }
  ];

  return allMocks.filter(
    t => t.title.toLowerCase().includes(normalized) || t.artist.toLowerCase().includes(normalized)
  );
}

export async function searchYouTube(query: string): Promise<Track[]> {
  if (!query || query.trim().length === 0) return [];
  return searchWithScraper(query);
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
    const isDev = import.meta.env.DEV;
    let html = '';
    
    if (isDev) {
      const response = await fetch(`/api/ytm/playlist?list=${playlistId}`);
      if (!response.ok) throw new Error("Local playlist proxy fetch failed");
      html = await response.text();
    } else {
      const playlistUrl = `https://music.youtube.com/playlist?list=${playlistId}`;
      html = await fetchHtmlWithFallbackProxies(playlistUrl);
    }

    const tracks: Track[] = [];

    // Attempt to parse push chunks containing /browse response
    const regex = /initialData\.push\({\s*path:\s*'([^']+)'(?:,\s*params:\s*JSON\.parse\('(?:[^'\\]*(?:\\[\s\S][^'\\]*)*)'\))?,\s*data:\s*'([^'\\]*(?:\\[\s\S][^'\\]*)*)'/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const path = match[1];
      const dataEscaped = match[2];

      if (path.includes('/browse')) {
        const jsonStr = unescapeYTResponse(dataEscaped);

        try {
          const browseData = JSON.parse(jsonStr);
          collectTracksFromYTMusic(browseData, tracks);
        } catch (err: any) {
          console.error("Failed to parse playlist browse data chunk:", err);
          if (err instanceof SyntaxError && err.message) {
            const matchOffset = err.message.match(/position (\d+)/);
            if (matchOffset) {
              const pos = parseInt(matchOffset[1], 10);
              const start = Math.max(0, pos - 50);
              const end = Math.min(jsonStr.length, pos + 50);
              console.warn("Context around JSON error position " + pos + ":", jsonStr.substring(start, end));
            }
          }
        }
      }
    }

    // Try fallback to ytInitialData
    if (tracks.length === 0) {
      const startIdx = html.indexOf('ytInitialData =');
      if (startIdx !== -1) {
        const endIdx = html.indexOf(';</script>', startIdx);
        if (endIdx !== -1) {
          const jsonStr = html.substring(startIdx + 'ytInitialData ='.length, endIdx).trim();
          try {
            const data = JSON.parse(jsonStr);
            collectTracksFromYTMusic(data, tracks);
          } catch (e) {
            console.error("Failed to parse fallback playlist ytInitialData:", e);
          }
        }
      }
    }

    // Parse name and description
    let name = "Zaimportowana Playlista";
    let description = "Import z YouTube Music";

    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch && ogTitleMatch[1]) {
      name = ogTitleMatch[1].replace(" - YouTube Music", "").replace(" - YouTube", "");
    }
    const ogDescMatch = html.match(/<meta name="description" content="([^"]+)"/) || html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1];
    }

    return {
      name,
      description,
      tracks: tracks.map(t => ({
        ...t,
        source: 'youtube' as const
      }))
    };
  } catch (error) {
    console.error("YouTube Music playlist scraping failed:", error);
    throw error;
  }
}
