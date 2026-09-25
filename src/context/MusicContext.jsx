import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';

const MusicContext = createContext();

export const getBackendBase = () => {
  if (typeof window !== 'undefined') {
    const isNative = window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.location.port !== '5173');
    if (isNative) {
      return localStorage.getItem('suno_custom_backend') || 'https://suno-music-x6c4.onrender.com';
    }
  }
  return '';
};

export const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000];

export const EQ_PRESETS = {
  'Flat': { label: 'Flat', bands: [0, 0, 0, 0, 0], bassBoost: 0 },
  'Bass Boost': { label: 'Bass Boost', bands: [7, 5, 2, 0, -1], bassBoost: 75 },
  'Pop': { label: 'Pop', bands: [-1, 2, 5, 2, -2], bassBoost: 25 },
  'Rock': { label: 'Rock', bands: [5, 3, -1, 3, 5], bassBoost: 40 },
  'Acoustic': { label: 'Acoustic', bands: [3, 2, 1, 3, 2], bassBoost: 15 },
  'Electronic': { label: 'Electronic', bands: [6, 4, 0, 2, 5], bassBoost: 65 },
  'Vocal': { label: 'Vocal', bands: [-2, 0, 4, 3, 1], bassBoost: 10 },
  'Classical': { label: 'Classical', bands: [4, 2, -1, 2, 4], bassBoost: 15 }
};

