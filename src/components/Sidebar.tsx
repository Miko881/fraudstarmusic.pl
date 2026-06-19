import React from 'react';
import { useOmni } from '../context/OmniProvider';
import { translations } from '../utils/translations';
import { 
  Home, Compass, TrendingUp, Radio, Plus, Settings, 
  Music, Trash2, ThumbsUp, Globe
} from 'lucide-react';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenPlaylistModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenPlaylistModal }) => {
  const { 
    activeView, setActiveView, playlists, selectedPlaylistId, 
    setSelectedPlaylistId, deletePlaylist, language, setLanguage,
    spotifyToken, spotifyUser, loginWithSpotify, logoutSpotify
  } = useOmni();

  const t = translations[language];

  const navItems = [
    { id: 'start', labelKey: 'start', icon: Home, color: 'text-omnicord-cyan' },
    { id: 'discovery', labelKey: 'discovery', icon: Compass, color: 'text-omnicord-neon' },
    { id: 'trending', labelKey: 'trending', icon: TrendingUp, color: 'text-omnicord-cyan' },
    { id: 'mix', labelKey: 'mix', icon: Radio, color: 'text-omnicord-neon' },
  ] as const;

  const handleNavClick = (viewId: typeof navItems[number]['id']) => {
    setActiveView(viewId);
    setSelectedPlaylistId(null);
  };

  const handlePlaylistClick = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setActiveView('playlist');
  };

  const handleDeletePlaylist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.confirmDeletePlaylist)) {
      deletePlaylist(id);
    }
  };

  const getPlaylistName = (pl: typeof playlists[number]) => {
    if (pl.id === 'pl-liked') return t.likedSongsPlaylist;
    if (pl.id === 'pl-favorites') return t.defaultPlaylistName;
    return pl.name;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'pl' ? 'en' : 'pl');
  };

  return (
    <aside className="w-64 glass-panel h-full flex flex-col border-r border-white/5 relative z-10 shrink-0 hidden md:flex">
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-omnicord-cyan to-omnicord-neon p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse-slow">
          <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
            <span className="text-omnicord-neon font-black text-lg select-none">O</span>
          </div>
        </div>
        <span className="font-bold text-xl tracking-wider bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          Omnicord
        </span>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-6 space-y-1">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">{t.browse}</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id && !selectedPlaylistId;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
                isActive 
                  ? 'bg-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border-l-2 border-omnicord-cyan' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-omnicord-cyan' : 'text-gray-500'}`} />
              <span>{t[item.labelKey]}</span>
            </button>
          );
        })}
      </div>

      <hr className="border-white/5 mx-4" />

      {/* Playlists Section */}
      <div className="flex-1 px-4 py-6 overflow-y-auto flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 mb-3">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t.library}</span>
          <button 
            onClick={onOpenPlaylistModal}
            className="text-gray-400 hover:text-omnicord-neon hover:bg-white/5 p-1 rounded-lg transition-all"
            title={t.createNewPlaylist}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-1 flex-1 overflow-y-auto pr-1">
          {playlists.map((pl) => {
            const isActive = selectedPlaylistId === pl.id;
            return (
              <div
                key={pl.id}
                onClick={() => handlePlaylistClick(pl.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/5 text-white border-l-2 border-omnicord-neon' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.01]'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {pl.id === 'pl-liked' ? (
                    <ThumbsUp className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-400' : 'text-rose-500/50'}`} fill={isActive ? 'currentColor' : 'none'} />
                  ) : (
                    <Music className={`w-4 h-4 shrink-0 ${isActive ? 'text-omnicord-neon' : 'text-gray-500'}`} />
                  )}
                  <span className="truncate">{getPlaylistName(pl)}</span>
                </div>
                {pl.id !== 'pl-favorites' && pl.id !== 'pl-liked' && (
                  <button 
                    onClick={(e) => handleDeletePlaylist(e, pl.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1 rounded transition-all duration-150"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="p-4 border-t border-white/5 bg-black/20 space-y-2">
        {/* Spotify Integration Section */}
        {spotifyToken && spotifyUser ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              {spotifyUser.image ? (
                <img src={spotifyUser.image} alt={spotifyUser.name} className="w-5 h-5 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-[10px] text-black font-bold">S</div>
              )}
              <span className="text-gray-200 truncate font-medium">{spotifyUser.name}</span>
            </div>
            <button 
              onClick={logoutSpotify} 
              className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer select-none shrink-0"
              title={language === 'pl' ? 'Wyloguj ze Spotify' : 'Log out from Spotify'}
            >
              Exit
            </button>
          </div>
        ) : (
          <button 
            onClick={loginWithSpotify}
            className="w-full flex items-center justify-center gap-2 text-white text-xs font-bold py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/20 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.136-.669.47-.745 3.856-.88 7.15-.502 9.82 1.13.297.18.388.564.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.075-1.183-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.666-1.112 8.232-.574 11.34 1.34.368.228.488.708.26 1.075zm.106-2.833C14.773 8.87 9.585 8.697 6.587 9.607c-.477.145-.978-.125-1.123-.603-.144-.478.125-.978.603-1.122 3.447-1.046 9.176-.846 12.793 1.302.43.256.57.813.314 1.242-.256.43-.813.57-1.242.314z"/>
            </svg>
            <span>{language === 'pl' ? 'Połącz ze Spotify' : 'Connect Spotify'}</span>
          </button>
        )}

        {/* Language switch button */}
        <button 
          onClick={toggleLanguage}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-xs font-semibold py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors border border-white/5 cursor-pointer"
        >
          <Globe size={14} className="text-omnicord-neon" />
          <span className="uppercase">{language === 'pl' ? 'English' : 'Polski'}</span>
        </button>

        {/* Settings button */}
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-xs font-semibold py-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 cursor-pointer"
        >
          <Settings size={14} className="text-omnicord-cyan" />
          <span>{t.playerSettings}</span>
        </button>
      </div>
    </aside>
  );
};
