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
    setSelectedPlaylistId, deletePlaylist, language, setLanguage
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
        {/* Language switch button */}
        <button 
          onClick={toggleLanguage}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-xs font-semibold py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors border border-white/5"
        >
          <Globe size={14} className="text-omnicord-neon" />
          <span className="uppercase">{language === 'pl' ? 'English' : 'Polski'}</span>
        </button>

        {/* Settings button */}
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-xs font-semibold py-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
        >
          <Settings size={14} className="text-omnicord-cyan" />
          <span>{t.playerSettings}</span>
        </button>
      </div>
    </aside>
  );
};
