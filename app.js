// =====================
// DEMO UTWORY (Dla Ciebie)
// =====================
const demoTracks = [
  {
    id: 1,
    title: "K X FRAUD.PL - REAL TALK [ INTRO ]",
    artist: "23FRAUD.PL",
    length: "1:00",
    plays: "21,4K",
    tag: "Fraudy",
    badge: "nowość",
    src: "audio/K_X_FRAUD.PL_-_REAL_TALK__INTRO_.mp3",
    cover: "https://i1.sndcdn.com/artworks-1FhPzDAJjgwym31m-EMYZhw-t500x500.png"
  },
  {
    id: 2,
    title: "FRAUD.PL FT. W2A BLANCIOR - CAŁY ROK",
    artist: "23FRAUD.PL",
    length: "1:12",
    plays: "18,1K",
    tag: "Bliczki",
    badge: "bliczki",
    src: "audio/FRAUD.PL_FT._W2A_BLANCIOR_-_CAY_ROK.mp3",
    cover: "https://i1.sndcdn.com/artworks-1FhPzDAJjgwym31m-EMYZhw-t500x500.png"
  },
  {
    id: 3,
    title: "FRAUD.PL X SNEAKERBOI - CZAS",
    artist: "23FRAUD.PL",
    length: "1:11",
    plays: "9,8K",
    tag: "BramkiPlay",
    badge: "Brameczki",
    src: "audio/FRAUD.PL_X_SNEAKERBOI_-_CZAS.mp3",
    cover: "https://i1.sndcdn.com/artworks-1FhPzDAJjgwym31m-EMYZhw-t500x500.png"
  },
  {
    id: 4,
    title: "w2a slimgucci - w2a działa na poważnie",
    artist: "23FRAUD.PL",
    length: "1:24",
    plays: "31,7K",
    tag: "BramkiPlay",
    badge: "popularne",
    src: "audio/w2a_slimgucci_-_w2a_dziaa_na_powaznie.mp3",
    cover: "https://i1.sndcdn.com/artworks-Kwu2l7szwgwZn97L-Fm9cjA-t500x500.png"
  },
  {
    id: 5,
    title: "FRAUD.PL - NIGDY NIE ZGONUJE",
    artist: "23FRAUD.PL",
    length: "1:27",
    plays: "12,2K",
    tag: "Bliczki",
    badge: "Topka",
    src: "audio/FRAUD.PL_-_NIGDY_NIE_ZGONUJE.mp3",
    cover: "https://i1.sndcdn.com/artworks-kxIoqO1h3nyjJe5G-XPGl6w-t500x500.png"
  },
  {
    id: 6,
    title: "FRAUD.PL - GLO 2 [ PROD - BJFUCK12 ]",
    artist: "23FRAUD.PL",
    length: "1:08",
    plays: "7,6K",
    tag: "Fraudy",
    badge: "nowość",
    src: "audio/FRAUD.PL_-_GLO_2__PROD_-_BJFUCK12_.mp3",
    cover: "https://i1.sndcdn.com/artworks-tezayFCPriM8sXQi-RWVYzA-t500x500.png"
  }
];

// =====================
// DOM
// =====================
const trackGrid = document.getElementById("trackGrid");
const searchInput = document.getElementById("searchInput");
const chips = document.querySelectorAll(".chip");

const audio = document.getElementById("audioPlayer");
const timeCurrent = document.getElementById("timeCurrent");
const timeTotal = document.getElementById("timeTotal");
const progressBar = document.querySelector(".player-progress");
const progressFill = document.getElementById("progressFill");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerThumb = document.getElementById("playerThumb");

