import React, { useState, useEffect } from 'react';
import { useOmni } from '../context/OmniProvider';
import type { Track } from '../types';
import { searchYouTube, getYouTubeRecommendations } from '../utils/youtube';
import { getSpotifyRecommendations, searchSpotify } from '../utils/spotify';
import { translations } from '../utils/translations';
import { 
  Search, Play, Clock, Trash2, 
  Sparkles, Flame, Compass, Disc, Library, RefreshCw, Music,
  ThumbsUp, X
} from 'lucide-react';
import { SearchResults } from './SearchResults';
import { TrackCover } from './TrackCover';

export const MainContent: React.FC = () => {
  const { 
    activeView, setActiveView, selectedPlaylistId, playlists, removeTrackFromPlaylist,
    searchQuery, setSearchQuery, playTrack, currentTrack, isPlaying,
    history, language, spotifyToken, loginWithSpotify, searchSource, setSearchSource
  } = useOmni();

  // Local state for categories / custom mixes
  const [categoryTracks, setCategoryTracks] = useState<Track[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Discovery' | 'Trending' | 'Mix'>('Trending');

  // Mood state
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [moodTracks, setMoodTracks] = useState<Track[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Recommendation states
  const [spotifyRecs, setSpotifyRecs] = useState<Track[]>([]);
  const [spotifyRecLoading, setSpotifyRecLoading] = useState(false);
  const [youtubeRecs, setYoutubeRecs] = useState<Track[]>([]);
  const [youtubeRecLoading, setYoutubeRecLoading] = useState(false);

  const t = translations[language];

  const lastPlayedArtist = history && history.length > 0 ? history[0].artist : null;

  useEffect(() => {
    if (activeMood) {
      loadMoodTracks(activeMood);
    } else {
      setMoodTracks([]);
    }
  }, [activeMood]);

  // Load recommendations automatically when playing track, history, or spotify status changes
  useEffect(() => {
    const loadAllRecommendations = async () => {
      const seedTrack = currentTrack || (history && history.length > 0 ? history[0] : null);
      
      // 1. Fetch Spotify Recommendations (if token present)
      if (spotifyToken) {
        setSpotifyRecLoading(true);
        try {
          const seedId = seedTrack?.source === 'spotify' ? seedTrack.id : undefined;
          const seedArtist = seedTrack?.artist;
          const recs = await getSpotifyRecommendations(seedId, seedArtist);
          setSpotifyRecs(recs);
        } catch (err) {
          console.error("Spotify recommendations fetch failed:", err);
        } finally {
          setSpotifyRecLoading(false);
        }
      } else {
        setSpotifyRecs([]);
      }

      // 2. Fetch YouTube Music Recommendations
      setYoutubeRecLoading(true);
      try {
        const seedVideoId = seedTrack?.source === 'youtube' ? seedTrack.id : seedTrack?.videoId;
        const seedArtist = seedTrack?.artist;
        const seedTitle = seedTrack?.title;
        const recs = await getYouTubeRecommendations(seedVideoId, seedArtist, seedTitle);
        setYoutubeRecs(recs);
      } catch (err) {
        console.error("YouTube recommendations fetch failed:", err);
      } finally {
        setYoutubeRecLoading(false);
      }
    };

    loadAllRecommendations();
  }, [currentTrack, lastPlayedArtist, spotifyToken]);

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

  // Recommendations loaded automatically via useEffect

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
      let ytQuery = 'music';
      let spotifyQuery = 'music';
      
      if (cat === 'Trending') {
        ytQuery = language === 'pl' ? 'muzyka hity pl' : 'trending music hits';
        spotifyQuery = language === 'pl' ? 'hity pl' : 'top hits';
      } else if (cat === 'Discovery') {
        ytQuery = language === 'pl' ? 'nowe wydania muzyczne' : 'new music releases';
        spotifyQuery = language === 'pl' ? 'nowe wydania' : 'new releases';
      } else if (cat === 'Mix') {
        ytQuery = language === 'pl' ? 'składanka muzyczna mix' : 'lofi chill music mix';
        spotifyQuery = language === 'pl' ? 'składanka chillout' : 'chill mix';
      }

      const promises: Promise<Track[]>[] = [];
      promises.push(searchYouTube(ytQuery));

      if (spotifyToken) {
        promises.push(searchSpotify(spotifyQuery));
      }

      const results = await Promise.all(promises);
      const ytTracks = results[0] || [];
      const spotifyTracks = results[1] || [];

      // Merge and de-duplicate (Spotify first for clean metadata, then YouTube)
      const merged: Track[] = [...spotifyTracks];
      const seen = new Set(spotifyTracks.map(t => `${t.title.toLowerCase().trim()}-${t.artist.toLowerCase().trim()}`));
      
      for (const t of ytTracks) {
        const key = `${t.title.toLowerCase().trim()}-${t.artist.toLowerCase().trim()}`;
        if (!seen.has(key)) {
          merged.push(t);
          seen.add(key);
        }
      }

      setCategoryTracks(merged);
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
      {/* Search Input & Source Toggles */}
      <div className="flex items-center gap-3 w-full max-w-xl">
        <div className="relative flex-1 group">
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
            className="w-full glass-input !pl-11 !pr-10 bg-white/[0.02]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveView('start');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-lg hover:bg-white/5 active:scale-95"
              title={language === 'pl' ? 'Wyczyść wyszukiwanie' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Source selector buttons */}
        <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl p-0.5 shrink-0">
          <button
            onClick={() => setSearchSource('both')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95 ${
              searchSource === 'both'
                ? 'bg-omnicord-cyan/15 text-omnicord-neon border border-omnicord-neon/20 shadow-[0_0_10px_rgba(222,255,154,0.1)]'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            {language === 'pl' ? 'Oba' : 'Both'}
          </button>
          <button
            onClick={() => setSearchSource('spotify')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1 ${
              searchSource === 'spotify'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span>Spotify</span>
          </button>
          <button
            onClick={() => setSearchSource('youtube')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center gap-1 ${
              searchSource === 'youtube'
                ? 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span>YouTube</span>
          </button>
        </div>
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

        {/* Spotify Recommendations Row */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">
                {language === 'pl' ? 'AUTOMATYCZNE REKOMENDACJE' : 'AUTO RECOMMENDATIONS'}
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-emerald-500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.136-.669.47-.745 3.856-.88 7.15-.502 9.82 1.13.297.18.388.564.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.075-1.183-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.666-1.112 8.232-.574 11.34 1.34.368.228.488.708.26 1.075zm.106-2.833C14.773 8.87 9.585 8.697 6.587 9.607c-.477.145-.978-.125-1.123-.603-.144-.478.125-.978.603-1.122 3.447-1.046 9.176-.846 12.793 1.302.43.256.57.813.314 1.242-.256.43-.813.57-1.242.314z"/>
                </svg>
                {language === 'pl' ? 'Rekomendacje Spotify' : 'Spotify Recommendations'}
              </h2>
            </div>
          </div>

          {!spotifyToken ? (
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {language === 'pl' ? 'Odkryj magię rekomendacji Spotify' : 'Discover the magic of Spotify recommendations'}
                </p>
                <p className="text-xs text-gray-400">
                  {language === 'pl' 
                    ? 'Połącz konto Spotify Premium, aby otrzymywać spersonalizowane rekomendacje bezpośrednio z algorytmów Spotify.'
                    : 'Connect your Spotify Premium account to get personalized recommendations directly from Spotify algorithms.'}
                </p>
              </div>
              <button 
                onClick={loginWithSpotify}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shrink-0"
              >
                {language === 'pl' ? 'Połącz ze Spotify' : 'Connect Spotify'}
              </button>
            </div>
          ) : spotifyRecLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3 shrink-0">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-4 bg-white/[0.02] rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-white/[0.02] rounded w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : spotifyRecs.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">
              {language === 'pl' ? 'Brak rekomendacji. Odtwórz jakiś utwór, aby zainicjować algorytm.' : 'No recommendations. Play a track to initialize the algorithm.'}
            </p>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {spotifyRecs.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, spotifyRecs)}
                  className="flex-col gap-3 cursor-pointer group flex shrink-0"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 relative group shadow-lg border border-white/5">
                    <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Play size={24} className="text-emerald-400" fill="#10b981" />
                    </div>
                  </div>
                  <div className="w-32 sm:w-36 pl-1 space-y-0.5">
                    <div className="font-semibold text-sm text-white truncate leading-snug group-hover:text-emerald-400 transition-colors">
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

        {/* YouTube Music Recommendations Row */}
        <section className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-0.5">
              {language === 'pl' ? 'AUTOMATYCZNE REKOMENDACJE' : 'AUTO RECOMMENDATIONS'}
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              {language === 'pl' ? 'Rekomendacje YouTube Music' : 'YouTube Music Recommendations'}
            </h2>
          </div>

          {youtubeRecLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3 shrink-0">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-4 bg-white/[0.02] rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-white/[0.02] rounded w-1/2 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : youtubeRecs.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">
              {language === 'pl' ? 'Brak rekomendacji.' : 'No recommendations.'}
            </p>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {youtubeRecs.map((track) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, youtubeRecs)}
                  className="flex-col gap-3 cursor-pointer group flex shrink-0"
                >
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 relative group shadow-lg border border-white/5">
                    <TrackCover src={track.cover} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Play size={24} className="text-red-400" fill="#ef4444" />
                    </div>
                  </div>
                  <div className="w-32 sm:w-36 pl-1 space-y-0.5">
                    <div className="font-semibold text-sm text-white truncate leading-snug group-hover:text-red-400 transition-colors">
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
