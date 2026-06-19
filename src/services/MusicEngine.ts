import type { Track } from '../types';

type PlaybackStateCallback = (state: {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  volume: number;
  activePlayerId: string;
}) => void;

class MusicEngine {
  // ── YouTube players ──────────────────────────────────────────────────────
  private player1: any = null;
  private player2: any = null;
  private activePlayerNum: 1 | 2 = 1;
  private ytApiReadyPromise: Promise<void>;

  // ── Spotify Web Playback SDK ─────────────────────────────────────────────
  private spotifyPlayer: any = null;
  private spotifyToken: string | null = null;
  private spotifyDeviceId: string | null = null;
  private spotifySdkLoaded: boolean = false;
  private spotifySdkReadyPromise: Promise<void>;
  private spotifySdkReadyResolve!: () => void;

  // ── Shared state ─────────────────────────────────────────────────────────
  private activeSource: 'youtube' | 'spotify' = 'youtube';
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.5;
  private duration: number = 0;
  private currentTime: number = 0;
  private timeUpdateInterval: any = null;
  private crossfadeDuration: number = 2;
  private stateChangeCallbacks: Set<PlaybackStateCallback> = new Set();

  constructor() {
    this.spotifySdkReadyPromise = new Promise(resolve => {
      this.spotifySdkReadyResolve = resolve;
    });
    this.ytApiReadyPromise = this.initYouTubeAPI();
    this.createPlayerContainers();
    this.loadSpotifySDK();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  public setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = seconds;
  }

