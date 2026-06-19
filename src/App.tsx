import { useState } from 'react';
import { OmniProvider, useOmni } from './context/OmniProvider';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { Player } from './components/Player';
import { SettingsModal } from './components/SettingsModal';
import { PlaylistModal } from './components/PlaylistModal';
import { Home, Compass, TrendingUp, Radio, Settings } from 'lucide-react';

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const { activeView, setActiveView, setSelectedPlaylistId } = useOmni();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] overflow-hidden select-none font-outfit relative">


      {/* Main Container */}
      <div className="flex flex-1 min-h-0 relative z-10 w-full">
        {/* Navigation Sidebar */}
        <Sidebar 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)} 
        />
        
        {/* Main Panel Content */}
        <MainContent />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden h-16 shrink-0 glass-panel border-t border-white/5 flex items-center justify-around px-4 bg-[#0a0a0a]/90 relative z-10">
        <button 
          onClick={() => { setActiveView('start'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${
            activeView === 'start' ? 'text-omnicord-cyan' : 'text-gray-500'
          }`}
        >
          <Home size={18} />
          <span>Start</span>
        </button>
        <button 
          onClick={() => { setActiveView('discovery'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${
            activeView === 'discovery' ? 'text-omnicord-neon' : 'text-gray-500'
          }`}
        >
          <Compass size={18} />
          <span>Discovery</span>
        </button>
        <button 
          onClick={() => { setActiveView('trending'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${
            activeView === 'trending' ? 'text-omnicord-cyan' : 'text-gray-500'
          }`}
        >
          <TrendingUp size={18} />
          <span>Trending</span>
        </button>
        <button 
          onClick={() => { setActiveView('mix'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider transition-colors ${
            activeView === 'mix' ? 'text-omnicord-neon' : 'text-gray-500'
          }`}
        >
          <Radio size={18} />
          <span>Mix</span>
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider text-gray-500 hover:text-white"
        >
          <Settings size={18} />
          <span>Opcje</span>
        </button>
      </nav>

      {/* Unified Playback Control Bar */}
      <Player />

      {/* Settings Panel */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Create Playlist Modal */}
      <PlaylistModal 
        isOpen={isPlaylistModalOpen} 
        onClose={() => setIsPlaylistModalOpen(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <OmniProvider>
      <AppContent />
    </OmniProvider>
  );
}

export default App;
