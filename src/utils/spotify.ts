import type { Track } from '../types';

// Curated static track lists — no API calls needed, zero CORS errors
// These are real YouTube video IDs that are known to work

const CATEGORY_TRACKS: Record<string, Track[]> = {
  Trending: [
    { id: 'yt-kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', cover: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg', duration: 282, source: 'youtube', videoId: 'kJQP7kiw5Fk', tag: 'Trending' },
    { id: 'yt-JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: 234, source: 'youtube', videoId: 'JGwWNGJdvx8', tag: 'Trending' },
    { id: 'yt-RgKAFK5djSk', title: 'See You Again', artist: 'Wiz Khalifa', cover: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg', duration: 229, source: 'youtube', videoId: 'RgKAFK5djSk', tag: 'Trending' },
    { id: 'yt-pRpeEdMmmQ0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', cover: 'https://i.ytimg.com/vi/pRpeEdMmmQ0/hqdefault.jpg', duration: 270, source: 'youtube', videoId: 'pRpeEdMmmQ0', tag: 'Trending' },
    { id: 'yt-OPf0YbXqDm0', title: 'Hello', artist: 'Adele', cover: 'https://i.ytimg.com/vi/YQHsXMglC9A/hqdefault.jpg', duration: 295, source: 'youtube', videoId: 'YQHsXMglC9A', tag: 'Trending' },
    { id: 'yt-hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', cover: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg', duration: 257, source: 'youtube', videoId: 'hT_nvWreIhg', tag: 'Trending' },
    { id: 'yt-2Vv-BfVoq4g', title: 'Perfect', artist: 'Ed Sheeran', cover: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg', duration: 263, source: 'youtube', videoId: '2Vv-BfVoq4g', tag: 'Trending' },
    { id: 'yt-04854XqcfCY', title: 'Lean On', artist: 'Major Lazer & DJ Snake', cover: 'https://i.ytimg.com/vi/04854XqcfCY/hqdefault.jpg', duration: 175, source: 'youtube', videoId: '04854XqcfCY', tag: 'Trending' },
  ],
  Discovery: [
    { id: 'yt-lr0C-ST7ENE', title: 'Chill Ambient Beats', artist: 'Lofi Waves', cover: 'https://i.ytimg.com/vi/lr0C-ST7ENE/hqdefault.jpg', duration: 10800, source: 'youtube', videoId: 'lr0C-ST7ENE', tag: 'Discovery' },
    { id: 'yt-5qap5aO4i9A', title: 'Lofi Hip Hop Radio', artist: 'ChilledCow', cover: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg', duration: 300, source: 'youtube', videoId: '5qap5aO4i9A', tag: 'Discovery' },
    { id: 'yt-n61ULEU7CO4', title: 'Stressed Out', artist: 'Twenty One Pilots', cover: 'https://i.ytimg.com/vi/pXRviuL6vMY/hqdefault.jpg', duration: 231, source: 'youtube', videoId: 'pXRviuL6vMY', tag: 'Discovery' },
    { id: 'yt-CevxZvSJLk8', title: 'Radioactive', artist: 'Imagine Dragons', cover: 'https://i.ytimg.com/vi/ktvTqknDobU/hqdefault.jpg', duration: 187, source: 'youtube', videoId: 'ktvTqknDobU', tag: 'Discovery' },
    { id: 'yt-fLexgOxsZu0', title: 'Titanium', artist: 'David Guetta ft. Sia', cover: 'https://i.ytimg.com/vi/JRfuAukYTKg/hqdefault.jpg', duration: 245, source: 'youtube', videoId: 'JRfuAukYTKg', tag: 'Discovery' },
    { id: 'yt-sENM2wA_FTg', title: 'Animals', artist: 'Martin Garrix', cover: 'https://i.ytimg.com/vi/gCYcHz2k5x0/hqdefault.jpg', duration: 305, source: 'youtube', videoId: 'gCYcHz2k5x0', tag: 'Discovery' },
    { id: 'yt-60ItHLz5WEA', title: 'Levels', artist: 'Avicii', cover: 'https://i.ytimg.com/vi/FcS6sly0BWs/hqdefault.jpg', duration: 204, source: 'youtube', videoId: 'FcS6sly0BWs', tag: 'Discovery' },
    { id: 'yt-nfWlot6h_JM', title: 'Shake It Off', artist: 'Taylor Swift', cover: 'https://i.ytimg.com/vi/nfWlot6h_JM/hqdefault.jpg', duration: 219, source: 'youtube', videoId: 'nfWlot6h_JM', tag: 'Discovery' },
  ],
  Mix: [
    { id: 'yt-tntOCGkgt98', title: 'Deep Focus Ambient', artist: 'Ambient Waves', cover: 'https://i.ytimg.com/vi/tntOCGkgt98/hqdefault.jpg', duration: 3600, source: 'youtube', videoId: 'tntOCGkgt98', tag: 'Mix' },
    { id: 'yt-aLqc5RNOZhI', title: 'Bohemian Rhapsody', artist: 'Queen', cover: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg', duration: 354, source: 'youtube', videoId: 'fJ9rUzIMcZQ', tag: 'Mix' },
    { id: 'yt-yPYZpwSpKmA', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', cover: 'https://i.ytimg.com/vi/1w7OgIMMRc4/hqdefault.jpg', duration: 356, source: 'youtube', videoId: '1w7OgIMMRc4', tag: 'Mix' },
    { id: 'yt-PLjPMKCEFTA', title: 'Billie Jean', artist: 'Michael Jackson', cover: 'https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg', duration: 294, source: 'youtube', videoId: 'Zi_XLOBDo_Y', tag: 'Mix' },
    { id: 'yt-WpYeekQkAdc', title: 'Happy', artist: 'Pharrell Williams', cover: 'https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg', duration: 233, source: 'youtube', videoId: 'ZbZSe6N_BXs', tag: 'Mix' },
    { id: 'yt-YykjpeuMNEk', title: 'Don\'t Stop Believin\'', artist: 'Journey', cover: 'https://i.ytimg.com/vi/1k8craCGpgs/hqdefault.jpg', duration: 251, source: 'youtube', videoId: '1k8craCGpgs', tag: 'Mix' },
    { id: 'yt-lSAhLCqyTGg', title: 'Africa', artist: 'Toto', cover: 'https://i.ytimg.com/vi/FTQbiNvZqaY/hqdefault.jpg', duration: 295, source: 'youtube', videoId: 'FTQbiNvZqaY', tag: 'Mix' },
    { id: 'yt-wv2sBLFkYRk', title: 'Smells Like Teen Spirit', artist: 'Nirvana', cover: 'https://i.ytimg.com/vi/hTWKbfoikeg/hqdefault.jpg', duration: 301, source: 'youtube', videoId: 'hTWKbfoikeg', tag: 'Mix' },
  ],
};

export async function searchSpotify(_query: string): Promise<Track[]> {
  return [];
}

export async function getSpotifyCategoryTracks(category: 'Discovery' | 'Trending' | 'Mix'): Promise<Track[]> {
  // Return curated static lists instantly — no API calls, no CORS errors
  return CATEGORY_TRACKS[category] ?? [];
}
