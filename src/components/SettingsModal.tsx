import React, { useState } from 'react';
import { useOmni } from '../context/OmniProvider';
import { X, Sliders, Music, Check, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig } = useOmni();
  
  const [crossfadeDuration, setCrossfadeDuration] = useState(config.crossfadeDuration ?? 2);
  const [audioQuality, setAudioQuality] = useState(config.audioQuality ?? 'high');
  const [youtubeApiKey, setYoutubeApiKey] = useState(config.youtubeApiKey ?? '');
  const [isSaved, setIsSaved] = useState(false);

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
            <h2 className="text-2xl font-bold text-white tracking-wide">Ustawienia Omnicord</h2>
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
              <span>Dźwięk i Mikser</span>
            </div>

            {/* Crossfade Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Płynne przejście (Crossfade)</span>
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
              <label className="block text-xs text-gray-400">Jakość Dźwięku (Streaming)</label>
              <select
                value={audioQuality}
                onChange={(e: any) => setAudioQuality(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-omnicord-cyan/50 text-sm"
              >
                <option value="high">Wysoka (Premium Audio)</option>
                <option value="medium">Średnia (Standard)</option>
                <option value="low">Niska (Oszczędzanie danych)</option>
              </select>
            </div>
          </div>

          {/* Section: YouTube API */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
              <Key size={16} className="text-omnicord-cyan" />
              <span>YouTube API</span>
            </div>
            
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Wklej swój klucz YouTube Data API v3, aby odblokować błyskawiczne wyszukiwanie i importowanie publicznych playlist. Bez klucza aplikacja korzysta z publicznych serwerów fallback.
            </p>

            <div className="space-y-2">
              <label className="block text-xs text-gray-400">Klucz API YouTube (opcjonalny)</label>
              <input
                type="password"
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-omnicord-cyan/50 text-sm font-mono tracking-wider"
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
                <span>Zapisano zmiany!</span>
              </>
            ) : (
              <span>Zapisz Ustawienia</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
