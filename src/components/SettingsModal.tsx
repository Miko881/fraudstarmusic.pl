import React, { useState } from 'react';
import { useOmni } from '../context/OmniProvider';
import { X, Sliders, Music, Check, Key } from 'lucide-react';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig, language } = useOmni();
  
  const [crossfadeDuration, setCrossfadeDuration] = useState(config.crossfadeDuration ?? 2);
  const [audioQuality, setAudioQuality] = useState(config.audioQuality ?? 'high');
  const [youtubeApiKey, setYoutubeApiKey] = useState(config.youtubeApiKey ?? '');
  const [isSaved, setIsSaved] = useState(false);

  const t = translations[language];

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      crossfadeDuration: Number(crossfadeDuration),
      audioQuality,
      youtubeApiKey: youtubeApiKey.trim()
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="glass-panel w-full max-w-lg rounded-3xl p-8 border border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Sliders className="text-omnicord-cyan w-6 h-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-white tracking-wide">
              {language === 'pl' ? 'Ustawienia Omnicord' : 'Omnicord Settings'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Section: Audio & Fades */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
              <Music size={16} className="text-omnicord-neon" />
              <span>{language === 'pl' ? 'Dźwięk i Mikser' : 'Sound & Mixer'}</span>
            </div>

            {/* Crossfade Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{t.crossfadeLabel}</span>
                <span className="text-omnicord-neon font-semibold">{crossfadeDuration}s</span>
              </div>
              <input 
                type="range"
                min="0"
                max="5"
                step="1"
                value={crossfadeDuration ?? 2}
                onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                className="range-slider"
              />
            </div>

            {/* Audio Quality */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400">{t.audioQualityLabel}</label>
              <select
                value={audioQuality}
                onChange={(e: any) => setAudioQuality(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-omnicord-cyan/50 text-sm"
              >
                <option value="high">{language === 'pl' ? 'Wysoka (Premium Audio)' : 'High (Premium Audio)'}</option>
                <option value="medium">{language === 'pl' ? 'Średnia (Standard)' : 'Medium (Standard)'}</option>
                <option value="low">{language === 'pl' ? 'Niska (Oszczędzanie danych)' : 'Low (Data saver)'}</option>
              </select>
            </div>
          </div>

          {/* Section: YouTube API */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
              <Key size={16} className="text-omnicord-cyan" />
              <span>YouTube API</span>
            </div>

            {/* Built-in key status */}
            <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className="text-[11px] text-emerald-300 leading-relaxed">
                {language === 'pl'
                  ? 'Wbudowany klucz YouTube API jest aktywny — użytkownicy nie muszą konfigurować niczego ręcznie. Po osiągnięciu dziennego limitu aplikacja automatycznie przełącza się na Invidious.'
                  : 'Built-in YouTube API key is active — users don\'t need to configure anything. When the daily quota is hit, the app automatically falls back to Invidious.'}
              </p>
            </div>

            {/* Quota reset */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-3.5 py-2.5">
              <div>
                <p className="text-xs text-gray-300 font-medium">
                  {language === 'pl' ? 'Dzienny limit YouTube API' : 'YouTube API Daily Quota'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {language === 'pl'
                    ? 'Resetuje się codziennie o północy. Kliknij aby wymusić reset.'
                    : 'Resets at midnight daily. Click to force reset.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('omni_yt_quota_exceeded_date');
                  alert(language === 'pl' ? 'Limit zresetowany — YouTube API jest aktywne.' : 'Quota reset — YouTube API is now active.');
                }}
                className="text-xs text-omnicord-cyan hover:text-white border border-omnicord-cyan/30 hover:border-omnicord-cyan/70 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                {language === 'pl' ? 'Resetuj limit' : 'Reset quota'}
              </button>
            </div>

            {/* Optional override */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400">
                {language === 'pl' ? 'Nadpisz klucz (opcjonalnie)' : 'Override key (optional)'}
              </label>
              <input
                type="password"
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder={language === 'pl' ? 'Pozostaw puste aby użyć wbudowanego klucza' : 'Leave empty to use built-in key'}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-omnicord-cyan/50 text-sm font-mono tracking-wider placeholder-gray-600"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSaved}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
              isSaved 
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
            }`}
          >
            {isSaved ? (
              <>
                <Check size={18} />
                <span>{language === 'pl' ? 'Zapisano zmiany!' : 'Settings saved!'}</span>
              </>
            ) : (
              <span>{t.saveSettings}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