  public subscribe(callback: PlaybackStateCallback) {
    this.stateChangeCallbacks.add(callback);
    this.emitState();
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /** Called from OmniProvider whenever a Spotify token is available / refreshed */
  public setSpotifyToken(token: string | null) {
    this.spotifyToken = token;
    if (token && !this.spotifyPlayer) {
      this.initSpotifyPlayer(token);
    }
  }

  /** Main play entry – routes to Spotify SDK or YouTube based on track.source */
  public async play(track: Track) {
    if (track.source === 'spotify') {
      await this.playSpotify(track);
    } else {
      await this.playYouTube(track);
    }
  }

  public pause() {
    if (this.activeSource === 'spotify') {
      this.spotifyPlayer?.pause();
    } else {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      if (activePlayer?.pauseVideo) {
        activePlayer.pauseVideo();
        this.isPlaying = false;
        this.emitState();
      }
    }
  }

  public resume() {
    if (this.activeSource === 'spotify') {
      this.spotifyPlayer?.resume();
    } else {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      if (activePlayer?.playVideo) {
        activePlayer.playVideo();
        this.isPlaying = true;
        this.emitState();
      }
    }
  }

  public seek(seconds: number) {
    if (this.activeSource === 'spotify') {
      this.spotifyPlayer?.seek(seconds * 1000); // Spotify SDK uses milliseconds
      this.currentTime = seconds;
      this.emitState();
    } else {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      if (activePlayer?.seekTo) {
        activePlayer.seekTo(seconds, true);
        this.currentTime = seconds;
        this.emitState();
      }
    }
  }

  public setVolume(volume: number) {
    this.volume = volume;
    if (this.activeSource === 'spotify') {
      this.spotifyPlayer?.setVolume(volume); // Spotify SDK 0-1
    } else {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      if (activePlayer?.setVolume) {
        activePlayer.setVolume(Math.round(volume * 100));
      }
    }
    this.emitState();
  }

  public toggleVideoVisibility(visible: boolean) {
    const container = document.getElementById('omni-players-container');
    if (container) {
      container.style.opacity = visible ? '1' : '0';
      container.style.pointerEvents = visible ? 'auto' : 'none';
      container.style.transform = visible ? 'scale(1)' : 'scale(0.8)';
    }
  }

  // ── Private: State ───────────────────────────────────────────────────────

  private emitState() {
    const state = {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      activePlayerId: this.activeSource === 'spotify'
        ? 'omni-spotify-player'
        : `omni-yt-player-${this.activePlayerNum}`
    };
    this.stateChangeCallbacks.forEach(cb => cb(state));
  }

  // ── Private: YouTube ─────────────────────────────────────────────────────

  private initYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).YT?.Player) { resolve(); return; }
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
      (window as any).onYouTubeIframeAPIReady = () => resolve();
    });
  }

  private createPlayerContainers() {
    let container = document.getElementById('omni-players-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'omni-players-container';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        width: '240px',
        height: '135px',
        zIndex: '9999',
        pointerEvents: 'none',
        opacity: '0',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        transform: 'scale(0.8)',
      });
      const p1 = document.createElement('div');
      p1.id = 'omni-yt-player-1';
      p1.style.cssText = 'width:100%;height:100%';
      const p2 = document.createElement('div');
      p2.id = 'omni-yt-player-2';
      p2.style.cssText = 'width:100%;height:100%;display:none';
      container.appendChild(p1);
      container.appendChild(p2);
      document.body.appendChild(container);
    }
  }

  private async getYTPlayer(num: 1 | 2): Promise<any> {
    await this.ytApiReadyPromise;
    if (num === 1 && this.player1) return this.player1;
    if (num === 2 && this.player2) return this.player2;
    return new Promise((resolve) => {
      const player = new (window as any).YT.Player(`omni-yt-player-${num}`, {
        height: '100%', width: '100%',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: () => {
            if (num === 1) this.player1 = player;
            else this.player2 = player;
            resolve(player);
          },
          onStateChange: (event: any) => this.handleYTStateChange(num, event.data),
        },
      });
    });
  }

  private handleYTStateChange(playerNum: 1 | 2, state: number) {
    if (playerNum !== this.activePlayerNum) return;
    if (this.activeSource !== 'youtube') return;
    if (state === 1) {
      this.isPlaying = true;
      this.startTrackingTime();
      this.updateDuration();
      this.emitState();
    } else if (state === 2) {
      this.isPlaying = false;
      this.stopTrackingTime();
      this.emitState();
    } else if (state === 0) {
      this.isPlaying = false;
      this.stopTrackingTime();
      this.emitState();
      window.dispatchEvent(new CustomEvent('omni-track-ended'));
    }
  }

  private async playYouTube(track: Track) {
    if (!track.videoId) { console.warn('Track missing videoId:', track); return; }

    // Stop Spotify if was active
    if (this.activeSource === 'spotify' && this.spotifyPlayer) {
      try { await this.spotifyPlayer.pause(); } catch (_) {}
    }
    this.activeSource = 'youtube';

    const previousTrack = this.currentTrack;
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = 0;

    const nextPlayerNum: 1 | 2 = this.activePlayerNum === 1 ? 2 : 1;
    const oldPlayerNum = this.activePlayerNum;
    const nextPlayer = await this.getYTPlayer(nextPlayerNum);
    const oldPlayer = oldPlayerNum === 1 ? this.player1 : this.player2;

    const nextPlayerDiv = document.getElementById(`omni-yt-player-${nextPlayerNum}`);
    const oldPlayerDiv = document.getElementById(`omni-yt-player-${oldPlayerNum}`);
    if (nextPlayerDiv) nextPlayerDiv.style.display = 'block';

    nextPlayer.setVolume(0);
    nextPlayer.loadVideoById(track.videoId);
    nextPlayer.playVideo();

    this.isPlaying = true;
    this.activePlayerNum = nextPlayerNum;
    this.emitState();

    if (previousTrack && oldPlayer?.getPlayerState?.() === 1 && this.crossfadeDuration > 0) {
      this.fadeTransition(oldPlayer, nextPlayer, oldPlayerDiv);
    } else {
      nextPlayer.setVolume(Math.round(this.volume * 100));
      if (oldPlayer) oldPlayer.pauseVideo();
      if (oldPlayerDiv) oldPlayerDiv.style.display = 'none';
    }
  }

  private fadeTransition(oldPlayer: any, nextPlayer: any, oldPlayerDiv: HTMLElement | null) {
    const steps = 20;
    const intervalTime = (this.crossfadeDuration * 1000) / steps;
    const targetVolume = this.volume;
    let step = 0;
    const fadeInterval = setInterval(() => {
      step++;
      const ratio = step / steps;
      try {
        if (oldPlayer?.setVolume) oldPlayer.setVolume(Math.max(0, Math.round(targetVolume * (1 - ratio) * 100)));
        if (nextPlayer?.setVolume) nextPlayer.setVolume(Math.min(100, Math.round(targetVolume * ratio * 100)));
      } catch (e) { /* ignore */ }
      if (step >= steps) {
        clearInterval(fadeInterval);
        try {
          if (oldPlayer?.pauseVideo) oldPlayer.pauseVideo();
          if (nextPlayer?.setVolume) nextPlayer.setVolume(Math.round(targetVolume * 100));
        } catch (e) { /* ignore */ }
        if (oldPlayerDiv) oldPlayerDiv.style.display = 'none';
      }
    }, intervalTime);
  }

  private startTrackingTime() {
    this.stopTrackingTime();
    this.timeUpdateInterval = setInterval(() => {
      if (this.activeSource === 'spotify') {
        // Spotify time is tracked via state_changed events, increment manually
        if (this.isPlaying) {
          this.currentTime += 0.25;
          if (this.duration > 0 && this.currentTime >= this.duration) {
            this.currentTime = this.duration;
          }
          this.emitState();
        }
      } else {
        const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
        if (activePlayer?.getCurrentTime) {
          this.currentTime = activePlayer.getCurrentTime();
          this.emitState();
        }
      }
    }, 250);
  }

  private stopTrackingTime() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  private async updateDuration() {
    const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
    if (activePlayer?.getDuration) {
      this.duration = activePlayer.getDuration();
      this.emitState();
    }
  }

  // ── Private: Spotify Web Playback SDK ────────────────────────────────────

  private loadSpotifySDK() {
    if (document.getElementById('spotify-sdk-script')) return;
    
    // Set global ready callback BEFORE loading the script
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      this.spotifySdkLoaded = true;
      if (this.spotifyToken) {
        this.initSpotifyPlayer(this.spotifyToken);
      }
      this.spotifySdkReadyResolve();
    };

    const script = document.createElement('script');
    script.id = 'spotify-sdk-script';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }

  private initSpotifyPlayer(token: string) {
    if (this.spotifyPlayer) return; // Already initialized
    if (!(window as any).Spotify) return; // SDK not loaded yet

    const player = new (window as any).Spotify.Player({
      name: 'Omnicord',
      getOAuthToken: (cb: (token: string) => void) => { cb(token); },
      volume: this.volume,
    });

    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('✅ Spotify Player ready, device_id:', device_id);
      this.spotifyDeviceId = device_id;
    });

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.warn('⚠️ Spotify Player not ready, device_id:', device_id);
      this.spotifyDeviceId = null;
    });

    player.addListener('player_state_changed', (state: any) => {
      if (!state || this.activeSource !== 'spotify') return;
      
      const playing = !state.paused;
      const duration = state.duration / 1000;
      const position = state.position / 1000;

      this.isPlaying = playing;
      this.duration = duration;
      this.currentTime = position;

      if (playing) {
        this.startTrackingTime();
      } else {
        this.stopTrackingTime();
        // If track ended (position near 0 and was playing)
        if (state.position === 0 && state.paused && state.restrictions?.disallow_seeking_reasons) {
          window.dispatchEvent(new CustomEvent('omni-track-ended'));
        }
      }

      this.emitState();
    });

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Spotify init error:', message);
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Spotify auth error:', message);
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error('Spotify Premium required:', message);
      alert('Spotify Web Playback SDK wymaga konta Premium. Sprawdź swój plan Spotify.');
    });

    player.connect();
    this.spotifyPlayer = player;
  }

  private async playSpotify(track: Track) {
    if (!this.spotifyToken) {
      console.warn('No Spotify token available');
      return;
    }

    // Wait for SDK to load if not ready yet
    if (!this.spotifySdkLoaded) {
      await this.spotifySdkReadyPromise;
    }

    // Initialize player if it doesn't exist yet (happens if token was set before SDK loaded)
    if (!this.spotifyPlayer && (window as any).Spotify) {
      this.initSpotifyPlayer(this.spotifyToken);
      // Give it a moment to connect and get device_id
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!this.spotifyDeviceId) {
      // Give it more time to get device_id
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!this.spotifyDeviceId) {
      console.warn('Spotify device not ready yet');
      alert('Omnicord odtwarzacz Spotify nie jest gotowy. Upewnij się, że jesteś zalogowany/a i spróbuj ponownie za chwilę.');
      return;
    }

    // Stop YouTube players if was active
    if (this.activeSource === 'youtube') {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      try { activePlayer?.pauseVideo?.(); } catch (_) {}
    }
    this.activeSource = 'spotify';
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 0;
    this.isPlaying = true;
    this.emitState();

    // Extract raw Spotify track ID from our prefixed ID format: "spotify-TRACKID"
    const rawId = track.id.replace(/^spotify-/, '');
    const spotifyUri = `spotify:track:${rawId}`;

    try {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.spotifyDeviceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.spotifyToken}`,
          },
          body: JSON.stringify({ uris: [spotifyUri] }),
        }
      );

      if (res.status === 401) {
        console.warn('Spotify token expired');
        window.dispatchEvent(new CustomEvent('omni-spotify-token-expired'));
        return;
      }

      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        console.error('Spotify play error:', err);
        alert(`Błąd odtwarzania Spotify: ${err?.error?.message || 'Nieznany błąd'}. Sprawdź czy Spotify Premium jest aktywne.`);
        return;
      }

      this.startTrackingTime();
    } catch (e) {
      console.error('Failed to play Spotify track:', e);
    }
  }
}

export const musicEngine = new MusicEngine();