export function MusicProvider({ children }) {
  const { currentUser, authToken } = useUser();
  const audioRef = useRef(null);
  if (!audioRef.current && typeof window !== 'undefined') {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    audioRef.current = a;
  }
  const ytPlayerRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_last_active_track');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_last_active_progress');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [duration, setDuration] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_last_active_duration');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [volume, setVolume] = useState(1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

  // ── Equalizer & Audiophile Web Audio State ──
  const [eqEnabled, setEqEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_eq_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [eqPreset, setEqPresetState] = useState(() => {
    try {
      return localStorage.getItem('suno_eq_preset') || 'Bass Boost';
    } catch {
      return 'Bass Boost';
    }
  });

  const [eqBands, setEqBandsState] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_eq_bands');
      if (saved) return JSON.parse(saved);
      return EQ_PRESETS['Bass Boost'].bands;
    } catch {
      return [7, 5, 2, 0, -1];
    }
  });

  const [bassBoost, setBassBoostState] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_bass_boost');
      return saved !== null ? parseInt(saved, 10) : 50;
    } catch {
      return 50;
    }
  });

  // ── Crossfade Playback State (0s, 2s, 4s, 6s, 8s, 12s) ──
  const [crossfadeDuration, setCrossfadeDurationState] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_crossfade_duration');
      return saved !== null ? parseInt(saved, 10) : 4;
    } catch {
      return 4;
    }
  });

  // Active playlist queue (persisted across app restarts)
  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_last_active_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [queueIndex, setQueueIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_last_active_queue_index');
      return saved ? parseInt(saved, 10) : -1;
    } catch {
      return -1;
    }
  });

  // User-scoped recently played history
  const [recentSongs, setRecentSongs] = useState([]);

  // User-scoped liked songs
  const [likedSongs, setLikedSongs] = useState([]);

  // Autoplay (Endless Smart Flow) toggle
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => {
    return localStorage.getItem('suno_autoplay_enabled') !== 'false';
  });

  // Current radio mood label (e.g. 'Divine & Bhakti', 'Sad & Heartbroken')
  const [radioMoodLabel, setRadioMoodLabel] = useState('');

  // Global Unified Playlist Modal state
  const [activePlaylistModal, setActivePlaylistModal] = useState(null);

  const openPlaylist = (playlistData) => {
    setActivePlaylistModal(playlistData);
  };

  const closePlaylist = () => {
    setActivePlaylistModal(null);
  };

  // Sleep Timer state (persisted globally across player minimize, page transitions, and background)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(null); // in seconds
  const [sleepTimerMode, setSleepTimerMode] = useState(null); // 'minutes' | 'end-of-song' | null
  const [selectedTimerOption, setSelectedTimerOption] = useState(null);
  const initialTimerTrackIdRef = useRef(null);

  const isAdvancingTrackRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const playedCanonicalTitlesRef = useRef(new Set());
  const accumulatedListenSecondsRef = useRef(0);
  const recordedTrackIdRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const skippedArtistsRef = useRef([]);
  const playRequestIdRef = useRef(0);
  const lastEndedTrackIdRef = useRef(null);
  const lastPlayNextTimeRef = useRef(0);
  const lastPlayPrevTimeRef = useRef(0);

  // Persistent refs to always provide latest values to native event listeners & background callbacks
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const autoplayEnabledRef = useRef(autoplayEnabled);
  const recentSongsRef = useRef(recentSongs);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { autoplayEnabledRef.current = autoplayEnabled; }, [autoplayEnabled]);
  useEffect(() => { recentSongsRef.current = recentSongs; }, [recentSongs]);

  const playNextRef = useRef();
  const playPrevRef = useRef();
  const handleSongEndedRef = useRef();
  const seekToRef = useRef();
  const togglePlayRef = useRef();

  // Web Audio Graph Refs for 5-Band EQ & Bass Boost
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const filterNodesRef = useRef([]);
  const bassBoostNodeRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const crossfadeTriggeredRef = useRef(false);

  const eqBandsRef = useRef(eqBands);
  const bassBoostRef = useRef(bassBoost);
  const eqEnabledRef = useRef(eqEnabled);
  const crossfadeDurationRef = useRef(crossfadeDuration);

  useEffect(() => { eqBandsRef.current = eqBands; }, [eqBands]);
  useEffect(() => { bassBoostRef.current = bassBoost; }, [bassBoost]);
  useEffect(() => { eqEnabledRef.current = eqEnabled; }, [eqEnabled]);
  useEffect(() => { crossfadeDurationRef.current = crossfadeDuration; }, [crossfadeDuration]);

  // Initialize Web Audio Graph once user interacts with playback or EQ
  const initAudioGraph = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audio = audioRef.current;
      if (!audio) return;

      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Ensure CORS is set on the audio element so Web Audio node is never tainted
        if (audio.crossOrigin !== 'anonymous') {
          const currentSrc = audio.src;
          const prevTime = audio.currentTime;
          const wasPlaying = !audio.paused;
          audio.crossOrigin = 'anonymous';
          if (currentSrc) {
            audio.src = currentSrc;
            if (prevTime) audio.currentTime = prevTime;
            if (wasPlaying) audio.play().catch(() => {});
          }
        }

        // 1. Bass boost node (Lowshelf at 80Hz)
        const bassNode = ctx.createBiquadFilter();
        bassNode.type = 'lowshelf';
        bassNode.frequency.setValueAtTime(80, ctx.currentTime);
        const initialBassGain = eqEnabledRef.current ? (bassBoostRef.current / 100) * 12 : 0;
        bassNode.gain.setValueAtTime(initialBassGain, ctx.currentTime);
        bassBoostNodeRef.current = bassNode;

        // 2. 5-band EQ filters
        const filterTypes = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
        const filters = EQ_FREQUENCIES.map((freq, idx) => {
          const f = ctx.createBiquadFilter();
          f.type = filterTypes[idx];
          f.frequency.setValueAtTime(freq, ctx.currentTime);
          f.Q.setValueAtTime(1.4, ctx.currentTime);
          const gain = eqEnabledRef.current ? (eqBandsRef.current[idx] || 0) : 0;
          f.gain.setValueAtTime(gain, ctx.currentTime);
          return f;
        });
        filterNodesRef.current = filters;

        // 3. Master gain node (volume & crossfade ramping)
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
        masterGainNodeRef.current = masterGain;

        // 4. Connect source safely
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = ctx.createMediaElementSource(audio);
        }

        let curr = sourceNodeRef.current;
        curr.connect(bassNode);
        curr = bassNode;

        for (const filter of filters) {
          curr.connect(filter);
          curr = filter;
        }

        curr.connect(masterGain);
        masterGain.connect(ctx.destination);
      }

      // Resume AudioContext if suspended
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch (err) {
      console.warn('Web Audio Graph init error:', err?.message || err);
    }
  }, []);

  const setEqBand = useCallback((bandIndex, value) => {
    initAudioGraph();
    setEqBandsState(prev => {
      const next = [...prev];
      next[bandIndex] = value;
      try { localStorage.setItem('suno_eq_bands', JSON.stringify(next)); } catch (_) {}
      return next;
    });
    setEqPresetState('Custom');
    try { localStorage.setItem('suno_eq_preset', 'Custom'); } catch (_) {}

    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (filterNodesRef.current && filterNodesRef.current[bandIndex] && Number.isFinite(value)) {
        const now = audioCtxRef.current.currentTime;
        filterNodesRef.current[bandIndex].gain.setTargetAtTime(
          eqEnabledRef.current ? value : 0,
          now,
          0.02
        );
      }
    }
  }, [initAudioGraph]);

  const setEqPreset = useCallback((presetName) => {
    initAudioGraph();
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;

    setEqPresetState(presetName);
    try { localStorage.setItem('suno_eq_preset', presetName); } catch (_) {}

    setEqBandsState(preset.bands);
    try { localStorage.setItem('suno_eq_bands', JSON.stringify(preset.bands)); } catch (_) {}

    setBassBoostState(preset.bassBoost);
    try { localStorage.setItem('suno_bass_boost', preset.bassBoost.toString()); } catch (_) {}

    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      const now = audioCtxRef.current.currentTime;
      if (filterNodesRef.current && filterNodesRef.current.length) {
        filterNodesRef.current.forEach((filter, idx) => {
          if (filter) {
            filter.gain.setTargetAtTime(
              eqEnabledRef.current ? (preset.bands[idx] || 0) : 0,
              now,
              0.02
            );
          }
        });
      }
      if (bassBoostNodeRef.current) {
        const bassGain = eqEnabledRef.current ? (preset.bassBoost / 100) * 12 : 0;
        bassBoostNodeRef.current.gain.setTargetAtTime(bassGain, now, 0.02);
      }
    }
  }, [initAudioGraph]);

  const setBassBoost = useCallback((val) => {
    initAudioGraph();
    setBassBoostState(val);
    try { localStorage.setItem('suno_bass_boost', val.toString()); } catch (_) {}
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (bassBoostNodeRef.current && Number.isFinite(val)) {
        const now = audioCtxRef.current.currentTime;
        const gain = eqEnabledRef.current ? (val / 100) * 12 : 0;
        bassBoostNodeRef.current.gain.setTargetAtTime(gain, now, 0.02);
      }
    }
  }, [initAudioGraph]);

  const toggleEq = useCallback((enabled) => {
    initAudioGraph();
    setEqEnabled(enabled);
    try { localStorage.setItem('suno_eq_enabled', enabled ? 'true' : 'false'); } catch (_) {}

    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      const now = audioCtxRef.current.currentTime;
      if (filterNodesRef.current && filterNodesRef.current.length) {
        filterNodesRef.current.forEach((filter, idx) => {
          if (filter) {
            filter.gain.setTargetAtTime(
              enabled ? (eqBandsRef.current[idx] || 0) : 0,
              now,
              0.02
            );
          }
        });
      }
      if (bassBoostNodeRef.current) {
        const bassGain = enabled ? (bassBoostRef.current / 100) * 12 : 0;
        bassBoostNodeRef.current.gain.setTargetAtTime(bassGain, now, 0.02);
      }
    }
  }, [initAudioGraph]);

  const setCrossfadeDuration = useCallback((seconds) => {
    const val = Number(seconds);
    setCrossfadeDurationState(val);
    try { localStorage.setItem('suno_crossfade_duration', val.toString()); } catch (_) {}
  }, []);

  // Restore user-scoped state & track when logged-in user changes
  useEffect(() => {
    if (!currentUser?.id) {
      setRecentSongs([]);
      setLikedSongs([]);
      setCurrentTrack(null);
      setQueue([]);
      setQueueIndex(-1);
      setCurrentTime(0);
      return;
    }

    const userHistoryKey = `suno_recent_history_${currentUser.id}`;
    const userLikesKey = `suno_liked_songs_${currentUser.id}`;
    const userTrackKey = `suno_last_track_${currentUser.id}`;
    const userQueueKey = `suno_last_queue_${currentUser.id}`;
    const userProgressKey = `suno_last_progress_${currentUser.id}`;

    let cachedHistory = [];
    let cachedLikes = [];
    try {
      const savedH = localStorage.getItem(userHistoryKey);
      if (savedH) cachedHistory = JSON.parse(savedH);
    } catch { }
    try {
      const savedL = localStorage.getItem(userLikesKey);
      if (savedL) cachedLikes = JSON.parse(savedL);
    } catch { }

    setRecentSongs(cachedHistory);
    setLikedSongs(cachedLikes);

    // Restore THIS user's last playing song in miniplayer.
    // IMPORTANT: No fallback to the shared global keys — that would bleed
    // another account's currently-playing track into this account's miniplayer.
    try {
      const savedTrack = localStorage.getItem(userTrackKey);
      if (savedTrack) {
        const parsedT = JSON.parse(savedTrack);
        setCurrentTrack(parsedT);
        if (parsedT?.duration) setDuration(parsedT.duration);
      } else {
        // New account or first login — clear any leftover track from previous user
        setCurrentTrack(null);
        setQueue([]);
        setQueueIndex(-1);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
      }

      const savedQ = localStorage.getItem(userQueueKey);
      if (savedQ) setQueue(JSON.parse(savedQ));

      const savedP = localStorage.getItem(userProgressKey);
      if (savedP) setCurrentTime(parseFloat(savedP));
    } catch (e) {
      console.warn('Failed to restore last active song:', e);
    }

    // Fetch cloud library from MySQL
    if (authToken) {
      fetch('/api/user/library', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(res => (res.ok ? res.json() : null))
        .then(libData => {
          if (libData) {
            if (Array.isArray(libData.history)) {
              setRecentSongs(libData.history);
              localStorage.setItem(userHistoryKey, JSON.stringify(libData.history));
            }
            if (Array.isArray(libData.likedSongs)) {
              setLikedSongs(libData.likedSongs);
              localStorage.setItem(userLikesKey, JSON.stringify(libData.likedSongs));
            }
          }
        })
        .catch(e => console.warn('Failed to load user library from MySQL:', e));
    }
  }, [currentUser?.id, authToken]);

  // Canonical normalizer to strictly prevent duplicates and repeats
  const getCanonicalTitle = (str) => {
    if (!str) return '';
    let s = String(str).toLowerCase();
    // Strip parenthesized and bracketed content
    s = s.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ');

    // Remove common YouTube and label prefixes
    s = s.replace(/^(full\s*(song|video|audio)?|video\s*song|lyrical(\s*video)?|official\s*(video|audio|music\s*video|track)?|audio|song|t-series|zee music)\s*[:|\-–—]\s*/gi, ' ');

    // If there are delimiters, pick the most relevant song title segment
    const parts = s.split(/[:|\-–—]/).map(p => p.trim()).filter(Boolean);
    const junkWords = /^(official|video|audio|full|song|lyric|lyrical|t-series|zee music|music video|cover|remix|hd|4k|mp3|film version)$/i;
    let best = '';
    for (const part of parts) {
      const cleaned = part.replace(/\b(official\s*(video|audio|music\s*video|lyric.*|full.*|track)|full\s*(song|video|audio)|video\s*song|lyric(al)?\s*(video|song)?|audio\s*song|song|audio|video)\b/gi, '').trim();
      if (cleaned.length >= 2 && !junkWords.test(cleaned)) {
        best = cleaned;
        break;
      }
    }
    if (!best && parts.length > 0) best = parts[0];

    return best.replace(/[^a-z0-9]/gi, '').toLowerCase().trim();
  };

  // Only seed the immediate last 2 tracks from history to prevent instant replay
  useEffect(() => {
    if (Array.isArray(recentSongs)) {
      for (const s of recentSongs.slice(0, 2)) {
        const norm = getCanonicalTitle(s?.title);
        if (norm) playedCanonicalTitlesRef.current.add(norm);
      }
    }
  }, [recentSongs]);

  const recordRecentSong = (track) => {
    if (!track || !track.id) return;
    const norm = getCanonicalTitle(track.title);
    if (norm) playedCanonicalTitlesRef.current.add(norm);
    setRecentSongs(prev => {
      const filtered = prev.filter(s => s.id !== track.id && getCanonicalTitle(s.title) !== norm);
      const updated = [track, ...filtered].slice(0, 50);
      if (currentUser?.id) {
        localStorage.setItem(`suno_recent_history_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    // Record listen event in MySQL for this user
    if (authToken && currentUser?.id) {
      fetch('/api/user/listen-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ song: track, completed: true })
      }).catch(() => { });
    }
  };

  // 45-Second Listening Threshold: Only add to recent history / Jump Back In after 45s of active listening
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    if (currentTime >= 45 && recordedTrackIdRef.current !== currentTrack.id) {
      recordedTrackIdRef.current = currentTrack.id;
      recordRecentSong(currentTrack);
      return;
    }

    const interval = setInterval(() => {
      accumulatedListenSecondsRef.current += 1;
      const hasListened45s = accumulatedListenSecondsRef.current >= 45 || currentTime >= 45;
      if (hasListened45s && recordedTrackIdRef.current !== currentTrack.id) {
        recordedTrackIdRef.current = currentTrack.id;
        recordRecentSong(currentTrack);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, currentTime]);

  const deduplicateQueue = (songList) => {
    if (!Array.isArray(songList)) return [];
    const seenTitles = new Set();
    const seenIds = new Set();
    const deduped = [];
    for (const s of songList) {
      if (!s || !s.title) continue;
      if (s.id && seenIds.has(s.id)) continue;
      const norm = getCanonicalTitle(s.title);
      if (!norm) continue;
      if (norm.length >= 3 && seenTitles.has(norm)) {
        continue;
      }
      if (s.id) seenIds.add(s.id);
      seenTitles.add(norm);
      deduped.push(s);
    }
    return deduped;
  };

  useEffect(() => {
    if (currentUser?.id) {
      const list = JSON.stringify(recentSongs.slice(0, 50));
      localStorage.setItem(`suno_recent_history_${currentUser.id}`, list);
    }
  }, [recentSongs, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('suno_autoplay_enabled', autoplayEnabled ? 'true' : 'false');
  }, [autoplayEnabled]);

  const toggleAutoplay = () => {
    setAutoplayEnabled(prev => !prev);
  };

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`suno_liked_songs_${currentUser.id}`, JSON.stringify(likedSongs));
    }
  }, [likedSongs, currentUser?.id]);

  // Persist current track across page reloads and app closes
  useEffect(() => {
    if (currentTrack) {
      const trackJson = JSON.stringify(currentTrack);
      localStorage.setItem('suno_last_active_track', trackJson);
      if (currentUser?.id) {
        localStorage.setItem(`suno_last_track_${currentUser.id}`, trackJson);
      }
    }
  }, [currentTrack, currentUser?.id]);

  // Persist queue and active queue index
  useEffect(() => {
    if (queue && queue.length > 0) {
      const queueJson = JSON.stringify(queue);
      localStorage.setItem('suno_last_active_queue', queueJson);
      localStorage.setItem('suno_last_active_queue_index', queueIndex.toString());
      if (currentUser?.id) {
        localStorage.setItem(`suno_last_queue_${currentUser.id}`, queueJson);
      }
    }
  }, [queue, queueIndex, currentUser?.id]);

  // Persist playback progress (throttled)
  useEffect(() => {
    if (currentTime > 0 && Math.abs(currentTime - lastSavedTimeRef.current) >= 1) {
      lastSavedTimeRef.current = currentTime;
      localStorage.setItem('suno_last_active_progress', currentTime.toString());
      if (currentUser?.id) {
        localStorage.setItem(`suno_last_progress_${currentUser.id}`, currentTime.toString());
      }
    }
    if (duration > 0) {
      localStorage.setItem('suno_last_active_duration', duration.toString());
    }
  }, [currentTime, duration, currentUser?.id]);

  // Audio event listeners for standard audio streams (stable references to avoid stale closure / reattachment bugs)
  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';

    const onTimeUpdate = () => {
      const isIframeYt = currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl;
      if (!isIframeYt) {
        const cTime = audio.currentTime;

        setCurrentTime(cTime);
        currentTimeRef.current = cTime;

        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          durationRef.current = audio.duration;

          syncNativeNotification({
            duration: audio.duration
          });

          // Reset crossfade flag at start of track
          if (cTime < 2) {
            crossfadeTriggeredRef.current = false;
          }

          const xfadeSec = crossfadeDurationRef.current || 0;
          if (
            audio.duration > 8 &&
            xfadeSec > 0 &&
            cTime >= audio.duration - xfadeSec &&
            !crossfadeTriggeredRef.current &&
            !isAdvancingTrackRef.current &&
            !audio.paused
          ) {
            crossfadeTriggeredRef.current = true;
            // Smoothly ramp gain down for crossfade
            if (audioCtxRef.current && masterGainNodeRef.current) {
              masterGainNodeRef.current.gain.setTargetAtTime(
                0.01,
                audioCtxRef.current.currentTime,
                xfadeSec / 3
              );
            }
            handleSongEndedRef.current?.();
          } else if (
            audio.duration > 5 &&
            cTime >= audio.duration - 0.35 &&
            !audio.paused &&
            !audio.ended &&
            !isAdvancingTrackRef.current
          ) {
            handleSongEndedRef.current?.();
          }
        }
      }
    };

    const onLoadedMetadata = () => {
      const isIframeYt = currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl;
      if (!isIframeYt) {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          durationRef.current = audio.duration;
        }
      }
    };

    const onPlay = () => {
      const isIframeYt = currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl;
      if (!isIframeYt) {
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    };

    const onPause = () => {
      const isIframeYt = currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl;
      if (!isIframeYt) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    const onEnded = () => {
      const isIframeYt = currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl;
      if (!isIframeYt && !isAdvancingTrackRef.current) {
        handleSongEndedRef.current?.();
      }
    };

    const onError = (e) => {
      console.warn('Audio playback error:', e);
      // Only auto-skip if audio was actively playing and NOT currently advancing or switching tracks
      if (isPlayingRef.current && !isAdvancingTrackRef.current) {
        setTimeout(() => {
          if (isPlayingRef.current && !isAdvancingTrackRef.current) {
            handleSongEndedRef.current?.();
          }
        }, 500);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // MediaSession Action Handlers (Registered once on mount with dynamic ref delegation)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl) {
          ytPlayerRef.current?.playVideo();
        } else {
          audioRef.current.play().catch(() => { });
        }
        setIsPlaying(true);
        isPlayingRef.current = true;
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl) {
          ytPlayerRef.current?.pauseVideo();
        } else {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        isPlayingRef.current = false;
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevRef.current?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNextRef.current?.();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekToRef.current?.(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession setup failed:', err);
    }
  }, []);

  // Update MediaSession metadata when currentTrack changes
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Suno: For You',
        artwork: [
          { src: currentTrack.image || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (err) {
      console.warn('MediaSession metadata update failed:', err);
    }
  }, [currentTrack?.id, currentTrack?.title]);

  // Sync playbackState to browser / OS MediaSession
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Sync position state to MediaSession for live scrubber on Android 13+ & Lockscreen
  // Helper to sync native Android notification and MediaSession
  // ALWAYS reads from refs so it never captures stale closure values
  const syncNativeNotification = (overrides = {}) => {
    const MusicNotification = window.Capacitor?.Plugins?.MusicNotification;
    if (!MusicNotification) return;
    const track = currentTrackRef.current;
    MusicNotification.updatePlayback({
      title: track?.title || 'Unknown Title',
      artist: track?.artist || 'Unknown Artist',
      album: track?.album || 'Suno: For You',
      imageUrl: track?.image || '',
      isPlaying: Boolean(isPlayingRef.current),
      duration: Math.floor((overrides.duration !== undefined ? overrides.duration : durationRef.current) || 0),
      currentTime: Math.floor((overrides.currentTime !== undefined ? overrides.currentTime : currentTimeRef.current) || 0)
    }).catch(err => console.warn('Native MusicNotification update failed:', err));
  };

  // Keep a stable ref to syncNativeNotification so interval/visibility handlers always call the latest version
  const syncNativeNotificationRef = useRef(syncNativeNotification);
  useEffect(() => { syncNativeNotificationRef.current = syncNativeNotification; });



  // Listen to Lock Screen, Dynamic Island, and Notification Actions from Android Native
  useEffect(() => {
    const MusicNotification = window.Capacitor?.Plugins?.MusicNotification;
    if (!MusicNotification) return;

    let removeListener = null;
    try {
      const listenerRes = MusicNotification.addListener('mediaAction', (data) => {
        if (!data || !data.action) return;
        if (data.action === 'play') {
          if (audioRef.current?.paused) audioRef.current.play().catch(() => { });
          setIsPlaying(true);
          isPlayingRef.current = true;
        } else if (data.action === 'pause') {
          if (!audioRef.current?.paused) audioRef.current.pause();
          setIsPlaying(false);
          isPlayingRef.current = false;
        } else if (data.action === 'next') {
          playNextRef.current?.();
        } else if (data.action === 'prev') {
          playPrevRef.current?.();
        } else if (data.action === 'seek' && data.position !== undefined) {
          seekToRef.current?.(data.position);
        }
      });
      if (listenerRes && typeof listenerRes.then === 'function') {
        listenerRes.then((handle) => {
          if (handle && handle.remove) removeListener = handle.remove;
        }).catch(() => { });
      } else if (listenerRes && typeof listenerRes.remove === 'function') {
        removeListener = () => listenerRes.remove();
      }
    } catch (err) {
      console.warn('MusicNotification listener error:', err);
    }

    return () => {
      if (typeof removeListener === 'function') {
        try { removeListener(); } catch (_) { }
      }
    };
  }, []);

  // ─── Reliable 1-second notification sync interval ────────────────────────────
  // Pushes currentTime + isPlaying state to the native notification every second
  // so the lock-screen scrubber and notification controls stay in perfect sync
  // with the in-app player regardless of React render cycles.
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTrackRef.current && isPlayingRef.current) {
        syncNativeNotificationRef.current();
        // Also keep browser MediaSession position state fresh (Android 13+ scrubber)
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          try {
            const dur = durationRef.current;
            const pos = currentTimeRef.current;
            if (dur > 0 && pos >= 0 && pos <= dur) {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: 1,
                position: pos
              });
            }
          } catch (_) { }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Background / lock-screen song-end watchdog ──────────────────────────────
  // When the user minimizes the app or locks the phone, the browser may throttle
  // JS timers so the normal 'ended' event / 0.35s watchdog never fires.
  // When the page becomes visible again we check whether audio has already
  // finished and advance the queue if so.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const track = currentTrackRef.current;
      if (!track) return;

      if (track.source === 'youtube' && !track.streamUrl) {
        // YouTube: check player state — 0 = ENDED
        try {
          const ytState = ytPlayerRef.current?.getPlayerState?.();
          if (ytState === 0) {
            handleSongEndedRef.current?.();
          } else if (ytState === 1) {
            // Still playing — update notification so UI re-syncs
            syncNativeNotificationRef.current();
          }
        } catch (_) { }
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - 0.5)) {
          // Song ended while we were backgrounded — advance to next track
          handleSongEndedRef.current?.();
        } else if (!audio.paused && isPlayingRef.current) {
          // Audio is still playing — push fresh position to notification & MediaSession
          syncNativeNotificationRef.current();
        } else if (audio.paused && isPlayingRef.current) {
          // Audio unexpectedly paused in background (OS media focus loss) — resume
          audio.play().catch(() => {
            syncNativeNotificationRef.current();
          });
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Helper to pre-resolve stream URLs in background so transition between tracks is seamless
  const resolveTrackStreamUrl = async (track) => {
    if (!track || track.streamUrl) return track;
    try {
      const q = encodeURIComponent(`${track.title} ${track.artist || ''}`);
      const resolveRes = await fetch(`/api/search?q=${q}`);
      const resolveData = await resolveRes.json();
      if (resolveData.results && resolveData.results.length > 0) {
        const found = resolveData.results[0];
        return {
          ...found,
          ...track, // Keep original track identity (id, album, etc.)
          id: track.id, // Explicitly preserve track.id so queue indexes never break
          streamUrl: found.streamUrl,
          duration: found.duration || track.duration,
          image: track.image || found.image,
          source: 'saavn',
          saavnId: found.id
        };
      }
      if (!track.youtubeId) {
        const ytRes = await fetch(`/api/yt-search?q=${q}`);
        const ytData = await ytRes.json();
        if (ytData.results && ytData.results.length > 0) {
          const ytFound = ytData.results[0];
          return {
            ...track,
            youtubeId: ytFound.youtubeId,
            source: 'youtube'
          };
        }
      }
    } catch (e) {
      console.warn('Track pre-resolution failed:', e);
    }
    return track;
  };

  const getProxiedAudioUrl = (streamUrl) => {
    if (!streamUrl) return '';
    const base = getBackendBase();
    return `${base}/api/audio?url=${encodeURIComponent(streamUrl)}`;
  };

  const getResolvedAudioUrl = (streamUrl) => {
    if (!streamUrl) return '';
    const base = getBackendBase();
    // Relative endpoints (e.g. /api/...) need backend base in native WebView
    if (streamUrl.startsWith('/')) {
      return `${base}${streamUrl}`;
    }
    // High-speed Akamai CDN audio (e.g. https://aac.saavncdn.com/...) streams DIRECTLY for instant <100ms playback!
    return streamUrl;
  };

  const resolveYouTubeTrack = async (track) => {
    if (!track) return null;
    try {
      const q = encodeURIComponent(`${track.title} ${track.artist || ''}`);
      const ytRes = await fetch(`/api/yt-search?q=${q}`);
      const ytData = await ytRes.json();
      return ytData.results?.[0] ? { ...track, ...ytData.results[0] } : null;
    } catch (error) {
      console.warn('YouTube fallback lookup failed:', error);
      return null;
    }
  };

  // Play a specific song (handles both YouTube, direct CDN audio, and auto-resolving Spotify tracks)
  const playSong = async (song, newQueue = null, options = {}) => {
    if (!song) return;
    const currentRequestId = ++playRequestIdRef.current;
    lastEndedTrackIdRef.current = null;

    // Prioritize Studio 320k direct master audio streams over YouTube embeds
    let activeSong = song;
    if (!activeSong.streamUrl) {
      activeSong = await resolveTrackStreamUrl(activeSong);
      if (currentRequestId !== playRequestIdRef.current) return;
    }

    // Register into anti-repeat memory window (tracks last 150 songs in this session)
    const activeNorm = getCanonicalTitle(activeSong.title);
    if (activeNorm) {
      playedCanonicalTitlesRef.current.add(activeNorm);
      if (playedCanonicalTitlesRef.current.size > 25) {
        const first = playedCanonicalTitlesRef.current.values().next().value;
        playedCanonicalTitlesRef.current.delete(first);
      }
    }

    const isExplicitPlaylist = Boolean(options.isPlaylist || options.isQueueAdvance);
    let targetQueue = queueRef.current || [];

    if (isExplicitPlaylist) {
      // User is playing an explicit structured playlist, liked songs list, or advancing in existing queue
      if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
        targetQueue = deduplicateQueue(newQueue);
        setQueue(targetQueue);
        queueRef.current = targetQueue;
        if (!options.isFromSearch) {
          setRadioMoodLabel('');
        }
      }

      let resolvedIndex = typeof options.advanceIndex === 'number' && options.advanceIndex >= 0 && options.advanceIndex < targetQueue.length
        ? options.advanceIndex
        : -1;

      if (resolvedIndex === -1) {
        const normTitle = getCanonicalTitle(activeSong.title);
        const idxById = targetQueue.findIndex(s => s.id === activeSong.id || (song?.id && s.id === song.id));
        const idxByTitle = idxById !== -1 ? idxById : targetQueue.findIndex(s => getCanonicalTitle(s.title) === normTitle);
        resolvedIndex = idxByTitle !== -1 ? idxByTitle : 0;
      }
      setQueueIndex(resolvedIndex);
      queueIndexRef.current = resolvedIndex;
      if (targetQueue[resolvedIndex]) {
        targetQueue[resolvedIndex] = activeSong;
        queueRef.current = targetQueue;
      }
    } else {
      // User clicked an INDIVIDUAL song (from Search, Home shelf, Discover, Artist page, etc.)
      // 1. Build an immediate full queue from the current view/shelf without arbitrary truncation
      let baseList = [];
      if (Array.isArray(newQueue) && newQueue.length > 1) {
        const normTitle = getCanonicalTitle(activeSong.title);
        const clickedIdx = newQueue.findIndex(s => s?.id === activeSong.id || (song?.id && s?.id === song.id) || getCanonicalTitle(s?.title) === normTitle);
        if (clickedIdx !== -1) {
          const after = newQueue.slice(clickedIdx);
          const before = newQueue.slice(0, clickedIdx);
          baseList = [...after, ...before];
        } else {
          baseList = [activeSong, ...newQueue.filter(s => s?.id !== activeSong.id && s?.id !== song?.id)];
        }
      } else {
        baseList = [activeSong];
      }
      targetQueue = deduplicateQueue(baseList);
      setQueue(targetQueue);
      queueRef.current = targetQueue;
      setQueueIndex(0);
      queueIndexRef.current = 0;

      // 2. Concurrently fetch smart mood & genre radio to append to the queue for endless variety
      const userHistorySlice = (recentSongsRef.current || recentSongs || []).slice(0, 20);

      fetch('/api/radio/similar-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedSong: activeSong,
          candidateTracks: [],
          recentSongs: userHistorySlice,
          playedTitles: Array.from(playedCanonicalTitlesRef.current)
        })
      })
        .then(res => res.json())
        .then(data => {
          const smartSongs = data.songs || [];
          if (smartSongs.length > 0) {
            setQueue(prevQ => {
              const activeT = currentTrackRef.current || activeSong;
              const existingIds = new Set(prevQ.map(s => s?.id));
              const existingTitles = new Set(prevQ.map(s => getCanonicalTitle(s?.title)));
              const unplayedSmart = smartSongs.filter(s =>
                s &&
                !existingIds.has(s.id) &&
                !existingTitles.has(getCanonicalTitle(s.title)) &&
                !playedCanonicalTitlesRef.current.has(getCanonicalTitle(s.title))
              );
              if (unplayedSmart.length === 0) return prevQ;
              const combined = deduplicateQueue([...prevQ, ...unplayedSmart]);
              queueRef.current = combined;
              const newIdx = combined.findIndex(s => s.id === activeT?.id);
              const validIdx = newIdx !== -1 ? newIdx : 0;
              setQueueIndex(validIdx);
              queueIndexRef.current = validIdx;
              return combined;
            });
          }
          if (data.moodLabel) {
            setRadioMoodLabel(data.moodLabel);
          }
        })
        .catch(err => {
          console.warn('Smart mood queue fetch failed:', err);
        });
    }

    const resolvedIndex = queueIndexRef.current;

    setCurrentTrack(activeSong);
    currentTrackRef.current = activeSong;

    setCurrentTime(0);
    currentTimeRef.current = 0;
    accumulatedListenSecondsRef.current = 0;
    recordedTrackIdRef.current = null;
    if (activeSong.duration) {
      setDuration(activeSong.duration);
      durationRef.current = activeSong.duration;
    }

    // Proactive lookahead: If queue is running low, pre-fetch upcoming tracks
    if (autoplayEnabledRef.current && targetQueue.length - resolvedIndex <= 3) {
      prefetchAutoplayTracks(activeSong);
    }

    // Proactive stream pre-resolution: resolve the next upcoming song in advance
    const nextCandidate = targetQueue[resolvedIndex + 1];
    if (nextCandidate && !nextCandidate.streamUrl) {
      resolveTrackStreamUrl(nextCandidate).then(resolved => {
        if (resolved && resolved.streamUrl) {
          setQueue(prevQ => {
            const copy = [...prevQ];
            const cIdx = copy.findIndex(s => s.id === resolved.id);
            if (cIdx !== -1) {
              copy[cIdx] = resolved;
              queueRef.current = copy;
            }
            return copy;
          });
        }
      }).catch(() => { });
    }

    crossfadeTriggeredRef.current = false;
    if (audioCtxRef.current && masterGainNodeRef.current) {
      try {
        masterGainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        masterGainNodeRef.current.gain.setValueAtTime(1.0, audioCtxRef.current.currentTime);
      } catch (_) {}
    }

    if (activeSong.streamUrl) {
      // 1. Direct Lossless Studio 320k CDN Playback
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      const targetVol = 1.0;
      try {
        const audio = audioRef.current;
        if (audio) {
          audio.crossOrigin = 'anonymous';
        }
        initAudioGraph();

        // Use the same-origin proxy first. Some browsers reject Saavn's
        // audio/mp4 CDN response even though the URL is otherwise valid.
        const directUrl = activeSong.streamUrl;
        const playbackUrl = getResolvedAudioUrl(directUrl);

        audio.pause();
        audio.src = playbackUrl;
        audio.currentTime = 0;
        audio.volume = targetVol;
        audio.load();

        if (currentRequestId !== playRequestIdRef.current) return;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        if (currentRequestId !== playRequestIdRef.current) return;
        setIsPlaying(true);
        isPlayingRef.current = true;
      } catch (err) {
        // A newer song was clicked or playback was deliberately paused — abort cleanly without error or fallback
        if (
          err?.name === 'AbortError' ||
          err?.message?.includes('interrupted by a call to pause') ||
          currentRequestId !== playRequestIdRef.current
        ) {
          return;
        }

        console.warn('Audio playback failed, trying fallback:', err?.message || err);

        // Retry with alternate stream URL before resolving a different track or falling back to YouTube.
        if (!options.proxyRetry) {
          try {
            const audio = audioRef.current;
            if (audio) {
              audio.crossOrigin = 'anonymous';
            }
            const currentSrc = audio?.src || '';
            const isProxied = currentSrc.includes('/api/audio?url=');
            const retryUrl = isProxied ? activeSong.streamUrl : getProxiedAudioUrl(activeSong.streamUrl);
            audio.pause();
            audio.src = retryUrl;
            audio.currentTime = 0;
            audio.volume = targetVol;
            audio.load();

            if (currentRequestId !== playRequestIdRef.current) return;

            const proxyPlayPromise = audio.play();
            if (proxyPlayPromise !== undefined) await proxyPlayPromise;
            if (currentRequestId !== playRequestIdRef.current) return;
            setIsPlaying(true);
            isPlayingRef.current = true;
            return;
          } catch (proxyError) {
            if (
              proxyError?.name === 'AbortError' ||
              proxyError?.message?.includes('interrupted by a call to pause') ||
              currentRequestId !== playRequestIdRef.current
            ) {
              return;
            }
            console.warn('Audio alternate playback failed:', proxyError?.message || proxyError);
          }
        }

        // The existing stream URL may be expired or invalid.
        // Re-resolve it once instead of repeatedly trying the broken URL.
        if (!options.streamRetry) {
          if (currentRequestId !== playRequestIdRef.current) return;
          try {
            const youtubeTrack = await resolveYouTubeTrack(activeSong);
            if (currentRequestId !== playRequestIdRef.current) return;
            if (youtubeTrack?.youtubeId) {
              return playSong(
                youtubeTrack,
                newQueue || queueRef.current,
                { ...options, proxyRetry: true, streamRetry: true }
              );
            }
          } catch (retryError) {
            console.warn('Stream refresh failed:', retryError);
          }
        }

        console.warn('Track playback unrecoverable, auto-skipping to next song...');
        if (currentRequestId === playRequestIdRef.current) {
          setTimeout(() => {
            if (currentRequestId === playRequestIdRef.current) {
              playNextRef.current?.();
            }
          }, 600);
        }
      }
    } else if (activeSong.source === 'youtube' || activeSong.youtubeId) {
      if (currentRequestId !== playRequestIdRef.current) return;
      // 2. Fallback to YouTube Player only when direct stream is unavailable
      audioRef.current.pause();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(activeSong.youtubeId);
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  // Autoplay prefetch: smart mood & genre radio continuity
  const prefetchAutoplayTracks = async (seed) => {
    if (!autoplayEnabledRef.current || isPrefetchingRef.current || !seed) return;
    isPrefetchingRef.current = true;

    try {
      const userHistory = (recentSongsRef.current || recentSongs || []).slice(0, 20);
      const res = await fetch('/api/radio/similar-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedSong: seed,
          recentSongs: userHistory,
          playedTitles: Array.from(playedCanonicalTitlesRef.current)
        })
      });
      const data = await res.json();
      const songs = data.songs || [];

      if (songs.length > 0) {
        setQueue(prevQueue => {
          const existingIds = new Set(prevQueue.map(s => s.id));
          const existingTitles = new Set(prevQueue.map(s => getCanonicalTitle(s.title)));

          const toAdd = songs.filter(s =>
            s &&
            s.id !== seed.id &&
            !existingIds.has(s.id) &&
            !existingTitles.has(getCanonicalTitle(s.title)) &&
            !playedCanonicalTitlesRef.current.has(getCanonicalTitle(s.title))
          ).slice(0, 10);

          if (toAdd.length === 0) return prevQueue;
          const updated = [...prevQueue, ...toAdd];
          queueRef.current = updated;
          return updated;
        });
        if (data.moodLabel) setRadioMoodLabel(data.moodLabel);
      }
    } catch (e) {
      console.warn('Autoplay prefetch failed:', e.message);
    } finally {
      setTimeout(() => {
        isPrefetchingRef.current = false;
      }, 1500);
    }
  };

  const togglePlay = () => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) return;

    if (activeTrack.source === 'youtube' && !activeTrack.streamUrl) {
      if (isPlayingRef.current) {
        ytPlayerRef.current?.pauseVideo();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          isPlayingRef.current = true;
        } else {
          playSong(activeTrack, queueRef.current, { isPlaylist: true, isQueueAdvance: true });
        }
      }
    } else {
      const audio = audioRef.current;
      if (isPlayingRef.current) {
        audio.pause();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else {
        const currentSrc = audio.src || '';
        const needsSetSrc = !currentSrc || currentSrc === window.location.href || currentSrc.endsWith('/');
        if (needsSetSrc) {
          playSong(activeTrack, queueRef.current, { isPlaylist: true, isQueueAdvance: true });
        } else {
          initAudioGraph();
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          audio.volume = 1.0;
          audio.play()
            .then(() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
            })
            .catch(e => {
              if (e?.name === 'AbortError' || e?.message?.includes('interrupted by a call to pause')) return;
              console.warn('Play error:', e);
              playSong(activeTrack, queueRef.current, { isPlaylist: true, isQueueAdvance: true });
            });
        }
      }
    }
  };

  const pauseSong = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) return;
    if (activeTrack.source === 'youtube' && !activeTrack.streamUrl) {
      ytPlayerRef.current?.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const setTimerPreset = useCallback((option) => {
    if (option === 'end-of-song') {
      setSleepTimerMode('end-of-song');
      setSelectedTimerOption('end-of-song');
      initialTimerTrackIdRef.current = currentTrackRef.current?.id;
      setSleepTimerRemaining(null);
    } else if (option === 'off') {
      setSleepTimerMode(null);
      setSelectedTimerOption(null);
      setSleepTimerRemaining(null);
      initialTimerTrackIdRef.current = null;
    } else {
      const minutes = Number(option);
      setSelectedTimerOption(minutes);
      setSleepTimerRemaining(minutes * 60);
      setSleepTimerMode('minutes');
    }
  }, []);

  // Sleep Timer countdown interval (keeps running even when player is minimized/closed)
  useEffect(() => {
    if (sleepTimerMode !== 'minutes' || sleepTimerRemaining === null) return;
    if (sleepTimerRemaining <= 0) {
      pauseSong();
      setSleepTimerMode(null);
      setSelectedTimerOption(null);
      setSleepTimerRemaining(null);
      return;
    }

    const timerId = setInterval(() => {
      setSleepTimerRemaining(prev => {
        if (prev === null) return null;
        // Smoothly fade out volume over the last 15 seconds
        if (prev <= 15) {
          const ratio = Math.max(0, (prev - 1) / 15);
          if (audioRef.current) audioRef.current.volume = ratio * volume;
        }
        if (prev <= 1) {
          pauseSong();
          if (audioRef.current) audioRef.current.volume = volume; // Restore normal volume for next song
          setSleepTimerMode(null);
          setSelectedTimerOption(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [sleepTimerMode, sleepTimerRemaining, pauseSong]);

  // End-of-song watcher for sleep timer
  useEffect(() => {
    if (sleepTimerMode !== 'end-of-song') return;
    if (!initialTimerTrackIdRef.current) return;

    if (currentTrack?.id && currentTrack.id !== initialTimerTrackIdRef.current) {
      pauseSong();
      setSleepTimerMode(null);
      setSelectedTimerOption(null);
      initialTimerTrackIdRef.current = null;
    }
  }, [currentTrack?.id, sleepTimerMode, pauseSong]);

  const seekTo = (seconds) => {
    setCurrentTime(seconds);
    currentTimeRef.current = seconds;
    if (currentTrackRef.current?.source === 'youtube' && !currentTrackRef.current?.streamUrl) {
      ytPlayerRef.current?.seekTo(seconds, true);
    } else {
      audioRef.current.currentTime = seconds;
    }
  };

  const playNext = async () => {
    const now = Date.now();
    if (now - lastPlayNextTimeRef.current < 550) {
      return; // Debounce rapid double next calls
    }
    lastPlayNextTimeRef.current = now;
    isAdvancingTrackRef.current = true;
    setTimeout(() => { isAdvancingTrackRef.current = false; }, 850);

    const currentQ = queueRef.current || [];
    const currentIndex = queueIndexRef.current;
    const currentRepeat = repeatModeRef.current;
    const currentShuffle = isShuffleRef.current;
    const currentT = currentTrackRef.current;
    const currentPos = currentTimeRef.current;

    if (currentQ.length === 0) return;

    // Register skip penalty if user skipped within 15 seconds
    if (currentPos < 15 && currentT?.artist) {
      const primary = currentT.artist.split(/[,&]/)[0].trim();
      if (primary && !skippedArtistsRef.current.includes(primary)) {
        skippedArtistsRef.current = [primary, ...skippedArtistsRef.current].slice(0, 10);
      }
    }

    if (currentRepeat === 'one') {
      seekTo(0);
      if (currentT?.source === 'youtube' && !currentT?.streamUrl) {
        ytPlayerRef.current?.playVideo();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    let nextIndex;
    if (currentShuffle) {
      if (currentQ.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * currentQ.length);
        } while (nextIndex === currentIndex && currentQ.length > 1);
      } else {
        nextIndex = 0;
      }
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex < currentQ.length) {
      queueIndexRef.current = nextIndex;
      setQueueIndex(nextIndex);
      playSong(currentQ[nextIndex], currentQ, { isPlaylist: true, isQueueAdvance: true, advanceIndex: nextIndex });
      // Trigger lookahead prefetch if queue is getting low
      if (currentQ.length - nextIndex <= 3) {
        prefetchAutoplayTracks(currentQ[nextIndex]);
      }
    } else if (autoplayEnabledRef.current && currentT) {
      // Reached end of current queue: fetch more songs matching the current track's mood/genre
      try {
        const userHistory = (recentSongsRef.current || recentSongs || []).slice(0, 20);
        const res = await fetch('/api/radio/similar-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seedSong: currentT,
            recentSongs: userHistory,
            playedTitles: Array.from(playedCanonicalTitlesRef.current)
          })
        });
        const data = await res.json();
        const items = data.songs || [];
        const existingIds = new Set(currentQ.map(s => s.id));
        const existingTitles = new Set(currentQ.map(s => getCanonicalTitle(s.title)));

        const newMatching = items.filter(s =>
          s &&
          s.id !== currentT.id &&
          !existingIds.has(s.id) &&
          !existingTitles.has(getCanonicalTitle(s.title)) &&
          !playedCanonicalTitlesRef.current.has(getCanonicalTitle(s.title))
        );

        if (newMatching.length > 0) {
          const combinedQueue = deduplicateQueue([...currentQ, ...newMatching]);
          const newIdx = currentQ.length;
          setQueue(combinedQueue);
          queueRef.current = combinedQueue;
          setQueueIndex(newIdx);
          queueIndexRef.current = newIdx;
          if (data.moodLabel) setRadioMoodLabel(data.moodLabel);
          playSong(newMatching[0], combinedQueue, { isPlaylist: true, isQueueAdvance: true, advanceIndex: newIdx });
          return;
        }

        // Fallback: fetch fresh trending or discovery songs that haven't been played in this session
        const trendRes = await fetch('/api/recommend?limit=25');
        const trendData = await trendRes.json();
        const trendSongs = trendData.songs || [];
        const freshTrending = trendSongs.filter(s =>
          s &&
          s.id !== currentT.id &&
          !existingIds.has(s.id) &&
          !existingTitles.has(getCanonicalTitle(s.title)) &&
          !playedCanonicalTitlesRef.current.has(getCanonicalTitle(s.title))
        );

        if (freshTrending.length > 0) {
          const combinedQueue = deduplicateQueue([...currentQ, ...freshTrending]);
          const newIdx = currentQ.length;
          setQueue(combinedQueue);
          queueRef.current = combinedQueue;
          setQueueIndex(newIdx);
          queueIndexRef.current = newIdx;
          playSong(freshTrending[0], combinedQueue, { isPlaylist: true, isQueueAdvance: true, advanceIndex: newIdx });
          return;
        }
      } catch (err) {
        console.warn('Autoplay fetch failed:', err);
      }

      // If all recommendation calls failed, loop back only if repeat is 'all'
      if (currentRepeat === 'all' && currentQ.length > 0) {
        playSong(currentQ[0], currentQ, { isPlaylist: true, isQueueAdvance: true, advanceIndex: 0 });
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    } else {
      if (currentRepeat === 'all' && currentQ.length > 0) {
        playSong(currentQ[0], currentQ, { isPlaylist: true, isQueueAdvance: true, advanceIndex: 0 });
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  };

  const playPrev = () => {
    const now = Date.now();
    if (now - lastPlayPrevTimeRef.current < 550) {
      return; // Debounce rapid double prev calls
    }
    lastPlayPrevTimeRef.current = now;
    isAdvancingTrackRef.current = true;
    setTimeout(() => { isAdvancingTrackRef.current = false; }, 850);

    const currentPos = currentTimeRef.current;
    if (currentPos > 3) {
      seekTo(0);
      return;
    }
    const currentQ = queueRef.current || [];
    const currentIndex = queueIndexRef.current;
    if (currentQ.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      queueIndexRef.current = prevIndex;
      setQueueIndex(prevIndex);
      playSong(currentQ[prevIndex], currentQ, { isPlaylist: true, isQueueAdvance: true, advanceIndex: prevIndex });
    } else {
      if (repeatModeRef.current === 'all') {
        const lastIdx = currentQ.length - 1;
        queueIndexRef.current = lastIdx;
        setQueueIndex(lastIdx);
        playSong(currentQ[lastIdx], currentQ, { isPlaylist: true, isQueueAdvance: true, advanceIndex: lastIdx });
      } else {
        seekTo(0);
      }
    }
  };

  const handleSongEnded = () => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack || isAdvancingTrackRef.current) return;
    if (lastEndedTrackIdRef.current === activeTrack.id) return;
    lastEndedTrackIdRef.current = activeTrack.id;
    isAdvancingTrackRef.current = true;
    const currentPos = currentTimeRef.current;
    const currentDur = durationRef.current;
    const currentRepeat = repeatModeRef.current;

    if (recordedTrackIdRef.current !== activeTrack.id) {
      if (currentPos >= 45 || accumulatedListenSecondsRef.current >= 45 || (currentDur > 0 && currentPos >= currentDur * 0.85)) {
        recordedTrackIdRef.current = activeTrack.id;
        recordRecentSong(activeTrack);
      }
    }

    if (currentRepeat === 'one') {
      seekTo(0);
      if (activeTrack?.source === 'youtube' && !activeTrack?.streamUrl) {
        ytPlayerRef.current?.playVideo();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      playNext();
    }
    // Reset advancing flag after short delay to allow next track load
    setTimeout(() => { isAdvancingTrackRef.current = false; }, 800);
  };

  // Synchronize function refs on every render so external callers never hold stale closures
  playNextRef.current = playNext;
  playPrevRef.current = playPrev;
  handleSongEndedRef.current = handleSongEnded;
  seekToRef.current = seekTo;
  togglePlayRef.current = togglePlay;

  const toggleLike = async (song) => {
    if (!song || !song.id) return;
    setLikedSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      const updated = exists ? prev.filter(s => s.id !== song.id) : [song, ...prev];
      if (currentUser?.id) {
        localStorage.setItem(`suno_liked_songs_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });

    if (authToken && currentUser?.id) {
      try {
        await fetch('/api/user/like', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ song })
        });
      } catch (e) {
        console.warn('Like sync to MySQL failed:', e);
      }
    }
  };

  const isLiked = (songId) => {
    return likedSongs.some(s => s.id === songId);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  return (
    <MusicContext.Provider value={{
      audioRef,
      ytPlayerRef,
      currentTrack,
      isPlaying,
      setIsPlaying,
      currentTime,
      setCurrentTime,
      duration,
      setDuration,
      volume,
      setVolume,
      isShuffle,
      toggleShuffle,
      repeatMode,
      toggleRepeat,
      isFullPlayerOpen,
      setIsFullPlayerOpen,
      queue,
      queueIndex,
      recentSongs,
      likedSongs,
      playSong,
      togglePlay,
      seekTo,
      playNext,
      playPrev,
      handleSongEnded,
      toggleLike,
      isLiked,
      autoplayEnabled,
      toggleAutoplay,
      radioMoodLabel,
      activePlaylistModal,
      openPlaylist,
      closePlaylist,
      pauseSong,
      sleepTimerRemaining,
      sleepTimerMode,
      selectedTimerOption,
      setTimerPreset,
      getBackendBase,
      // 5-Band Equalizer & Bass Boost
      eqEnabled,
      toggleEq,
      eqPreset,
      setEqPreset,
      eqBands,
      setEqBand,
      bassBoost,
      setBassBoost,
      EQ_PRESETS,
      EQ_FREQUENCIES,
      initAudioGraph,
      // Crossfade & Audio Transitions
      crossfadeDuration,
      setCrossfadeDuration
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
}
