export interface Track {
  id: string; // unique ID (can be Spotify track ID, YT video ID, or custom)
  title: string;
  artist: string;
  cover: string; // URL to cover image
  duration: number; // in seconds
  source: 'spotify' | 'youtube' | 'local';
  videoId?: string; // YouTube Video ID for streaming
  previewUrl?: string; // Spotify 30-sec preview audio URL
  plays?: string;
  tag?: string;
  badge?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: Track[];
  cover?: string;
  source: 'hybrid' | 'spotify' | 'youtube';
  isCustom?: boolean;
}

export interface OmniConfig {
  crossfadeDuration: number; // in seconds, e.g. 2 for 2-second transition
  audioQuality: 'high' | 'medium' | 'low';
  youtubeApiKey?: string;
}
