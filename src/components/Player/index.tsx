import React, { useState, useEffect } from 'react';
import { useOmni } from '../../context/OmniProvider';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Tv, Loader2, Music, ThumbsUp
} from 'lucide-react';
import { musicEngine } from '../../services/MusicEngine';
import { TrackCover } from '../TrackCover';

export const Player: React.FC = () => {
  const {
    currentTrack, isPlaying, volume, setVolume,
    togglePlay, nextTrack, prevTrack, shuffle, setShuffle, repeatMode, setRepeatMode,
    isResolving, isLiked, toggleLikeTrack
  } = useOmni();

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isHoveredVolume, setIsHoveredVolume] = useState(false);

  // Sync video visibility to MusicEngine on mount or state change
  useEffect(() => {
    musicEngine.toggleVideoVisibility(isVideoVisible);
  }, [isVideoVisible]);

  // Subscribe to playback updates locally for currentTime and duration
  useEffect(() => {
    const unsubscribe = musicEngine.subscribe((engineState) => {
      setCurrentTime(engineState.currentTime);
      setDuration(engineState.duration);
    });
    return () => unsubscribe();
  }, []);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  // Seek handler
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    musicEngine.seek(val);
  };

  // Mute toggle
  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Repeat toggle cycle: none -> all -> one -> none
  const handleRepeatToggle = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="h-24 glass-panel border-t border-white/5 px-8 flex items-center justify-between relative z-20 bg-[#050505]/80 backdrop-blur-3xl">
      {/* Top mini progress bar for mobile */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5 md:hidden">
        <div 
          className="h-full bg-omnicord-cyan transition-all duration-300"
          style={{ width: `${currentPercent}%` }}
        />
      </div>

      {/* Left: Track Meta */}
      <div className="flex-1 md:w-1/3 flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            {/* Spinning Disc Cover */}
            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/10 shrink-0 shadow-lg overflow-hidden group">
              {currentTrack.cover ? (
                <TrackCover 
                  src={currentTrack.cover} 
                  alt={currentTrack.title} 
                  className={`w-full h-full object-cover spin-slow ${
                    isPlaying && !isResolving ? '' : 'spin-paused'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <Music className="text-gray-400" size={18} />
                </div>
              )}
              {/* Center disc pin */}
              <div className="absolute inset-0 m-auto w-3.5 h-3.5 bg-black border border-white/10 rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.4)]"></div>
            </div>

            {/* Meta Text details */}
            <div className="overflow-hidden min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-bold text-sm text-white truncate leading-tight flex-1 ${
                  isPlaying && !isResolving ? 'glow-text-cyan' : ''
                }`}>
                  {currentTrack.title}
                </span>
                
                {currentTrack.source === 'spotify' ? (
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                    Spotify
                  </span>
                ) : (
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-red-400 border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1.5">
                    <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163c-.272-1.022-1.074-1.824-2.096-2.096C19.54 3.75 12 3.75 12 3.75s-7.54 0-9.402.317c-1.022.272-1.824 1.074-2.096 2.096C.188 8.026.188 12 .188 12s0 3.974.317 5.837c.272 1.022 1.074 1.824 2.096 2.096 1.862.317 9.402.317 9.402.317s7.54 0 9.402-.317c1.022-.272 1.824-1.074 2.096-2.096.317-1.863.317-5.837.317-5.837s0-3.974-.317-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> YT
                  </span>
                )}
              </div>
              
              {isResolving ? (
                <div className="flex items-center gap-1.5 text-xs text-omnicord-cyan font-bold animate-pulse">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Strumieniowanie z YouTube...</span>
                </div>
              ) : (
                <div className="text-xs text-gray-400 truncate font-semibold">
                  {currentTrack.artist}
                </div>
              )}
            </div>

            {/* Like / Thumbs Up Toggle */}
            <button
              onClick={() => toggleLikeTrack(currentTrack)}
              className={`p-2 rounded-full hover:bg-white/5 transition-all shrink-0 ml-1.5 ${
                isLiked(currentTrack.id)
                  ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={isLiked(currentTrack.id) ? "Usuń z polubionych" : "Polub utwór"}
            >
              <ThumbsUp size={16} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 text-sm font-semibold">
            <Music size={18} />
            <span>Wybierz utwór do odtworzenia</span>
          </div>
        )}
      </div>

      {/* Center: Controls & Timeline */}
      <div className="hidden md:flex w-1/3 flex-col items-center gap-2.5">
        {/* Control Buttons */}
        <div className="flex items-center gap-5">
          {/* Shuffle Toggle */}
          <button 
            onClick={() => setShuffle(!shuffle)}
            className={`transition-colors p-1 rounded-lg ${
              shuffle ? 'text-omnicord-neon hover:text-omnicord-neon/80' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Tryb losowy"
          >
            <Shuffle size={15} className={shuffle ? "drop-shadow-[0_0_5px_#deff9a]" : ""} />
          </button>

          {/* Prev Button */}
          <button 
            onClick={prevTrack}
            disabled={!currentTrack}
            className="text-gray-400 hover:text-white disabled:opacity-30 active:scale-90 transition-all p-1"
            title="Poprzedni utwór"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          {/* Play/Pause Button */}
          <button 
            onClick={togglePlay}
            disabled={!currentTrack || isResolving}
            className="w-12 h-12 rounded-full bg-white text-black hover:bg-omnicord-neon hover:shadow-[0_0_15px_rgba(222,255,154,0.4)] flex items-center justify-center disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition-all relative"
            title={isPlaying ? "Pauza" : "Odtwarzaj"}
          >
            {isResolving ? (
              <Loader2 size={20} className="text-black animate-spin" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" className="ml-[0.5px]" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-[3px]" />
            )}
          </button>

          {/* Next Button */}
          <button 
            onClick={nextTrack}
            disabled={!currentTrack}
            className="text-gray-400 hover:text-white disabled:opacity-30 active:scale-90 transition-all p-1"
            title="Następny utwór"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>

          {/* Repeat Toggle */}
          <button 
            onClick={handleRepeatToggle}
            className={`transition-colors p-1 rounded-lg ${
              repeatMode !== 'none' ? 'text-omnicord-cyan hover:text-omnicord-cyan/80' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={`Powtarzanie: ${repeatMode === 'none' ? 'brak' : repeatMode === 'one' ? 'utwór' : 'kolejka'}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={15} className="drop-shadow-[0_0_5px_#06b6d4]" />
            ) : (
              <Repeat size={15} className={repeatMode === 'all' ? "drop-shadow-[0_0_5px_#06b6d4]" : ""} />
            )}
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="w-full flex items-center gap-3 text-[10px] font-bold text-gray-500 tracking-wider">
          <span className="w-8 text-right font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1 relative flex items-center">
            <input 
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime ?? 0}
              onChange={handleSeekChange}
              disabled={!currentTrack || duration === 0}
              className="range-slider cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${currentPercent}%, rgba(255, 255, 255, 0.1) ${currentPercent}%, rgba(255, 255, 255, 0.1) 100%)`
              }}
            />
          </div>
          <span className="w-8 text-left font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Sound & Extras */}
      <div className="flex-1 md:w-1/3 flex items-center justify-end gap-3 md:gap-5">
        {/* Play/Pause Button (Mobile Only) */}
        <button 
          onClick={togglePlay}
          disabled={!currentTrack || isResolving}
          className="md:hidden w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-all shrink-0"
        >
          {isResolving ? (
            <Loader2 size={16} className="text-black animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-[1.5px]" />
          )}
        </button>

        {/* Next Button (Mobile Only) */}
        <button 
          onClick={nextTrack}
          disabled={!currentTrack}
          className="md:hidden text-gray-400 hover:text-white disabled:opacity-30 active:scale-90 transition-all p-1.5 shrink-0"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>

        {/* Toggle mini video viewport */}
        <button
          onClick={() => setIsVideoVisible(!isVideoVisible)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isVideoVisible 
              ? 'bg-omnicord-cyan/10 border-omnicord-cyan/30 text-omnicord-cyan hover:bg-omnicord-cyan/20' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }`}
          title="Przełącz podgląd wideo YouTube"
        >
          <Tv size={13} />
          <span>Wideo</span>
        </button>

        {/* Volume controls */}
        <div 
          className="hidden md:flex items-center gap-2 relative"
          onMouseEnter={() => setIsHoveredVolume(true)}
          onMouseLeave={() => setIsHoveredVolume(false)}
        >
          <button 
            onClick={handleMuteToggle}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          {/* Volume slider track */}
          <div className={`transition-all duration-300 ease-in-out ${
            isHoveredVolume ? 'w-24 opacity-100 visible' : 'w-0 opacity-0 invisible overflow-hidden'
          }`}>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume ?? 0.5}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (v > 0 && isMuted) setIsMuted(false);
              }}
              className="range-slider"
              style={{
                background: `linear-gradient(to right, #deff9a 0%, #deff9a ${volume * 100}%, rgba(255, 255, 255, 0.1) ${volume * 100}%, rgba(255, 255, 255, 0.1) 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
