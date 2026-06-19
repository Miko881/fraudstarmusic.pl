import React, { useState } from 'react';
import { useOmni } from '../context/OmniProvider';
import { X, PlusCircle, Check, Loader2 } from 'lucide-react';
import { extractPlaylistId } from '../utils/youtube';
import { translations } from '../utils/translations';

const YoutubeIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> = ({ size = 24, className, ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    style={{ width: size, height: size }}
    className={className} 
    {...props}
  >
    <path d="M23.498 6.163c-.272-1.022-1.074-1.824-2.096-2.096C19.54 3.75 12 3.75 12 3.75s-7.54 0-9.402.317c-1.022.272-1.824 1.074-2.096 2.096C.188 8.026.188 12 .188 12s0 3.974.317 5.837c.272 1.022 1.074 1.824 2.096 2.096 1.862.317 9.402.317 9.402.317s7.54 0 9.402-.317c1.022-.272 1.824-1.074 2.096-2.096.317-1.863.317-5.837.317-5.837s0-3.974-.317-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({ isOpen, onClose }) => {
  const { createPlaylist, importYouTubePlaylist, language } = useOmni();
  
  const [activeTab, setActiveTab] = useState<'create' | 'import'>('create');
  
  // Create state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreated, setIsCreated] = useState(false);

  // Import state
  const [ytUrlOrId, setYtUrlOrId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const t = translations[language];

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state
    setName('');
    setDescription('');
    setIsCreated(false);
    setYtUrlOrId('');
    setIsImporting(false);
    setImportError(null);
    setImportSuccess(false);
    setActiveTab('create');
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createPlaylist(name.trim(), description.trim());
    setIsCreated(true);
    
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);

    const playlistId = extractPlaylistId(ytUrlOrId);
    if (!playlistId) {
      setImportError(
        language === 'pl'
          ? "Niepoprawny format URL lub ID playlisty. Wprowadź pełny adres URL lub ID (np. PL...)"
          : "Invalid URL or Playlist ID format. Please input full URL or ID (e.g. PL...)"
      );
      return;
    }

    setIsImporting(true);
    try {
      await importYouTubePlaylist(playlistId);
      setImportSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setImportError(
        err.message || 
        (language === 'pl'
          ? "Wystąpił błąd podczas importowania. Upewnij się, że playlista jest publiczna i spróbuj ponownie."
          : "An error occurred during import. Ensure the playlist is public and try again.")
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="glass-panel w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-[0_0_50px_rgba(222,255,154,0.1)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {activeTab === 'create' ? (
              <PlusCircle className="text-omnicord-neon w-6 h-6" />
            ) : (
              <YoutubeIcon className="text-red-500" size={24} />
            )}
            <h2 className="text-2xl font-bold text-white tracking-wide">
              {activeTab === 'create' ? t.createPlaylistTitle : t.importYoutubeLabel}
            </h2>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 mb-6 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('create'); setImportError(null); }}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === 'create'
                ? 'border-b-2 border-omnicord-neon text-white font-bold'
                : 'text-gray-500 hover:text-gray-300 font-medium'
            }`}
          >
            {language === 'pl' ? 'Stwórz własną' : 'Create own'}
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportError(null); }}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === 'import'
                ? 'border-b-2 border-red-500 text-white font-bold'
                : 'text-gray-500 hover:text-gray-300 font-medium'
            }`}
          >
            {language === 'pl' ? 'Import z YouTube' : 'Import from YouTube'}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">{t.playlistNameLabel} *</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.playlistNamePlaceholder}
                  className="w-full glass-input text-white"
                  maxLength={40}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">{t.playlistDescLabel}</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.playlistDescPlaceholder}
                  className="w-full glass-input h-24 resize-none py-3 text-white"
                  maxLength={120}
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isCreated || !name.trim()}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                isCreated 
                  ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-omnicord-neon text-black hover:shadow-[0_0_15px_rgba(222,255,154,0.4)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
              }`}
            >
              {isCreated ? (
                <>
                  <Check size={18} />
                  <span>{language === 'pl' ? 'Utworzono playlistę!' : 'Playlist created!'}</span>
                </>
              ) : (
                <span>{language === 'pl' ? 'Utwórz Playlistę' : 'Create Playlist'}</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleImportSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  {language === 'pl' ? 'Link lub ID Playlisty YouTube Music *' : 'YouTube Music Playlist Link or ID *'}
                </label>
                <input 
                  type="text"
                  required
                  disabled={isImporting || importSuccess}
                  value={ytUrlOrId}
                  onChange={(e) => setYtUrlOrId(e.target.value)}
                  placeholder={t.importYoutubePlaceholder}
                  className="w-full glass-input pl-4 text-white"
                />
                <span className="block text-[10px] text-gray-500 leading-normal mt-1.5 font-medium">
                  {language === 'pl' 
                    ? 'Wspiera linki z YouTube Music i standardowego YouTube. Playlista musi być publiczna lub niepubliczna (dostępna przez link), aby nasz serwer mógł ją odczytać.'
                    : 'Supports YouTube Music and standard YouTube links. Playlist must be public or unlisted for our server to read it.'}
                </span>
              </div>

              {importError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold leading-relaxed">
                  {importError}
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isImporting || importSuccess || !ytUrlOrId.trim()}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                importSuccess 
                  ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-red-500 text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t.importing}</span>
                </>
              ) : importSuccess ? (
                <>
                  <Check size={18} />
                  <span>{language === 'pl' ? 'Zaimportowano playlistę!' : 'Playlist imported!'}</span>
                </>
              ) : (
                <span>{language === 'pl' ? 'Rozpocznij Import' : 'Start Import'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
