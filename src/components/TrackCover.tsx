import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface TrackCoverProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Renders a track cover image with YouTube thumbnail quality fallback:
 * hqdefault.jpg → mqdefault.jpg → sddefault.jpg → default.jpg → placeholder icon
 */
export const TrackCover: React.FC<TrackCoverProps> = ({ src, alt, className = '' }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setFailed(false);
  }, [src]);

  const handleError = () => {
    // Extract videoId from YouTube thumbnail URL
    const match = currentSrc.match(/img\.youtube\.com\/vi\/([^/]+)\//);
    if (match) {
      const videoId = match[1];
      if (currentSrc.includes('hqdefault')) {
        setCurrentSrc(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        return;
      }
      if (currentSrc.includes('mqdefault')) {
        setCurrentSrc(`https://img.youtube.com/vi/${videoId}/sddefault.jpg`);
        return;
      }
      if (currentSrc.includes('sddefault')) {
        setCurrentSrc(`https://img.youtube.com/vi/${videoId}/default.jpg`);
        return;
      }
    }
    // Final fallback — show placeholder icon
    setFailed(true);
  };

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-white/[0.03] border border-white/5 ${className}`}>
        <Music className="text-gray-600" size={28} />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};
