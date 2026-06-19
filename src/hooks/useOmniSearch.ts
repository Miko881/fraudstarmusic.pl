import { useState, useEffect } from 'react';
import type { Track } from '../types';
import { searchSpotify } from '../utils/spotify';
import { searchYouTube } from '../utils/youtube';
import { useOmni } from '../context/OmniProvider';

interface SearchResults {
  tracks: Track[];
  loading: boolean;
  error: string | null;
}

export function useOmniSearch(query: string): SearchResults {
  const { searchSource } = useOmni();
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    const cleanQuery = query.trim().substring(0, 100);
    if (!cleanQuery || cleanQuery.length < 2) {
      setResults({ tracks: [], loading: false, error: null });
      return;
    }

    let isMounted = true;
    const delayDebounce = setTimeout(async () => {
      if (!isMounted) return;
      setResults(prev => ({ ...prev, loading: true, error: null }));

      try {
        let spotifyResults: Track[] = [];
        let youtubeResults: Track[] = [];
        const promises: Promise<any>[] = [];

        if (searchSource === 'both' || searchSource === 'spotify') {
          promises.push(searchSpotify(cleanQuery).then(res => { spotifyResults = res; }));
        }
        if (searchSource === 'both' || searchSource === 'youtube') {
          promises.push(searchYouTube(cleanQuery).then(res => { youtubeResults = res; }));
        }

        await Promise.all(promises);

        if (!isMounted) return;

        // Merge results: Spotify results first (as they have cleaner metadata),
        // then YouTube results.
        // We de-duplicate using Title + Artist matching (case-insensitive, ignoring spacing)
        const mergedTracks: Track[] = [...spotifyResults];
        
        const seen = new Set(
          spotifyResults.map(t => `${t.title.toLowerCase().trim()}-${t.artist.toLowerCase().trim()}`)
        );

        for (const ytTrack of youtubeResults) {
          // Check if YouTube track is already represented in Spotify results
          const key = `${ytTrack.title.toLowerCase().trim()}-${ytTrack.artist.toLowerCase().trim()}`;
          // Also check for sub-string matches to prevent duplicates like "After Hours" vs "The Weeknd - After Hours"
          const isDuplicate = Array.from(seen).some(spotifyKey => {
            return spotifyKey.includes(key) || key.includes(spotifyKey);
          });

          if (!isDuplicate) {
            mergedTracks.push(ytTrack);
            seen.add(key);
          }
        }

        setResults({
          tracks: mergedTracks,
          loading: false,
          error: null
        });

      } catch (err: any) {
        console.error("OmniSearch hook failed:", err);
        if (isMounted) {
          setResults({
            tracks: [],
            loading: false,
            error: err.message || "Wyszukiwanie nie powiodło się."
          });
        }
      }
    }, 400); // 400ms debounce

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [query]);

  return results;
}