const playToggle = document.getElementById("playToggle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const shuffleToggle = document.getElementById("shuffleToggle");
const loopToggle = document.getElementById("loopToggle");
const volumeBar = document.querySelector(".volume-bar");
const volumeFill = document.getElementById("volumeFill");

// SoundCloud
const scFrame = document.getElementById("scWidget");
const changeScBtn = document.getElementById("addPlaylistBtn");

// =====================
// STAN
// =====================
let currentFilter = "all";
let currentSearch = "";
let currentTrack = null;
let isPlaying = false;
let isShuffle = false;

// 'local' | 'sc'
let playbackMode = "local";

// lista aktywna (dla NEXT / PREV) – domyślnie demoTracks
let activeTrackList = demoTracks;

// SoundCloud widget
let scWidget = null;
let scDuration = 0; // sekundy

// domyślna playlista SC
const DEFAULT_SC_URL = "https://soundcloud.com/uzzis-142743846/sets/taka-taktyczna-cn";

// domyślna głośność
audio.volume = 0.7;

// =====================
// POMOCNICZE
// =====================
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updatePlayButton() {
  // Update main player button
  playToggle.innerHTML = isPlaying
    ? '<i class="fa-solid fa-pause"></i>'
    : '<i class="fa-solid fa-play"></i>';

  updateTrackCardIcons();
}

function updateTrackCardIcons() {
  const allCards = document.querySelectorAll(".track-card");
  allCards.forEach(card => {
    const playBtn = card.querySelector(".track-play");
    const id = parseInt(card.dataset.trackId);

    // Reset icon
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

    // If this is the current track
    if (currentTrack && currentTrack.id === id) {
      // If playing -> show pause
      if (isPlaying) {
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }
    }
  });
}

function updateTimeUI(current, duration) {
  timeCurrent.textContent = formatTime(current);
  timeTotal.textContent = formatTime(duration);

  if (duration > 0) {
    const percent = (current / duration) * 100;
    progressFill.style.width = `${percent}%`;
  } else {
    progressFill.style.width = "0%";
  }
}

// =====================
// RENDER UTWORÓW
// =====================
function renderTracks() {
  trackGrid.innerHTML = "";

  const list = activeTrackList;

  const filtered = list.filter((t) => {
    const matchesFilter = currentFilter === "all" || t.tag === currentFilter;
    const term = currentSearch.toLowerCase();
    const matchesSearch =
      !term ||
      t.title.toLowerCase().includes(term) ||
      t.artist.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  filtered.forEach((track, index) => {
    const card = document.createElement("article");
    card.className = "track-card";
    card.dataset.trackId = track.id;

    card.innerHTML = `
      <div class="track-thumb" style="${track.cover ? `background-image:url('${track.cover}')` : ""}">
        <div class="track-badge">${track.badge || "UTWÓR"}</div>
        <div class="track-play"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="track-meta">
        <div class="track-title" title="${track.title}">${track.title}</div>
        <div class="track-artist">${track.artist}</div>
      </div>
      <div class="track-extra">
        <span>${track.length || "—:—"}</span>
        <span>${track.plays ? track.plays + " odsłuchów" : ""}</span>
      </div>
    `;

    // Stagger animation: każdy kolejny element opóźniony o 50ms
    card.style.animationDelay = `${index * 0.05}s`;

    card.addEventListener("click", () => {
      // Logic: if clicking the SAME track that is currently playing -> Toggle Pause
      if (currentTrack && currentTrack.id === track.id) {
        if (isPlaying) {
          // Pause
          if (playbackMode === 'sc' && scWidget) {
            scWidget.pause();
          } else {
            audio.pause();
          }
        } else {
          // Play
          if (playbackMode === 'sc' && scWidget) {
            scWidget.play();
          } else {
            audio.play().catch(console.error);
          }
        }
        return;
      }

      // If clicking a NEW track
      // przełącz się na LOCAL i zatrzymaj SC
      playbackMode = "local";
      if (scWidget) scWidget.pause();

      setCurrentTrack(track);
      activeTrackList = list;
    });

    trackGrid.appendChild(card);
  });

  // Update icons immediately after render (in case one is playing)
  updateTrackCardIcons();
}

// =====================
// USTAWIANIE UTWORU (LOCAL AUDIO)
// =====================
function setCurrentTrack(track) {
  if (!track.src) {
    alert("Ten utwór nie ma przypisanego pliku audio.");
    return;
  }

  playbackMode = "local";

  currentTrack = track;
  playerTitle.textContent = track.title;
  playerArtist.textContent = track.artist;

  if (track.cover) {
    playerThumb.style.backgroundImage = `url('${track.cover}')`;
  } else {
    playerThumb.style.backgroundImage = "";
  }

  audio.src = track.src;
  audio.currentTime = 0;
  audio.play().catch(console.error);

  isPlaying = true;
  updatePlayButton();
}

// =====================
// LOCAL AUDIO – ZDARZENIA
// =====================
audio.addEventListener("loadedmetadata", () => {
  if (playbackMode !== "local") return;
  updateTimeUI(audio.currentTime, audio.duration || 0);
});

audio.addEventListener("timeupdate", () => {
  if (playbackMode !== "local") return;
  if (!audio.duration) return;
  updateTimeUI(audio.currentTime, audio.duration);
});

audio.addEventListener("play", () => {
  if (playbackMode !== "local") return;
  isPlaying = true;
  updatePlayButton();
});

audio.addEventListener("pause", () => {
  if (playbackMode !== "local") return;
  isPlaying = false;
  updatePlayButton();
});

audio.addEventListener("ended", () => {
  if (playbackMode !== "local") return;
  if (!audio.loop) {
    playNextTrack();
  }
});

// =====================
// PLAY / PAUSE – GŁÓWNY PRZYCISK
// =====================
playToggle.addEventListener("click", () => {
  if (playbackMode === "sc") {
    if (!scWidget) return;
    // NA WSZELKI WYPADEK zawsze zatrzymaj lokalne audio,
    // gdy kontrolujemy widget
    if (!audio.paused) {
      audio.pause();
    }
    scWidget.isPaused((paused) => {
      if (paused) {
        scWidget.play();
      } else {
        scWidget.pause();
      }
    });
    return;
  }

  // LOCAL
  if (!audio.src) return;

  if (audio.paused) {
    audio.play().catch(console.error);
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  updatePlayButton();
});

// =====================
// PROGRESSBAR – SEEK
// =====================
progressBar.addEventListener("click", (event) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const ratio = clickX / rect.width;

  if (playbackMode === "sc") {
    if (!scWidget || !scDuration) return;
    const targetMs = ratio * scDuration * 1000;
    scWidget.seekTo(targetMs);
    return;
  }

  if (!audio.duration) return;
  audio.currentTime = ratio * audio.duration;
});

// =====================
// VOLUME – LOCAL + SOUNDCLOUD
// =====================
function setVolumeFromRatio(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));

  audio.volume = clamped;
  volumeFill.style.width = `${clamped * 100}%`;

  if (scWidget) {
    scWidget.setVolume(clamped * 100); // 0–100
  }
}

volumeBar.addEventListener("click", (event) => {
  const rect = volumeBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const ratio = clickX / rect.width;
  setVolumeFromRatio(ratio);
});

// =====================
// LOOP / SHUFFLE (tylko lokalne audio)
// =====================
loopToggle.addEventListener("click", () => {
  audio.loop = !audio.loop;
  loopToggle.classList.toggle("active", audio.loop);
});

shuffleToggle.addEventListener("click", () => {
  isShuffle = !isShuffle;
  shuffleToggle.classList.toggle("active", isShuffle);
});

// =====================
// NEXT / PREV
// =====================
function playNextTrack() {
  if (playbackMode === "sc") {
    if (!scWidget) return;
    scWidget.next();
    return;
  }

  if (!currentTrack || !activeTrackList.length) return;

  const list = activeTrackList;
  const currentIndex = list.findIndex(t => t.id === currentTrack.id);
  if (currentIndex === -1) return;

  if (isShuffle) {
    const others = list.filter((_, idx) => idx !== currentIndex);
    const randomTrack = others[Math.floor(Math.random() * others.length)];
    setCurrentTrack(randomTrack);
    return;
  }

  const nextIndex = (currentIndex + 1) % list.length;
  setCurrentTrack(list[nextIndex]);
}

function playPrevTrack() {
  if (playbackMode === "sc") {
    if (!scWidget) return;
    scWidget.prev();
    return;
  }

  if (!currentTrack || !activeTrackList.length) return;

  const list = activeTrackList;
  const currentIndex = list.findIndex(t => t.id === currentTrack.id);
  if (currentIndex === -1) return;

  const prevIndex = (currentIndex - 1 + list.length) % list.length;
  setCurrentTrack(list[prevIndex]);
}

nextBtn.addEventListener("click", playNextTrack);
prevBtn.addEventListener("click", playPrevTrack);

// =====================
// SZUKANIE / FILTRY
// =====================
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderTracks();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    renderTracks();
  });
});

