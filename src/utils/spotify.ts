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

// Generate a random string for PKCE code verifier
function generateCodeVerifier(length: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Generate code challenge from verifier using SHA-256
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Redirect user to Spotify Login using Authorization Code Flow with PKCE
export async function loginWithSpotify() {
  const verifier = generateCodeVerifier(128);
  localStorage.setItem('spotify_code_verifier', verifier);

  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = encodeURIComponent(getRedirectUri());
  // 'streaming' + 'user-modify-playback-state' are REQUIRED for Web Playback SDK
  const scopes = encodeURIComponent(
    'streaming user-read-private user-read-email user-modify-playback-state user-read-playback-state'
  );
  
  window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&code_challenge_method=S256&code_challenge=${challenge}&scope=${scopes}&show_dialog=true`;
}

// Check URL for code and exchange it for token
export async function checkUrlForSpotifyCode(): Promise<string | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return null;

  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) return null;

  const redirectUri = getRedirectUri();

  try {
    const payload = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Error exchanging token:', errData);
      return null;
    }

    const data = await res.json();
    
    // Save credentials
    localStorage.setItem('spotify_token', data.access_token);
    const expirationTime = Date.now() + Number(data.expires_in) * 1000;
    localStorage.setItem('spotify_token_expires', expirationTime.toString());
    
    // Clean code verifier
    localStorage.removeItem('spotify_code_verifier');
    
    // Clear code from URL search parameters cleanly
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState(null, '', url.pathname + url.search);

    return data.access_token;
  } catch (e) {
    console.error('Failed to exchange code for token:', e);
    return null;
  }
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
  localStorage.removeItem('spotify_code_verifier');
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
  if (!token) return [];

  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
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
      videoId: '',
      tag: 'Spotify Search'
    }));
  } catch (e) {
    console.error('Spotify Search error:', e);
    return [];
  }
}

// Dummy category tracks for start page placeholders if not search
export async function getSpotifyCategoryTracks(_category: 'Discovery' | 'Trending' | 'Mix'): Promise<Track[]> {
  return [];
}

export async function getSpotifyRecommendations(seedTrackId?: string, seedArtistName?: string): Promise<Track[]> {
  const token = getSpotifyToken();
  if (!token) return [];

  try {
    let url = 'https://api.spotify.com/v1/recommendations?limit=15';
    
    // Spotify recommendations need seed track, seed artist, or seed genre.
    // If seedTrackId is given and looks like a Spotify ID, use it.
    let addedSeed = false;
    if (seedTrackId) {
      const cleanId = seedTrackId.startsWith('spotify-') ? seedTrackId.substring(8) : seedTrackId;
      if (cleanId && cleanId.length > 5 && !cleanId.includes(' ')) {
        url += `&seed_tracks=${encodeURIComponent(cleanId)}`;
        addedSeed = true;
      }
    }
    
    if (!addedSeed && seedArtistName) {
      // Find artist ID first by searching
      try {
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(seedArtistName)}&type=artist&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const artistId = searchData.artists?.items?.[0]?.id;
          if (artistId) {
            url += `&seed_artists=${encodeURIComponent(artistId)}`;
            addedSeed = true;
          }
        }
      } catch (err) {
        console.warn('Failed to resolve artist ID for recommendation seed:', err);
      }
    }

    if (!addedSeed) {
      // Fallback seed genres
      url += `&seed_genres=pop,rock,dance,hip-hop,electronic`;
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      logoutSpotify();
      return [];
    }

    if (!res.ok) return [];

    const data = await res.json();
    return (data.tracks || []).map((item: any) => ({
      id: `spotify-${item.id}`,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      cover: item.album.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
      duration: Math.round(item.duration_ms / 1000),
      source: 'spotify',
      videoId: '',
      tag: 'Spotify Recs'
    }));
  } catch (e) {
    console.error('Spotify Recommendations error:', e);
    return [];
  }
}
