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
  private player1: any = null;
  private player2: any = null;
  private activePlayerNum: 1 | 2 = 1;
  private apiReadyPromise: Promise<void>;
  
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.5; // 0 to 1
  private duration: number = 0;
  private currentTime: number = 0;
  private timeUpdateInterval: any = null;
  
  private crossfadeDuration: number = 2; // seconds
  private stateChangeCallbacks: Set<PlaybackStateCallback> = new Set();

  constructor() {
    this.apiReadyPromise = this.initYouTubeAPI();
    this.createPlayerContainers();
  }

  // Set the crossfade duration from config
  public setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = seconds;
  }

  // Subscribe to playback updates
  public subscribe(callback: PlaybackStateCallback) {
    this.stateChangeCallbacks.add(callback);
    this.emitState();
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  private emitState() {
    const state = {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      activePlayerId: `omni-yt-player-${this.activePlayerNum}`
    };
    this.stateChangeCallbacks.forEach(cb => cb(state));
  }

  private initYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).YT && (window as any).YT.Player) {
        resolve();
        return;
      }

      // Check if script is already injected
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Global callback called by YT
      (window as any).onYouTubeIframeAPIReady = () => {
        resolve();
      };
    });
  }

  private createPlayerContainers() {
    // Check if container already exists
    let container = document.getElementById('omni-players-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'omni-players-container';
      // Hide them offscreen or keep small so visual content is rendered
      container.style.position = 'fixed';
      container.style.bottom = '100px';
      container.style.right = '20px';
      container.style.width = '240px';
      container.style.height = '135px';
      container.style.zIndex = '9999';
      container.style.pointerEvents = 'none';
      container.style.opacity = '0'; // Hidden by default, can be toggled by settings
      container.style.borderRadius = '12px';
      container.style.overflow = 'hidden';
      container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      container.style.transform = 'scale(0.8)';
      
      const p1 = document.createElement('div');
      p1.id = 'omni-yt-player-1';
      p1.style.width = '100%';
      p1.style.height = '100%';
      
      const p2 = document.createElement('div');
      p2.id = 'omni-yt-player-2';
      p2.style.width = '100%';
      p2.style.height = '100%';
      p2.style.display = 'none'; // Initially hide second player

      container.appendChild(p1);
      container.appendChild(p2);
      document.body.appendChild(container);
    }
  }

  private async getPlayer(num: 1 | 2): Promise<any> {
    await this.apiReadyPromise;
    
    if (num === 1 && this.player1) return this.player1;
    if (num === 2 && this.player2) return this.player2;

    return new Promise((resolve) => {
      const player = new (window as any).YT.Player(`omni-yt-player-${num}`, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: () => {
            if (num === 1) this.player1 = player;
            else this.player2 = player;
            resolve(player);
          },
          onStateChange: (event: any) => {
            this.handlePlayerStateChange(num, event.data);
          }
        }
      });
    });
  }

  private handlePlayerStateChange(playerNum: 1 | 2, state: number) {
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (playerNum !== this.activePlayerNum) return;

    if (state === 1) { // Playing
      this.isPlaying = true;
      this.startTrackingTime();
      this.updateDuration();
      this.emitState();
    } else if (state === 2) { // Paused
      this.isPlaying = false;
      this.stopTrackingTime();
      this.emitState();
    } else if (state === 0) { // Ended
      this.isPlaying = false;
      this.stopTrackingTime();
      this.emitState();
      // Trigger end event (handled by queue system)
      const event = new CustomEvent('omni-track-ended');
      window.dispatchEvent(event);
    }
  }

  private startTrackingTime() {
    this.stopTrackingTime();
    this.timeUpdateInterval = setInterval(() => {
      const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
      if (activePlayer && activePlayer.getCurrentTime) {
        this.currentTime = activePlayer.getCurrentTime();
        this.emitState();
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
    if (activePlayer && activePlayer.getDuration) {
      this.duration = activePlayer.getDuration();
      this.emitState();
    }
  }

  public toggleVideoVisibility(visible: boolean) {
    const container = document.getElementById('omni-players-container');
    if (container) {
      if (visible) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        container.style.transform = 'scale(1)';
      } else {
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.transform = 'scale(0.8)';
      }
    }
  }

  // Core play method supporting crossfading
  public async play(track: Track) {
    if (!track.videoId) {
      console.warn("Track missing videoId, cannot stream:", track);
      return;
    }

    const previousTrack = this.currentTrack;
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = 0;
    
    // Determine which player will become active (the inactive one)
    const nextPlayerNum: 1 | 2 = this.activePlayerNum === 1 ? 2 : 1;
    const oldPlayerNum = this.activePlayerNum;
    
    const nextPlayer = await this.getPlayer(nextPlayerNum);
    const oldPlayer = oldPlayerNum === 1 ? this.player1 : this.player2;

    // Setup next player view in DOM
    const nextPlayerDiv = document.getElementById(`omni-yt-player-${nextPlayerNum}`);
    const oldPlayerDiv = document.getElementById(`omni-yt-player-${oldPlayerNum}`);
    if (nextPlayerDiv) nextPlayerDiv.style.display = 'block';
    
    // Load track and set volume to 0 initially for fade in
    nextPlayer.setVolume(0);
    nextPlayer.loadVideoById(track.videoId);
    nextPlayer.playVideo();

    // Trigger state immediately as playing
    this.isPlaying = true;
    this.activePlayerNum = nextPlayerNum;
    this.emitState();

    // If there was a previous track and the old player is playing, execute crossfade
    if (previousTrack && oldPlayer && oldPlayer.getPlayerState && oldPlayer.getPlayerState() === 1 && this.crossfadeDuration > 0) {
      this.fadeTransition(oldPlayer, nextPlayer, oldPlayerDiv);
    } else {
      // Direct cut if no previous track or crossfade is disabled
      nextPlayer.setVolume(Math.round(this.volume * 100));
      if (oldPlayer) {
        oldPlayer.pauseVideo();
      }
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
      
      // Linear crossfade
      const oldVol = Math.max(0, Math.round(targetVolume * (1 - ratio) * 100));
      const newVol = Math.min(100, Math.round(targetVolume * ratio * 100));

      try {
        if (oldPlayer && oldPlayer.setVolume) oldPlayer.setVolume(oldVol);
        if (nextPlayer && nextPlayer.setVolume) nextPlayer.setVolume(newVol);
      } catch (e) {
        console.error("Error setting crossfade volume:", e);
      }

      if (step >= steps) {
        clearInterval(fadeInterval);
        try {
          if (oldPlayer && oldPlayer.pauseVideo) oldPlayer.pauseVideo();
          if (nextPlayer && nextPlayer.setVolume) nextPlayer.setVolume(Math.round(targetVolume * 100));
        } catch (e) {
          console.error("Error finalizing crossfade:", e);
        }
        if (oldPlayerDiv) oldPlayerDiv.style.display = 'none';
      }
    }, intervalTime);
  }

  public pause() {
    const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
    if (activePlayer && activePlayer.pauseVideo) {
      activePlayer.pauseVideo();
      this.isPlaying = false;
      this.emitState();
    }
  }

  public resume() {
    const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
    if (activePlayer && activePlayer.playVideo) {
      activePlayer.playVideo();
      this.isPlaying = true;
      this.emitState();
    }
  }

  public seek(seconds: number) {
    const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
    if (activePlayer && activePlayer.seekTo) {
      activePlayer.seekTo(seconds, true);
      this.currentTime = seconds;
      this.emitState();
    }
  }

  public setVolume(volume: number) {
    // volume is 0 to 1
    this.volume = volume;
    const activePlayer = this.activePlayerNum === 1 ? this.player1 : this.player2;
    if (activePlayer && activePlayer.setVolume) {
      activePlayer.setVolume(Math.round(volume * 100));
      this.emitState();
    }
  }
}

export const musicEngine = new MusicEngine();
