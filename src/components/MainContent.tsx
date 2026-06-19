import React, { useState, useEffect } from 'react';
import { useOmni } from '../context/OmniProvider';
import type { Track } from '../types';
import { searchYouTube } from '../utils/youtube';
import { translations } from '../utils/translations';
import { 
  Search, Play, Clock, Trash2, 
  Sparkles, Flame, Compass, Disc, Library, RefreshCw, Music,
  ThumbsUp 
} from 'lucide-react';
import { SearchResults } from './SearchResults';
import { TrackCover } from './TrackCover';

export const MainContent: React.FC = () => {
  const { 
    activeView, setActiveView, selectedPlaylistId, playlists, removeTrackFromPlaylist,
    searchQuery, setSearchQuery, playTrack, currentTrack, isPlaying,
    history, language
  } = useOmni();

  // Local state for categories / custom mixes
  const [categoryTracks, setCategoryTracks] = useState<Track[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Discovery' | 'Trending' | 'Mix'>('Trending');

  // Mood state
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [moodTracks, setMoodTracks] = useState<Track[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Recommendation state
  const [recTracks, setRecTracks] = useState<Track[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  const t = translations[language];

  const lastPlayedArtist = history && history.length > 0 ? history[0].artist : null;

  useEffect(() => {
    if (activeMood) {
      loadMoodTracks(activeMood);
    } else {
      setMoodTracks([]);
    }
  }, [activeMood]);

  useEffect(() => {
    if (lastPlayedArtist) {
      loadRecTracks(lastPlayedArtist);
    } else {
      setRecTracks([]);
    }
  }, [lastPlayedArtist]);

  const getMoodSearchTerm = (mood: string) => {
    const terms: Record<string, { pl: string, en: string }> = {
      'Zastrzyk energii': { pl: 'Zastrzyk energii muzyka', en: 'energy boost music' },
      'Relaks': { pl: 'muzyka relaksacyjna', en: 'chill relaxation music' },
      'Trening': { pl: 'muzyka do treningu', en: 'workout music' },
      'Koncentracja': { pl: 'muzyka do nauki koncentracji', en: 'focus study music' },
      'Impreza': { pl: 'muzyka na impreze dance party', en: 'dance party music hits' },
      'Romans': { pl: 'muzyka romantyczna love', en: 'romantic love songs' },
      'Smutna': { pl: 'smutna muzyka', en: 'sad music' },
      'Sen': { pl: 'muzyka do snu lofi sleep', en: 'deep sleep music lofi' },
    };
    return terms[mood]?.[language] || `${mood} music`;
  };

  const getMoodLabel = (mood: string) => {
    const labels: Record<string, string> = {
      'Zastrzyk energii': t.energy,
      'Relaks': t.relaxation,
      'Trening': t.workout,
      'Koncentracja': t.concentration,
      'Impreza': t.party,
      'Romans': t.romance,
      'Smutna': t.sad,
      'Sen': t.sleep
    };
    return labels[mood] || mood;
  };

  const loadMoodTracks = async (mood: string) => {
    setMoodLoading(true);
    try {
      const searchTerm = getMoodSearchTerm(mood);
      const tracks = await searchYouTube(searchTerm);
      setMoodTracks(tracks);
    } catch (e) {
      console.error(e);
    } finally {
      setMoodLoading(false);
    }
  };

  const loadRecTracks = async (artist: string) => {
    setRecLoading(true);
    try {
      const tracks = await searchYouTube(artist);
      setRecTracks(tracks.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setRecLoading(false);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  // Load Category tracks dynamically when activeView changes
  useEffect(() => {
    if (activeView === 'discovery') {
      loadCategoryTracks('Discovery');
    } else if (activeView === 'trending') {
      loadCategoryTracks('Trending');
    } else if (activeView === 'mix') {
      loadCategoryTracks('Mix');
    } else if (activeView === 'start' && categoryTracks.length === 0) {
      loadCategoryTracks('Trending');
    }
  }, [activeView]);

  const loadCategoryTracks = async (cat: 'Discovery' | 'Trending' | 'Mix') => {
    setCategoryLoading(true);
    setActiveCategory(cat);
    try {
      let query = 'music';
      if (cat === 'Trending') {
        query = language === 'pl' ? 'muzyka hity pl' : 'trending music hits';
      } else if (cat === 'Discovery') {
        query = language === 'pl' ? 'nowe wydania muzyczne' : 'new music releases';
      } else if (cat === 'Mix') {
        query = language === 'pl' ? 'składanka muzyczna mix' : 'lofi chill music mix';
      }
      const tracks = await searchYouTube(query);
      setCategoryTracks(tracks);
    } catch (e) {
      console.error(e);
    } finally {
      setCategoryLoading(false);
    }
  };

  // Get current active playlist details
  const activePlaylist = playlists.find(p => p.id === selectedPlaylistId);

  const getPlaylistName = (pl: typeof playlists[number]) => {
    if (pl.id === 'pl-liked') return t.likedSongsPlaylist;
    if (pl.id === 'pl-favorites') return t.defaultPlaylistName;
    return pl.name;
  };

  const getPlaylistDesc = (pl: typeof playlists[number]) => {
    if (pl.id === 'pl-liked') return t.likedSongsDescription;
    if (pl.id === 'pl-favorites') return t.defaultPlaylistDescription;
    return pl.description || t.noDescription;
  };

  // Time-based greetings
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return t.morningGreeting;
    if (hrs < 18) return t.afternoonGreeting;
    return t.eveningGreeting;
  };

  // Render standard search top bar
  const renderTopBar = () => (
    <div className="h-20 shrink-0 px-4 md:px-8 flex items-center justify-between border-b border-white/5 bg-black/10 backdrop-blur-md relative z-10 gap-4">
      {/* Search Input */}
      <div className="relative w-full max-w-md md:w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-omnicord-cyan transition-colors w-4.5 h-4.5" />
        <input
          type="text"
          value={searchQuery ?? ''}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim().length > 0 && activeView !== 'search') {
              setActiveView('search');
            } else if (e.target.value.trim().length === 0 && activeView === 'search') {
              setActiveView('start');
            }
          }}
          placeholder={t.searchPlaceholder}
          className="w-full glass-input !pl-11 bg-white/[0.02]"
        />
      </div>

      {/* Quick Stats/User Badge */}
      <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-gray-400 shrink-0">
        <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-omnicord-neon animate-pulse"></span>
          <span>{t.engineStats}</span>
        </span>
      </div>
    </div>
  );

  // RENDER: Start View
  const renderStartView = () => {
    // Quick recommendations grid
    const quickRecs = categoryTracks.slice(0, 6);
    
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Mood Filter Pills (YT Music Style) */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none shrink-0 -mx-4 px-4 sm:-mx-8 sm:px-8">
          {activeMood && (
            <button
              onClick={() => setActiveMood(null)}
              className="text-xs font-semibold px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
            >
              {t.clearFilter}
            </button>
          )}
          {['Zastrzyk energii', 'Relaks', 'Trening', 'Koncentracja', 'Impreza', 'Romans', 'Smutna', 'Sen'].map((mood) => {
            const isSelected = activeMood === mood;
            return (
              <button
                key={mood}
                onClick={() => setActiveMood(mood)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-omnicord-cyan bg-omnicord-cyan/15 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                {getMoodLabel(mood)}
              </button>
            );
          })}
        </div>

        {/* Dynamic Mood Mix Section */}
        {activeMood && (
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-omnicord-cyan"></span>
                <h2 className="text-xl font-extrabold text-white tracking-wide">{t.discoverMood}: {getMoodLabel(activeMood)}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">{t.moodMixFor} "{getMoodLabel(activeMood)}"</p>
            </div>

            {moodLoading ? (
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-3 shrink-0">
                    <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"></div>
                    <div className="h-4 bg-white/[0.02] rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-white/[0.02] rounded w-1/2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {moodTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, moodTracks)}
                    className="flex-col gap-3 cursor-pointer group flex shrink-0"
                  >
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 relative group shadow-lg border border-white/5">
                      <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Play size={24} className="text-omnicord-neon" fill="#deff9a" />
                      </div>
                    </div>
                    <div className="w-32 sm:w-36 pl-1 space-y-0.5">
                      <div className="font-semibold text-sm text-white truncate leading-snug group-hover:text-omnicord-cyan transition-colors">
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-400 truncate font-semibold">
                        {track.artist}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Hero Welcome banner */}
        <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 p-8 flex items-center justify-between shadow-[0_0_30px_rgba(222,255,154,0.05)]">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-omnicord-neon text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} />
              <span>{t.welcomeSubtitle}</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-none tracking-tight">{getGreeting()}</h1>
            <p className="text-sm text-gray-400 max-w-md font-medium leading-relaxed">
              {t.welcomeDesc}
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-omnicord-cyan/20 to-transparent pointer-events-none blur-3xl rounded-full"></div>
        </div>

        {/* Listen Again (History-based Carousel) */}
        {history && history.length > 0 && (
          <section className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-omnicord-cyan uppercase tracking-widest block mb-0.5">{t.yourHistory}</span>
              <h2 className="text-xl font-extrabold text-white tracking-wide">{t.listenAgain}</h2>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {history.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, history)}
                  className="flex-col gap-3 cursor-pointer group flex shrink-0"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 relative group shadow-lg border border-white/5">
                    <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Play size={24} className="text-omnicord-neon" fill="#deff9a" />
                    </div>
                  </div>
                  <div className="w-32 sm:w-36 pl-1 space-y-0.5">
                    <div className="font-semibold text-sm text-white truncate leading-snug group-hover:text-omnicord-neon transition-colors">
                      {track.title}
                    </div>
                    <div className="text-xs text-gray-400 truncate font-semibold">
                      {track.artist}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations Row ("Based on: Artist") */}
        {history && history.length > 0 && recTracks.length > 0 && (
          <section className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-omnicord-neon uppercase tracking-widest block mb-0.5">{t.recommendedForYou}</span>
              <h2 className="text-xl font-extrabold text-white tracking-wide">{t.basedOn}: {history[0].artist}</h2>
            </div>

            {recLoading ? (
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-3 shrink-0">
                    <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"></div>
                    <div className="h-4 bg-white/[0.02] rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-white/[0.02] rounded w-1/2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {recTracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, recTracks)}
                    className="flex-col gap-3 cursor-pointer group flex shrink-0"
                  >
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 relative group shadow-lg border border-white/5">
                      <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Play size={24} className="text-omnicord-neon" fill="#deff9a" />
                      </div>
                    </div>
                    <div className="w-32 sm:w-36 pl-1 space-y-0.5">
                      <div className="font-semibold text-sm text-white truncate leading-snug group-hover:text-omnicord-cyan transition-colors">
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-400 truncate font-semibold">
                        {track.artist}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Quick Play Grid */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">{t.quickStart}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t.quickStartSub}</p>
          </div>

          {categoryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickRecs.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, quickRecs)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                        <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                          <Play size={16} className="text-omnicord-neon" fill="#deff9a" />
                        </div>
                      </div>
                      <div className="overflow-hidden pl-1">
                        <div className={`font-semibold text-sm truncate ${isCurrent ? 'text-omnicord-neon' : 'text-white'}`}>
                          {track.title}
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5 font-medium">{track.artist}</div>
                      </div>
                    </div>
                    {isTrackPlaying && (
                      <span className="w-6 flex gap-0.5 items-end justify-center h-4 pb-0.5 shrink-0 pr-1">
                        <span className="w-0.75 bg-omnicord-neon h-2 animate-[pulse_0.6s_infinite_alternate]"></span>
                        <span className="w-0.75 bg-omnicord-neon h-4 animate-[pulse_0.4s_infinite_alternate]"></span>
                        <span className="w-0.75 bg-omnicord-neon h-3 animate-[pulse_0.8s_infinite_alternate]"></span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Categories Info */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setActiveView('discovery')}
            className="glass-card hover:shadow-[0_10px_20px_rgba(222,255,154,0.04)] cursor-pointer group"
          >
            <Compass className="text-omnicord-neon w-8 h-8 mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold text-base mb-1">{t.discoveryCardTitle}</h3>
            <p className="text-xs text-gray-400 font-medium">{t.discoveryCardDesc}</p>
          </div>
          <div 
            onClick={() => setActiveView('trending')}
            className="glass-card hover:shadow-[0_10px_20px_rgba(6,182,212,0.04)] cursor-pointer group"
          >
            <Flame className="text-omnicord-cyan w-8 h-8 mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold text-base mb-1">{t.trendingCardTitle}</h3>
            <p className="text-xs text-gray-400 font-medium">{t.trendingCardDesc}</p>
          </div>
          <div 
            onClick={() => setActiveView('mix')}
            className="glass-card hover:shadow-[0_10px_20px_rgba(255,255,255,0.04)] cursor-pointer group"
          >
            <Disc className="text-white w-8 h-8 mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold text-base mb-1">{t.mixCardTitle}</h3>
            <p className="text-xs text-gray-400 font-medium">{t.mixCardDesc}</p>
          </div>
        </section>
      </div>
    );
  };

  // RENDER: Playlist View (Custom / Favorites)
  const renderPlaylistView = () => {
    if (!activePlaylist) return null;

    const tracks = activePlaylist.tracks || [];

    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Playlist Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 pb-6 border-b border-white/5">
          <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-3xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg relative overflow-hidden group ${
            activePlaylist.id === 'pl-liked'
              ? 'bg-gradient-to-br from-rose-500/30 via-pink-500/25 to-purple-500/20'
              : 'bg-gradient-to-br from-omnicord-cyan/30 to-omnicord-neon/30'
          }`}>
            {activePlaylist.id === 'pl-liked' ? (
              <ThumbsUp className="w-16 h-16 text-rose-400 group-hover:scale-110 transition-transform duration-300" fill="currentColor" />
            ) : (
              <Library className="w-16 h-16 text-white group-hover:scale-110 transition-transform duration-300" />
            )}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
          
          <div className="space-y-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
              activePlaylist.id === 'pl-liked'
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                : 'text-omnicord-neon bg-omnicord-neon/10 border-omnicord-neon/20'
            }`}>
              {activePlaylist.id === 'pl-liked' ? t.likedSongsLabel : t.hybridPlaylistLabel}
            </span>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{getPlaylistName(activePlaylist)}</h1>
            <p className="text-sm text-gray-400 font-medium">{getPlaylistDesc(activePlaylist)}</p>
            <div className="text-xs text-gray-500 font-semibold pt-1">
              {t.playlistTracksCount}: {tracks.length} • {t.playlistHybridSources}
            </div>
          </div>
        </div>

        {/* Tracks Table */}
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Music className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 font-bold">{language === 'pl' ? 'Ta playlista jest pusta' : 'This playlist is empty'}</p>
            <p className="text-xs text-gray-600 mt-1 max-w-xs leading-relaxed">
              {language === 'pl' 
                ? 'Skorzystaj z paska wyszukiwania na górze, aby znaleźć utwory, a następnie kliknij ikonę plusa, aby dodać je do tej playlisty.' 
                : 'Use the search bar at the top to find tracks, then click the plus icon to add them to this playlist.'}
            </p>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 sm:px-6 py-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.01]">
              <div className="w-8 text-center">#</div>
              <div>{t.tracklistHeaderTitle}</div>
              <div className="hidden sm:block">{t.tracklistHeaderArtist}</div>
              <div className="w-16 text-center text-xs shrink-0">{t.tracklistHeaderSource}</div>
              <div className="w-20 sm:w-24 text-right pr-2 sm:pr-6 shrink-0"><Clock size={12} className="inline" /></div>
            </div>

            {/* Tracks */}
            <div className="divide-y divide-white/[0.03]">
              {tracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;

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
                        onClick={() => playTrack(track, tracks)}
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

                    {/* Duration / Trash */}
                    <div className="w-20 sm:w-24 flex items-center justify-end gap-2 sm:gap-3 text-right text-xs font-semibold text-gray-400 relative shrink-0">
                      <span>{formatDuration(track.duration)}</span>
                      <button 
                        onClick={() => removeTrackFromPlaylist(activePlaylist.id, track.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all duration-150"
                        title={language === 'pl' ? 'Usuń z playlisty' : 'Remove from playlist'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // RENDER: Category View (Discovery / Trending / Mix)
  const renderCategoryView = () => {
    const categoryLabel = activeCategory === 'Discovery' ? t.discovery : (activeCategory === 'Trending' ? t.trending : t.mix);

    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Category Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide capitalize">{categoryLabel}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'pl' 
                ? 'Szybkie, gotowe i automatycznie wyszukiwane listy odtwarzania' 
                : 'Quick, pre-defined and dynamically searched playlists'}
            </p>
          </div>
          <button 
            onClick={() => loadCategoryTracks(activeCategory)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-all duration-200 font-semibold"
          >
            <RefreshCw size={12} className={categoryLoading ? "animate-spin" : ""} />
            <span>{language === 'pl' ? 'Odśwież' : 'Refresh'}</span>
          </button>
        </div>

        {/* Tracks Table */}
        {categoryLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-omnicord-neon animate-spin" />
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 sm:px-6 py-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.01]">
              <div className="w-8 text-center">#</div>
              <div>{t.tracklistHeaderTitle}</div>
              <div className="hidden sm:block">{t.tracklistHeaderArtist}</div>
              <div className="w-16 text-center text-xs shrink-0">{t.tracklistHeaderSource}</div>
              <div className="w-20 sm:w-24 text-right pr-2 sm:pr-6 shrink-0"><Clock size={12} className="inline" /></div>
            </div>

            {/* Tracks */}
            <div className="divide-y divide-white/[0.03]">
              {categoryTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;

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
                        onClick={() => playTrack(track, categoryTracks)}
                        className="absolute opacity-0 group-hover:opacity-100 text-omnicord-neon hover:scale-110 active:scale-95 transition-all"
                      >
                        <Play size={14} fill="#deff9a" className={isTrackPlaying ? "animate-pulse" : ""} />
                      </button>
                    </div>

                    {/* Cover & Title */}
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/5 shadow-md">
                        <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover" />
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

                    {/* Duration */}
                    <div className="w-20 sm:w-24 text-right text-xs font-semibold text-gray-400 pr-2 sm:pr-6 shrink-0">
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper loader inside content
  const Loader2 = ({ className, ...props }: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide lucide-loader-2 ${className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden relative">
      {renderTopBar()}

      {/* Main View Router */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {activeView === 'search' && <SearchResults />}
        {activeView === 'start' && renderStartView()}
        {activeView === 'playlist' && renderPlaylistView()}
        {(activeView === 'discovery' || activeView === 'trending' || activeView === 'mix') && renderCategoryView()}
      </div>
    </main>
  );
};
