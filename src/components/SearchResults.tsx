import React, { useState } from 'react';
import { useOmni } from '../context/OmniProvider';
import type { Track } from '../types';
import { useOmniSearch } from '../hooks/useOmniSearch';
import { Play, Plus, Clock, PlusCircle, Check, Loader2, Music } from 'lucide-react';

export const SearchResults: React.FC = () => {
  const { searchQuery, playTrack, playlists, addTrackToPlaylist, currentTrack, isPlaying } = useOmni();
  const { tracks, loading, error } = useOmniSearch(searchQuery);
  
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<{trackId: string, playlistName: string} | null>(null);

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
      setAddedMessage({ trackId: track.id, playlistName: pl.name });
      setTimeout(() => setAddedMessage(null), 2000);
    }
    setActiveMenuTrackId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-omnicord-cyan animate-spin" />
        <p className="text-sm text-gray-400 mt-3 font-medium">Przeszukiwanie Spotify i YouTube...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[400px]">
        <div className="text-red-400 text-lg font-bold mb-2">Błąd wyszukiwania</div>
        <p className="text-sm text-gray-500 max-w-sm">{error}</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[400px]">
        <p className="text-gray-400 text-lg font-medium">Brak wyników</p>
        <p className="text-sm text-gray-600 mt-1 max-w-xs">Wpisz inną frazę, np. nazwę ulubionego utworu lub artysty.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Wyniki Wyszukiwania</h2>
        <p className="text-xs text-gray-500 mt-1">Połączone wyniki z katalogu Spotify oraz wyszukiwarki YouTube</p>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 sm:px-6 py-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.01]">
          <div className="w-8 text-center">#</div>
          <div>Tytuł</div>
          <div className="hidden sm:block">Wykonawca</div>
          <div className="w-16 text-center text-xs shrink-0">Źródło</div>
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
                      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
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
                      title="Dodaj do playlisty"
                    >
                      <Plus size={14} />
                    </button>
                    
                    {/* Add to Playlist Dropdown */}
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuTrackId(null)} />
                        <div className="absolute right-0 bottom-full mb-1.5 w-48 glass-panel rounded-xl border border-white/10 p-1.5 shadow-xl z-50 animate-fade-in text-left">
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-2.5 py-1">Dodaj do:</div>
                          <div className="max-h-36 overflow-y-auto space-y-0.5">
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={() => handleAddToPlaylist(pl.id, track)}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors truncate flex items-center justify-between"
                              >
                                <span>{pl.name}</span>
                                <PlusCircle size={10} className="text-gray-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Inline Notification Toast */}
                  {addedMessage && addedMessage.trackId === track.id && (
                    <div className="absolute right-0 top-full mt-1.5 bg-emerald-500 text-black text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-lg flex items-center gap-1 z-50 animate-bounce">
                      <Check size={10} strokeWidth={3} />
                      <span>Dodano do {addedMessage.playlistName}!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
