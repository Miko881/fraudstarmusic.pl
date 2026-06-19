import type { Track } from '../types';

const CLIENT_ID = '361f9d5527874013b0e9f892c1971d59';

// Helper to get Redirect URI based on location
export function getRedirectUri(): string {
  const loc = window.location;
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return 'http://localhost:5173/';
  }
  return 'https://mikokohai.pl/';
}

// Redirect user to Spotify Login
export function loginWithSpotify() {
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scopes = encodeURIComponent('user-read-private user-read-email playlist-read-private');
  
  window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token&show_dialog=true`;
}

// Extract Spotify access token from URL fragment
export function checkUrlForSpotifyToken(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (token) {
    // Save token and calculation for expiration
    localStorage.setItem('spotify_token', token);
    const expirationTime = Date.now() + Number(expiresIn) * 1000;
    localStorage.setItem('spotify_token_expires', expirationTime.toString());
    
    // Clear hash from URL cleanly
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return null;
}

// Get valid stored token
export function getSpotifyToken(): string | null {
  const token = localStorage.getItem('spotify_token');
  const expires = localStorage.getItem('spotify_token_expires');
  
  if (!token || !expires) return null;
  
  // Check if expired
  if (Date.now() > Number(expires)) {
    logoutSpotify();
    return null;
  }
  
  return token;
}

export function logoutSpotify() {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_token_expires');
  localStorage.removeItem('spotify_user_name');
  localStorage.removeItem('spotify_user_image');
}

// Get User Profile Info from Spotify
export async function getSpotifyUserProfile(token: string) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const data = await res.json();
    return {
      name: data.display_name,
      image: data.images?.[0]?.url || ''
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Dynamic Spotify search
export async function searchSpotify(query: string): Promise<Track[]> {
  const token = getSpotifyToken();
  if (!token) return []; // Fallback to empty if not logged in

  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      // Token expired
      logoutSpotify();
      return [];
    }

    if (!res.ok) return [];

    const data = await res.json();
    return (data.tracks?.items || []).map((item: any) => ({
      id: `spotify-${item.id}`,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      cover: item.album.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
      duration: Math.round(item.duration_ms / 1000),
      source: 'spotify',
      videoId: '', // Will be resolved to YT Video ID on play
      tag: 'Spotify Search'
    }));
  } catch (e) {
    console.error('Spotify Search error:', e);
    return [];
  }
}

// Dummy category tracks for start page placeholders if not search
export async function getSpotifyCategoryTracks(category: 'Discovery' | 'Trending' | 'Mix'): Promise<Track[]> {
  return [];
}
