import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Track, Playlist, OmniConfig } from '../types';
import { musicEngine } from '../services/MusicEngine';
import { searchYouTube, scrapeYouTubePlaylist } from '../utils/youtube';

interface OmniContextType {
  // Config
  config: OmniConfig;
  updateConfig: (newConfig: Partial<OmniConfig>) => void;

  // Navigation
  activeView: 'start' | 'discovery' | 'trending' | 'mix' | 'playlist' | 'search';
  setActiveView: (view: 'start' | 'discovery' | 'trending' | 'mix' | 'playlist' | 'search') => void;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Playback State
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isResolving: boolean;
  activePlayerId: string;
  
  // Playback Control
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  
  // Queue & Playlists
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  setShuffle: (shuffle: boolean) => void;
  repeatMode: 'none' | 'one' | 'all';
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  playlists: Playlist[];
  createPlaylist: (name: string, description: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addToQueue: (track: Track) => void;
  isLiked: (trackId: string) => boolean;
  toggleLikeTrack: (track: Track) => void;
  importYouTubePlaylist: (playlistId: string) => Promise<void>;
  history: Track[];
  addToHistory: (track: Track) => void;

  // Localization
  language: 'pl' | 'en';
  setLanguage: (lang: 'pl' | 'en') => void;
}

const OmniContext = createContext<OmniContextType | undefined>(undefined);

const DEFAULT_CONFIG: OmniConfig = {
  crossfadeDuration: 2,
  audioQuality: 'high',
  youtubeApiKey: ''
};

export const OmniProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load Config
  const [config, setConfig] = useState<OmniConfig>(() => {
    const saved = localStorage.getItem('omni_config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });

  // Navigation
  const [activeView, setActiveView] = useState<'start' | 'discovery' | 'trending' | 'mix' | 'playlist' | 'search'>('start');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Language State
  const [language, setLanguageState] = useState<'pl' | 'en'>(() => {
    const saved = localStorage.getItem('omni_language');
    if (saved === 'pl' || saved === 'en') return saved;
    return navigator.language.startsWith('pl') ? 'pl' : 'en';
  });

  const setLanguage = (lang: 'pl' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('omni_language', lang);
  };

  // Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(() => {
    const savedVolume = localStorage.getItem('omni_volume');
    return savedVolume ? parseFloat(savedVolume) : 0.5;
  });
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [activePlayerId, setActivePlayerId] = useState<string>('omni-yt-player-1');

  // Queue & Loop/Shuffle
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  
  // Custom hybrid playlists
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('omni_playlists');
    let list: Playlist[] = saved ? JSON.parse(saved) : [];
    
    // Ensure we always have 'pl-liked' auto-playlist
    const hasLiked = list.some(p => p.id === 'pl-liked');
    if (!hasLiked) {
      const likedPlaylist: Playlist = {
        id: 'pl-liked',
        name: 'Muzyka, która Ci się podoba',
        description: 'Automatycznie zapisane utwory, które polubiłeś. Auto-playlista.',
        tracks: [],
        source: 'hybrid',
        isCustom: false
      };
      list = [likedPlaylist, ...list];
      localStorage.setItem('omni_playlists', JSON.stringify(list));
    }
    
    // Fallback default favorites if list is fresh and empty
    const hasFavs = list.some(p => p.id === 'pl-favorites');
    if (!hasFavs && !saved) {
      list.push({
        id: 'pl-favorites',
        name: 'Ulubione Omnicord',
        description: 'Twoje najsłodsze hybrydowe utwory.',
        tracks: [],
        source: 'hybrid',
        isCustom: true
      });
    }

    return list;
  });

  // Local history state
  const [history, setHistory] = useState<Track[]>(() => {
    const saved = localStorage.getItem('omni_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Ref to hold current state to prevent stale closure issues in event listeners
  const playbackRef = useRef({ queue, queueIndex, shuffle, repeatMode, currentTrack, config });
  useEffect(() => {
    playbackRef.current = { queue, queueIndex, shuffle, repeatMode, currentTrack, config };
  }, [queue, queueIndex, shuffle, repeatMode, currentTrack, config]);

  // Sync volume to MusicEngine on load
  useEffect(() => {
    musicEngine.setVolume(volume);
    musicEngine.setCrossfadeDuration(config.crossfadeDuration);
  }, [volume, config.crossfadeDuration]);

  // Listen to MusicEngine State Updates
  useEffect(() => {
    const unsubscribe = musicEngine.subscribe((engineState) => {
      setIsPlaying(engineState.isPlaying);
      setActivePlayerId(engineState.activePlayerId);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Track Completion from MusicEngine
  useEffect(() => {
    const handleTrackEnded = () => {
      const { repeatMode, currentTrack } = playbackRef.current;
      if (repeatMode === 'one' && currentTrack) {
        playTrack(currentTrack);
      } else {
        nextTrack();
      }
    };

    window.addEventListener('omni-track-ended', handleTrackEnded);
    return () => {
      window.removeEventListener('omni-track-ended', handleTrackEnded);
    };
  }, []);

  // Save Config Helper
  const updateConfig = (newConfig: Partial<OmniConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('omni_config', JSON.stringify(updated));
      return updated;
    });
  };

  // Resolve Spotify/iTunes Track to YouTube Video ID
  const resolveTrack = async (track: Track): Promise<Track> => {
    if (track.videoId && !track.videoId.startsWith('itq-')) return track;

    setIsResolving(true);
    try {
      const searchQuery = `${track.artist} - ${track.title}`.substring(0, 100);
      const searchResults = await searchYouTube(searchQuery);
      
      // Filter out any results that are also iTunes queries to prevent infinite loop
      const validResults = searchResults.filter(t => t.videoId && !t.videoId.startsWith('itq-'));
      
      if (validResults.length > 0) {
        const matched = validResults[0];
        const updatedTrack = {
          ...track,
          videoId: matched.videoId,
          id: track.id
        };
        
        // Cache videoId in original queue item to prevent repeating searches
        setQueue(prev => prev.map(t => t.id === track.id ? { ...t, videoId: matched.videoId } : t));
        
        return updatedTrack;
      } else {
        throw new Error("No matching video found on YouTube Music.");
      }
    } catch (e) {
      console.error("Error resolving track to YouTube Music:", e);
      throw e;
    } finally {
      setIsResolving(false);
    }
  };

  // Play Playback Controller
  const playTrack = async (track: Track, newQueue?: Track[]) => {
    try {
      let resolved = track;
      if (!track.videoId || track.videoId.startsWith('itq-') || (track.source === 'spotify' && !track.videoId)) {
        resolved = await resolveTrack(track);
      }

      if (newQueue) {
        setQueue(newQueue);
        const idx = newQueue.findIndex(t => t.id === track.id);
        setQueueIndex(idx !== -1 ? idx : 0);
      } else {
        const { queue } = playbackRef.current;
        const idx = queue.findIndex(t => t.id === track.id);
        if (idx !== -1) {
          setQueueIndex(idx);
        } else {
          // Add to queue right after current index
          const newQ = [...queue];
          const insertIdx = queueIndex + 1;
          newQ.splice(insertIdx, 0, resolved);
          setQueue(newQ);
          setQueueIndex(insertIdx);
        }
      }

      setCurrentTrack(resolved);
      await musicEngine.play(resolved);
      addToHistory(resolved);
    } catch (e) {
      alert(`Nie można odtworzyć utworu: ${track.title}. Brak połączenia z YouTube.`);
    }
  };

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      musicEngine.pause();
    } else {
      musicEngine.resume();
    }
  };

  const seek = (time: number) => {
    musicEngine.seek(time);
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    localStorage.setItem('omni_volume', clamped.toString());
    musicEngine.setVolume(clamped);
  };

  const nextTrack = () => {
    const { queue, queueIndex, shuffle, repeatMode } = playbackRef.current;
    if (queue.length === 0) return;

    if (shuffle) {
      const rand = Math.floor(Math.random() * queue.length);
      playTrack(queue[rand]);
    } else {
      const nextIdx = queueIndex + 1;
      if (nextIdx < queue.length) {
        playTrack(queue[nextIdx]);
      } else if (repeatMode === 'all') {
        playTrack(queue[0]);
      } else {
        musicEngine.pause();
      }
    }
  };

  const prevTrack = () => {
    const { queue, queueIndex } = playbackRef.current;
    if (queue.length === 0) return;

    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      playTrack(queue[prevIdx]);
    } else {
      playTrack(queue[queue.length - 1]);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  // Playlists Logic
  const createPlaylist = (name: string, description: string) => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      tracks: [],
      source: 'hybrid',
      isCustom: true
    };
    
    setPlaylists(prev => {
      const updated = [...prev, newPlaylist];
      localStorage.setItem('omni_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => {
      const updated = prev.map(pl => {
        if (pl.id === playlistId) {
          if (pl.tracks.some(t => t.id === track.id)) return pl;
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      });
      localStorage.setItem('omni_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(pl => {
        if (pl.id === playlistId) {
          return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
        }
        return pl;
      });
      localStorage.setItem('omni_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePlaylist = (playlistId: string) => {
    if (playlistId === 'pl-favorites') return;
    setPlaylists(prev => {
      const updated = prev.filter(pl => pl.id !== playlistId);
      localStorage.setItem('omni_playlists', JSON.stringify(updated));
      return updated;
    });
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
      setActiveView('start');
    }
  };

  const isLiked = (trackId: string) => {
    const likedPlaylist = playlists.find(p => p.id === 'pl-liked');
    return likedPlaylist ? likedPlaylist.tracks.some(t => t.id === trackId) : false;
  };

  const toggleLikeTrack = (track: Track) => {
    const liked = isLiked(track.id);
    if (liked) {
      removeTrackFromPlaylist('pl-liked', track.id);
    } else {
      addTrackToPlaylist('pl-liked', track);
    }
  };

  const importYouTubePlaylist = async (playlistId: string): Promise<void> => {
    try {
      const result = await scrapeYouTubePlaylist(playlistId);
      
      const newPlaylist: Playlist = {
        id: `pl-yt-${playlistId}-${Date.now()}`,
        name: result.name,
        description: result.description,
        tracks: result.tracks,
        source: 'youtube',
        isCustom: true
      };

      setPlaylists(prev => {
        const updated = [...prev, newPlaylist];
        localStorage.setItem('omni_playlists', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to import playlist:", e);
      throw new Error("Nie udało się zaimportować playlisty. Upewnij się, że playlista jest publiczna i spróbuj ponownie.");
    }
  };

  const addToHistory = (track: Track) => {
    setHistory(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, 30);
      localStorage.setItem('omni_history', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <OmniProviderValueHelper
      config={config}
      updateConfig={updateConfig}
      activeView={activeView}
      setActiveView={setActiveView}
      selectedPlaylistId={selectedPlaylistId}
      setSelectedPlaylistId={setSelectedPlaylistId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      volume={volume}
      isResolving={isResolving}
      activePlayerId={activePlayerId}
      playTrack={playTrack}
      togglePlay={togglePlay}
      seek={seek}
      setVolume={setVolume}
      nextTrack={nextTrack}
      prevTrack={prevTrack}
      queue={queue}
      queueIndex={queueIndex}
      shuffle={shuffle}
      setShuffle={setShuffle}
      repeatMode={repeatMode}
      setRepeatMode={setRepeatMode}
      playlists={playlists}
      createPlaylist={createPlaylist}
      addTrackToPlaylist={addTrackToPlaylist}
      removeTrackFromPlaylist={removeTrackFromPlaylist}
      deletePlaylist={deletePlaylist}
      addToQueue={addToQueue}
      isLiked={isLiked}
      toggleLikeTrack={toggleLikeTrack}
      importYouTubePlaylist={importYouTubePlaylist}
      history={history}
      addToHistory={addToHistory}
      language={language}
      setLanguage={setLanguage}
    >
      {children}
    </OmniProviderValueHelper>
  );
};

// Helper components to supply clean rendering properties
const OmniProviderValueHelper: React.FC<{
  children: React.ReactNode;
  [key: string]: any;
}> = ({ children, ...value }) => {
  return (
    <OmniContext.Provider value={value as any}>
      {children}
    </OmniContext.Provider>
  );
};

export const useOmni = () => {
  const context = useContext(OmniContext);
  if (context === undefined) {
    throw new Error('useOmni must be used within an OmniProvider');
  }
  return context;
};
