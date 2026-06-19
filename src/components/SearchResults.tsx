import React, { useState } from 'react';
import { useOmni } from '../context/OmniProvider';
import type { Track } from '../types';
import { useOmniSearch } from '../hooks/useOmniSearch';
import { Play, Plus, Clock, PlusCircle, Check, Loader2, Music } from 'lucide-react';
import { TrackCover } from './TrackCover';
import { translations } from '../utils/translations';

export const SearchResults: React.FC = () => {
  const { searchQuery, playTrack, playlists, addTrackToPlaylist, currentTrack, isPlaying, language, spotifyToken, loginWithSpotify, searchSource } = useOmni();
  const { tracks, loading, error } = useOmniSearch(searchQuery);
  
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<{trackId: string, playlistName: string} | null>(null);

  const t = translations[language];

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  const handlePlay = (track: Track) => {
    // Mount the searched tracks as the active playback queue
    playTrack(track, tracks);
  };

  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    addTrackToPlaylist(playlistId, track);
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      const plName = pl.id === 'pl-liked' ? t.likedSongsPlaylist : (pl.id === 'pl-favorites' ? t.defaultPlaylistName : pl.name);
      setAddedMessage({ trackId: track.id, playlistName: plName });
      setTimeout(() => setAddedMessage(null), 2000);
    }
    setActiveMenuTrackId(null);
  };

  const getPlaylistName = (pl: typeof playlists[number]) => {
    if (pl.id === 'pl-liked') return t.likedSongsPlaylist;
    if (pl.id === 'pl-favorites') return t.defaultPlaylistName;
    return pl.name;
  };

  if (loading) {
    let loadingText = language === 'pl' ? 'Przeszukiwanie Spotify i YouTube...' : 'Searching Spotify and YouTube...';
    if (searchSource === 'spotify') {
      loadingText = language === 'pl' ? 'Przeszukiwanie Spotify...' : 'Searching Spotify...';
    } else if (searchSource === 'youtube') {
      loadingText = language === 'pl' ? 'Przeszukiwanie YouTube...' : 'Searching YouTube...';
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-omnicord-cyan animate-spin" />
        <p className="text-sm text-gray-400 mt-3 font-medium">
          {loadingText}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[400px]">
        <div className="text-red-400 text-lg font-bold mb-2">
          {language === 'pl' ? 'Błąd wyszukiwania' : 'Search Error'}
        </div>
        <p className="text-sm text-gray-500 max-w-sm">{error}</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[400px]">
        <p className="text-gray-400 text-lg font-medium">{t.noResults}</p>
        <p className="text-sm text-gray-600 mt-1 max-w-xs">
          {language === 'pl' 
            ? 'Wpisz inną frazę, np. nazwę ulubionego utworu lub artysty.' 
            : 'Enter a different phrase, e.g. the name of your favorite track or artist.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Spotify Connection Promo banner inside search if not logged in */}
      {!spotifyToken && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shrink-0">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-emerald-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.136-.669.47-.745 3.856-.88 7.15-.502 9.82 1.13.297.18.388.564.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.075-1.183-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.666-1.112 8.232-.574 11.34 1.34.368.228.488.708.26 1.075zm.106-2.833C14.773 8.87 9.585 8.697 6.587 9.607c-.477.145-.978-.125-1.123-.603-.144-.478.125-.978.603-1.122 3.447-1.046 9.176-.846 12.793 1.302.43.256.57.813.314 1.242-.256.43-.813.57-1.242.314z"/>
              </svg>
              {language === 'pl' ? 'Połącz ze Spotify dla pełnych wyników!' : 'Connect Spotify for full results!'}
            </h4>
            <p className="text-xs text-gray-400">
              {language === 'pl' 
                ? 'Aktualnie wyszukujesz tylko na YouTube. Połącz konto Spotify, aby wyszukiwać utwory z bazy Spotify.'
                : 'Currently searching only on YouTube. Connect Spotify to search tracks from Spotify catalog.'}
            </p>
          </div>
          <button 
            onClick={loginWithSpotify}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-extrabold text-white rounded-xl shadow-lg transition-all cursor-pointer select-none shrink-0"
          >
            {language === 'pl' ? 'Połącz konto' : 'Connect now'}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">
          {language === 'pl' ? 'Wyniki Wyszukiwania' : 'Search Results'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {language === 'pl' 
            ? 'Połączone wyniki z katalogu Spotify oraz wyszukiwarki YouTube' 
            : 'Combined results from Spotify catalog and YouTube search'}
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 sm:px-6 py-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.01]">
          <div className="w-8 text-center">#</div>
          <div>{t.tracklistHeaderTitle}</div>
          <div className="hidden sm:block">{t.tracklistHeaderArtist}</div>
          <div className="w-16 text-center text-xs shrink-0">{t.tracklistHeaderSource}</div>
          <div className="w-20 sm:w-24 text-right pr-2 sm:pr-6 shrink-0"><Clock size={12} className="inline" /></div>
        </div>

        {/* Tracks List */}
        <div className="divide-y divide-white/[0.03]">
          {tracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            const isTrackPlaying = isCurrent && isPlaying;
            const menuOpen = activeMenuTrackId === track.id;

            return (
              <div 
                key={track.id}
                className={`grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 sm:px-6 py-3 items-center group transition-all duration-200 hover:bg-white/[0.02] ${
                  isCurrent ? 'bg-white/[0.02]' : ''
                }`}
              >
                {/* Index / Play Button */}
                <div className="w-8 flex items-center justify-center relative">
                  <span className={`text-xs text-gray-500 font-semibold group-hover:opacity-0 ${
                    isCurrent ? 'text-omnicord-neon' : ''
                  }`}>
                    {index + 1}
                  </span>
                  <button 
                    onClick={() => handlePlay(track)}
                    className="absolute opacity-0 group-hover:opacity-100 text-omnicord-neon hover:scale-110 active:scale-95 transition-all"
                  >
                    <Play size={14} fill="#deff9a" className={isTrackPlaying ? "animate-pulse" : ""} />
                  </button>
                </div>

                {/* Cover & Title */}
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5 shadow-md">
                    {track.cover ? (
                      <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={16} className="text-gray-600" /></div>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <span className={`font-semibold text-sm truncate block tracking-wide ${
                      isCurrent ? 'text-omnicord-neon glow-text-neon' : 'text-white'
                    }`}>
                      {track.title}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate block sm:hidden mt-0.5 font-semibold">
                      {track.artist}
                    </span>
                  </div>
                </div>

                {/* Artist */}
                <div className="hidden sm:block text-sm text-gray-400 truncate font-medium min-w-0">
                  {track.artist}
                </div>

                {/* Source Badge */}
                <div className="w-16 flex justify-center shrink-0">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    track.source === 'spotify' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {track.source}
                  </span>
                </div>

                {/* Duration & Playlist Actions */}
                <div className="w-20 sm:w-24 flex items-center justify-end gap-2 sm:gap-3 text-right text-xs font-semibold text-gray-400 relative shrink-0">
                  <span>{formatDuration(track.duration)}</span>
                  
                  {/* Plus/Menu Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuTrackId(menuOpen ? null : track.id)}
                      className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                      title={t.addTo}
                    >
                      <Plus size={14} />
                    </button>
                    
                    {/* Add to Playlist Dropdown */}
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuTrackId(null)} />
                        <div className="absolute right-0 bottom-full mb-1.5 w-48 glass-panel rounded-xl border border-white/10 p-1.5 shadow-xl z-50 animate-fade-in text-left">
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-2.5 py-1">{t.addTo}:</div>
                          <div className="max-h-36 overflow-y-auto space-y-0.5">
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={() => handleAddToPlaylist(pl.id, track)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors truncate flex items-center justify-between"
                              >
                                <span>{getPlaylistName(pl)}</span>
                                <PlusCircle size={10} className="text-gray-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Add Toast Notification */}
      {addedMessage && (
        <div className="fixed bottom-24 right-6 bg-[#0a0a0a]/90 backdrop-blur-md border border-omnicord-neon/30 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-slide-up text-xs font-semibold">
          <Check size={14} className="text-omnicord-neon" />
          <span>{t.addedToPlaylist}: <strong className="text-omnicord-neon">{addedMessage.playlistName}</strong></span>
        </div>
      )}
    </div>
  );
};