// =====================
// SOUNDCloud – FUNKCJE
// =====================
function setSoundCloudPlaylist(url) {
  if (!scWidget) return;
  if (!url) return;

  const cleaned = url.trim();
  const finalUrl = cleaned.startsWith("http")
    ? cleaned
    : "https://soundcloud.com/" + cleaned.replace(/^\/+/, "");

  scWidget.load(finalUrl, {
    auto_play: false,
    buying: false,
    sharing: false,
    download: false,
    show_artwork: true,
    show_comments: false,
    show_user: false,
    show_reposts: false,
    show_teaser: false,
    hide_related: true,
    visual: true,
    color: "#ff6f3c"
  });

  playbackMode = "sc";
  // ważne: przy przejściu na SC zawsze stop lokalne audio
  audio.pause();
  isPlaying = false;
  updatePlayButton();
}

function initSC() {
  if (!scFrame || typeof SC === "undefined") return;

  scWidget = SC.Widget(scFrame);

  scWidget.bind(SC.Widget.Events.READY, () => {
    scWidget.setVolume(audio.volume * 100);
    setSoundCloudPlaylist(DEFAULT_SC_URL);

    scWidget.getDuration((ms) => {
      scDuration = (ms || 0) / 1000;
    });
  });

  scWidget.bind(SC.Widget.Events.PLAY, () => {
    // *** FIX: kiedy SC zaczyna grać, zatrzymaj lokalne audio ***
    if (!audio.paused) {
      audio.pause();
    }

    playbackMode = "sc";
    isPlaying = true;
    updatePlayButton();

    scWidget.getCurrentSound((sound) => {
      if (!sound) return;
      playerTitle.textContent = sound.title || "SoundCloud";
      playerArtist.textContent =
        (sound.user && sound.user.username) || "SoundCloud";

      if (sound.artwork_url) {
        const big = sound.artwork_url.replace("-large", "-t500x500");
        playerThumb.style.backgroundImage = `url('${big}')`;
      } else {
        playerThumb.style.backgroundImage = "";
      }
    });

    scWidget.getDuration((ms) => {
      scDuration = (ms || 0) / 1000;
    });
  });

  scWidget.bind(SC.Widget.Events.PAUSE, () => {
    if (playbackMode !== "sc") return;
    isPlaying = false;
    updatePlayButton();
  });

  scWidget.bind(SC.Widget.Events.FINISH, () => {
    if (playbackMode !== "sc") return;
    // widget sam ogarnia kolejny track w playliście
  });

  scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => {
    if (playbackMode !== "sc") return;
    const current = (e.currentPosition || 0) / 1000;
    if (!scDuration) {
      scWidget.getDuration((ms) => {
        scDuration = (ms || 0) / 1000;
        updateTimeUI(current, scDuration);
      });
    } else {
      updateTimeUI(current, scDuration);
    }
  });
}

// =====================
// SOUNDCloud – PRZYCISK „Zmień playlistę…”
// =====================
if (changeScBtn) {
  changeScBtn.addEventListener("click", () => {
    const url = prompt("Wklej link do playlisty SoundCloud:");
    if (!url) return;
    setSoundCloudPlaylist(url);
  });
}

// =====================
// START
// =====================
window.addEventListener("DOMContentLoaded", () => {
  activeTrackList = demoTracks;
  renderTracks();
  initSC();
});