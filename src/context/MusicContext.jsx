import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';

const MusicContext = createContext();

export function MusicProvider({ children }) {
  const { currentUser, authToken } = useUser();
  const audioRef = useRef(new Audio());
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

  const isAdvancingTrackRef = useRef(false);
  const isPrefetchingRef = useRef(false);
  const playedCanonicalTitlesRef = useRef(new Set());
  const accumulatedListenSecondsRef = useRef(0);
  const recordedTrackIdRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const skippedArtistsRef = useRef([]);

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

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { autoplayEnabledRef.current = autoplayEnabled; }, [autoplayEnabled]);

  const playNextRef = useRef();
  const playPrevRef = useRef();
  const handleSongEndedRef = useRef();
  const seekToRef = useRef();
  const togglePlayRef = useRef();

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
    } catch {}
    try {
      const savedL = localStorage.getItem(userLikesKey);
      if (savedL) cachedLikes = JSON.parse(savedL);
    } catch {}

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
    return str
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\b(official\s*(video|audio|music\s*video|lyric.*|full.*))\b/gi, '')
      .replace(/[-|–—].*$/, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const recordRecentSong = (track) => {
    if (!track || !track.id) return;
    const norm = getCanonicalTitle(track.title);
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
      }).catch(() => {});
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
    const deduped = [];
    for (const s of songList) {
      if (!s || !s.title) continue;
      const norm = getCanonicalTitle(s.title);
      if (!norm) continue;
      if (norm.length >= 3 && seenTitles.has(norm)) {
        continue;
      }
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
      if (currentTrackRef.current?.source !== 'youtube') {
        const cTime = audio.currentTime;
        setCurrentTime(cTime);
        currentTimeRef.current = cTime;
        if (audio.duration && !isNaN(audio.duration)) {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          durationRef.current = audio.duration;
          // Sync notification with new duration
          syncNativeNotification({ duration: audio.duration });
          // Background completion watchdog:
          // If within 0.35s of track duration and still active, proactively trigger handleSongEnded
          if (audio.duration > 5 && cTime >= audio.duration - 0.35 && !audio.paused && !audio.ended) {
            handleSongEndedRef.current?.();
          }
        }
        }
      }
    };

    const onLoadedMetadata = () => {
      if (currentTrackRef.current?.source !== 'youtube') {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
          durationRef.current = audio.duration;
        }
      }
    };

    const onPlay = () => {
      if (currentTrackRef.current?.source !== 'youtube') {
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    };

    const onPause = () => {
      if (currentTrackRef.current?.source !== 'youtube') {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    const onEnded = () => {
      if (currentTrackRef.current?.source !== 'youtube') {
        handleSongEndedRef.current?.();
      }
    };

    const onError = (e) => {
      console.warn('Audio playback error:', e);
      if (currentTrackRef.current?.source !== 'youtube') {
        // Auto-recover on playback error
        if (isPlayingRef.current) {
          setTimeout(() => {
            playNextRef.current?.();
          }, 800);
        }
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
        if (currentTrackRef.current?.source === 'youtube') {
          ytPlayerRef.current?.playVideo();
        } else {
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
        isPlayingRef.current = true;
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (currentTrackRef.current?.source === 'youtube') {
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
          if (audioRef.current?.paused) audioRef.current.play().catch(() => {});
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
        }).catch(() => {});
      } else if (listenerRes && typeof listenerRes.remove === 'function') {
        removeListener = () => listenerRes.remove();
      }
    } catch (err) {
      console.warn('MusicNotification listener error:', err);
    }

    return () => {
      if (typeof removeListener === 'function') {
        try { removeListener(); } catch (_) {}
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
          } catch (_) {}
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

      if (track.source === 'youtube' || track.youtubeId) {
        // YouTube: check player state — 0 = ENDED
        try {
          const ytState = ytPlayerRef.current?.getPlayerState?.();
          if (ytState === 0) {
            handleSongEndedRef.current?.();
          } else if (ytState === 1) {
            // Still playing — update notification so UI re-syncs
            syncNativeNotificationRef.current();
          }
        } catch (_) {}
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
        return { ...track, ...resolveData.results[0], source: 'saavn' };
      }
      if (!track.youtubeId) {
        const ytRes = await fetch(`/api/yt-search?q=${q}`);
        const ytData = await ytRes.json();
        if (ytData.results && ytData.results.length > 0) {
          return { ...track, ...ytData.results[0] };
        }
      }
    } catch (e) {
      console.warn('Track pre-resolution failed:', e);
    }
    return track;
  };

  // Play a specific song (handles both YouTube, direct CDN audio, and auto-resolving Spotify tracks)
  const playSong = async (song, newQueue = null, options = {}) => {
    if (!song) return;

    // Prioritize Studio 320k direct master audio streams over YouTube embeds
    let activeSong = song;
    if (!activeSong.streamUrl) {
      activeSong = await resolveTrackStreamUrl(activeSong);
    }

    // Register into anti-repeat memory window
    const activeNorm = getCanonicalTitle(activeSong.title);
    if (activeNorm) {
      playedCanonicalTitlesRef.current.add(activeNorm);
      if (playedCanonicalTitlesRef.current.size > 25) {
        const first = playedCanonicalTitlesRef.current.values().next().value;
        playedCanonicalTitlesRef.current.delete(first);
      }
    }

    // Update queue with deduplication
    let targetQueue = queueRef.current || [];
    if (options.isFromSearch) {
      // From search: initialize with activeSong and immediately build the smart mood/genre radio queue
      targetQueue = [activeSong];
      setQueue(targetQueue);
      queueRef.current = targetQueue;

      fetch('/api/radio/similar-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedSong: activeSong,
          candidateTracks: Array.isArray(newQueue) ? newQueue : []
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.songs) && data.songs.length > 0) {
            const smartQueue = deduplicateQueue(data.songs);
            setQueue(smartQueue);
            queueRef.current = smartQueue;
            setQueueIndex(0);
            queueIndexRef.current = 0;
            if (data.moodLabel) setRadioMoodLabel(data.moodLabel);
          }
        })
        .catch(err => console.warn('Smart mood queue fetch failed:', err));
    } else if (newQueue && Array.isArray(newQueue)) {
      targetQueue = deduplicateQueue(newQueue);
      setQueue(targetQueue);
      queueRef.current = targetQueue;
      setRadioMoodLabel('');
    } else if (targetQueue.length === 0 || !targetQueue.some(s => s.id === activeSong.id)) {
      targetQueue = deduplicateQueue([activeSong, ...targetQueue.filter(s => s.id !== activeSong.id)]);
      setQueue(targetQueue);
      queueRef.current = targetQueue;
    }

    const index = targetQueue.findIndex(s => s.id === activeSong.id);
    const resolvedIndex = index !== -1 ? index : 0;
    setQueueIndex(resolvedIndex);
    queueIndexRef.current = resolvedIndex;

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
      }).catch(() => {});
    }

    if (activeSong.streamUrl) {
      // 1. Direct Lossless Studio 320k CDN Playback
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      try {
        const audio = audioRef.current;
        const targetVol = 1.0;

        // Reset and assign stream URL directly without setTimeout delay
        audio.pause();
        audio.src = activeSong.streamUrl;
        audio.currentTime = 0;
        audio.volume = targetVol;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
        isPlayingRef.current = true;
      } catch (err) {
        console.error('Audio play failed:', err?.message || err);
        setIsPlaying(false);
        isPlayingRef.current = false;
        // Auto-skip to next track if unplayable
        setTimeout(() => {
          if (isPlayingRef.current || (typeof document !== 'undefined' && document.hidden)) {
            playNextRef.current?.();
          }
        }, 1200);
      }
    } else if (activeSong.source === 'youtube' || activeSong.youtubeId) {
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
      const res = await fetch('/api/radio/similar-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedSong: seed })
      });
      const data = await res.json();
      const songs = data.songs || [];

      if (songs.length > 0) {
        setQueue(prevQueue => {
          const existingIds = new Set(prevQueue.map(s => s.id));
          const toAdd = songs.filter(s => !existingIds.has(s.id) && s.id !== seed.id).slice(0, 8);
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
      isPrefetchingRef.current = false;
    }
  };

  const togglePlay = () => {
    const activeTrack = currentTrackRef.current;
    if (!activeTrack) return;

    if (activeTrack.source === 'youtube' || activeTrack.youtubeId) {
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
          playSong(activeTrack, queueRef.current);
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
          if (activeTrack.streamUrl) {
            audio.src = activeTrack.streamUrl;
            if (currentTimeRef.current > 0) audio.currentTime = currentTimeRef.current;
            audio.volume = 1.0;
            audio.play()
              .then(() => {
                setIsPlaying(true);
                isPlayingRef.current = true;
              })
              .catch(e => {
                console.warn('Direct stream resume failed, re-resolving:', e);
                playSong(activeTrack, queueRef.current);
              });
          } else {
            playSong(activeTrack, queueRef.current);
          }
        } else {
          audio.volume = 1.0;
          audio.play()
            .then(() => {
              setIsPlaying(true);
              isPlayingRef.current = true;
            })
            .catch(e => {
              console.warn('Play error:', e);
              playSong(activeTrack, queueRef.current);
            });
        }
      }
    }
  };

  const seekTo = (seconds) => {
    setCurrentTime(seconds);
    currentTimeRef.current = seconds;
    if (currentTrackRef.current?.source === 'youtube') {
      ytPlayerRef.current?.seekTo(seconds, true);
    } else {
      audioRef.current.currentTime = seconds;
    }
  };

  const playNext = async () => {
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
      if (currentT?.source === 'youtube') {
        ytPlayerRef.current?.playVideo();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
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
      playSong(currentQ[nextIndex], currentQ);
      // Trigger lookahead prefetch if queue is getting low
      if (currentQ.length - nextIndex <= 3) {
        prefetchAutoplayTracks(currentQ[nextIndex]);
      }
    } else if (autoplayEnabledRef.current && currentT) {
      // Reached end of current queue: fetch more songs matching the current track's mood/genre
      try {
        const res = await fetch('/api/radio/similar-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedSong: currentT })
        });
        const data = await res.json();
        const items = data.songs || [];
        const existingIds = new Set(currentQ.map(s => s.id));
        const newMatching = items.filter(s => !existingIds.has(s.id) && s.id !== currentT.id);

        if (newMatching.length > 0) {
          const combinedQueue = deduplicateQueue([...currentQ, ...newMatching]);
          setQueue(combinedQueue);
          queueRef.current = combinedQueue;
          if (data.moodLabel) setRadioMoodLabel(data.moodLabel);
          playSong(newMatching[0], combinedQueue);
          return;
        }
      } catch (err) {
        console.warn('Autoplay fetch failed:', err);
      }

      if (currentRepeat === 'all') {
        playSong(currentQ[0], currentQ);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    } else {
      if (currentRepeat === 'all') {
        playSong(currentQ[0], currentQ);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  };

  const playPrev = () => {
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
      playSong(currentQ[prevIndex], currentQ);
    } else {
      if (repeatModeRef.current === 'all') {
        playSong(currentQ[currentQ.length - 1], currentQ);
      } else {
        seekTo(0);
      }
    }
  };

  const handleSongEnded = () => {
    if (isAdvancingTrackRef.current) return; // Prevent double triggers
    isAdvancingTrackRef.current = true;
    const activeTrack = currentTrackRef.current;
    const currentPos = currentTimeRef.current;
    const currentDur = durationRef.current;
    const currentRepeat = repeatModeRef.current;

    if (activeTrack && recordedTrackIdRef.current !== activeTrack.id) {
      if (currentPos >= 45 || accumulatedListenSecondsRef.current >= 45 || (currentDur > 0 && currentPos >= currentDur * 0.85)) {
        recordedTrackIdRef.current = activeTrack.id;
        recordRecentSong(activeTrack);
      }
    }

    if (currentRepeat === 'one') {
      seekTo(0);
      if (activeTrack?.source === 'youtube') {
        ytPlayerRef.current?.playVideo();
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      playNext();
    }
    // Reset advancing flag after short delay to allow next track load
    setTimeout(() => { isAdvancingTrackRef.current = false; }, 500);

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
      closePlaylist
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
