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

  const skippedArtistsRef = useRef([]);
  const isPrefetchingRef = useRef(false);
  const playedCanonicalTitlesRef = useRef(new Set());
  const accumulatedListenSecondsRef = useRef(0);
  const recordedTrackIdRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

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

  // Audio event listeners for standard audio streams
  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = 'auto';

    const onTimeUpdate = () => {
      if (currentTrack?.source !== 'youtube') {
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      }
    };

    const onLoadedMetadata = () => {
      if (currentTrack?.source !== 'youtube') {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      }
    };

    const onPlay = () => {
      if (currentTrack?.source !== 'youtube') setIsPlaying(true);
    };
    const onPause = () => {
      if (currentTrack?.source !== 'youtube') setIsPlaying(false);
    };

    const onEnded = () => {
      if (currentTrack?.source !== 'youtube') handleSongEnded();
    };

    const onError = (e) => {
      console.warn('Audio playback error:', e);
      if (currentTrack?.source !== 'youtube') setIsPlaying(false);
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
  }, [queue, queueIndex, repeatMode, isShuffle, currentTrack]);

  // MediaSession integration for Lockscreen & Smartwatch controls
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Suno: For You',
        artwork: [
          { src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (currentTrack.source === 'youtube') {
          ytPlayerRef.current?.playVideo();
        } else {
          audioRef.current.play().catch(() => {});
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (currentTrack.source === 'youtube') {
          ytPlayerRef.current?.pauseVideo();
        } else {
          audioRef.current.pause();
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession setup failed:', err);
    }
  }, [currentTrack]);

  // Play a specific song (handles both YouTube, direct CDN audio, and auto-resolving Spotify tracks)
  const playSong = async (song, newQueue = null) => {
    if (!song) return;

    // Prioritize Studio 320k direct master audio streams over YouTube embeds
    let activeSong = song;
    if (!activeSong.streamUrl) {
      try {
        const q = encodeURIComponent(`${activeSong.title} ${activeSong.artist || ''}`);
        const resolveRes = await fetch(`/api/search?q=${q}`);
        const resolveData = await resolveRes.json();
        if (resolveData.results && resolveData.results.length > 0) {
          activeSong = { ...activeSong, ...resolveData.results[0], source: 'saavn' };
        } else if (!activeSong.youtubeId) {
          const ytRes = await fetch(`/api/yt-search?q=${q}`);
          const ytData = await ytRes.json();
          if (ytData.results && ytData.results.length > 0) {
            activeSong = { ...activeSong, ...ytData.results[0] };
          }
        }
      } catch (e) {
        console.warn('Track resolution failed:', e);
      }
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
    let targetQueue = queue;
    if (newQueue && Array.isArray(newQueue)) {
      targetQueue = deduplicateQueue(newQueue);
      setQueue(targetQueue);
    } else if (queue.length === 0 || !queue.some(s => s.id === activeSong.id)) {
      targetQueue = deduplicateQueue([activeSong, ...queue.filter(s => s.id !== activeSong.id)]);
      setQueue(targetQueue);
    }

    const index = targetQueue.findIndex(s => s.id === activeSong.id);
    setQueueIndex(index !== -1 ? index : 0);
    setCurrentTrack(activeSong);
    setCurrentTime(0);
    accumulatedListenSecondsRef.current = 0;
    recordedTrackIdRef.current = null;
    if (activeSong.duration) setDuration(activeSong.duration);

    // Proactive lookahead: If queue is running low, pre-fetch upcoming tracks
    if (autoplayEnabled && targetQueue.length - index <= 3) {
      prefetchAutoplayTracks(activeSong);
    }

    if (activeSong.streamUrl) {
      // 1. Direct Lossless Studio 320k CDN Playback (Pure audio, zero embed restrictions, zero ads)
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      try {
        const audio = audioRef.current;
        const targetVol = 1.0;
        // Smooth micro fade-out if already playing to eliminate abrupt audio snaps
        if (!audio.paused && audio.src) {
          try {
            audio.volume = targetVol * 0.5;
            await new Promise(r => setTimeout(r, 35));
            audio.volume = 0;
            await new Promise(r => setTimeout(r, 25));
          } catch (e) {}
        }
        audio.src = activeSong.streamUrl;
        audio.currentTime = 0;
        audio.volume = 0;
        await audio.play();
        setIsPlaying(true);
        // Smooth micro fade-in ramp
        try {
          for (const ratio of [0.25, 0.55, 0.85, 1.0]) {
            await new Promise(r => setTimeout(r, 35));
            audio.volume = targetVol * ratio;
          }
        } catch (e) {
          audio.volume = targetVol;
        }
      } catch (err) {
        console.error('Audio play failed:', err.message);
        setIsPlaying(false);
      }
    } else if (activeSong.source === 'youtube' || activeSong.youtubeId) {
      // 2. Fallback to YouTube Player only when direct stream is unavailable
      audioRef.current.pause();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        ytPlayerRef.current.loadVideoById(activeSong.youtubeId);
      }
      setIsPlaying(true);
    }
  };

  // Extract unique liked artists
  const getLikedArtists = () => {
    const artists = new Set();
    likedSongs.forEach(s => {
      if (s.artist) {
        const primary = s.artist.split(/[,&]/)[0].trim();
        if (primary) artists.add(primary);
      }
    });
    return Array.from(artists);
  };

  // Autoplay prefetch: simple direct retrieval by artist
  const prefetchAutoplayTracks = async (seed) => {
    if (!autoplayEnabled || isPrefetchingRef.current || !seed) return;
    isPrefetchingRef.current = true;

    try {
      const artist = seed.artist ? seed.artist.split(/[,&]/)[0].trim() : '';
      const query = artist ? `${artist} songs` : 'popular songs';
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const songs = data.results || [];

      if (songs.length > 0) {
        setQueue(prevQueue => {
          const existingIds = new Set(prevQueue.map(s => s.id));
          const toAdd = songs.filter(s => !existingIds.has(s.id) && s.id !== seed.id).slice(0, 6);
          if (toAdd.length === 0) return prevQueue;
          return [...prevQueue, ...toAdd];
        });
      }
    } catch (e) {
      console.warn('Autoplay prefetch failed:', e.message);
    } finally {
      isPrefetchingRef.current = false;
    }
  };


  const togglePlay = () => {
    if (!currentTrack) return;

    if (currentTrack.source === 'youtube' || currentTrack.youtubeId) {
      if (isPlaying) {
        ytPlayerRef.current?.pauseVideo();
        setIsPlaying(false);
      } else {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else {
          playSong(currentTrack, queue);
        }
      }
    } else {
      const audio = audioRef.current;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        const currentSrc = audio.src || '';
        const needsSetSrc = !currentSrc || currentSrc === window.location.href || currentSrc.endsWith('/');
        if (needsSetSrc) {
          if (currentTrack.streamUrl) {
            audio.src = currentTrack.streamUrl;
            if (currentTime > 0) audio.currentTime = currentTime;
            audio.play()
              .then(() => setIsPlaying(true))
              .catch(e => {
                console.warn('Direct stream resume failed, re-resolving:', e);
                playSong(currentTrack, queue);
              });
          } else {
            playSong(currentTrack, queue);
          }
        } else {
          audio.play()
            .then(() => setIsPlaying(true))
            .catch(e => {
              console.warn('Play error:', e);
              playSong(currentTrack, queue);
            });
        }
      }
    }
  };

  const seekTo = (seconds) => {
    setCurrentTime(seconds);
    if (currentTrack?.source === 'youtube') {
      ytPlayerRef.current?.seekTo(seconds, true);
    } else {
      audioRef.current.currentTime = seconds;
    }
  };

  const playNext = async () => {
    if (queue.length === 0) return;

    // Register skip penalty if user skipped within 15 seconds
    if (currentTime < 15 && currentTrack?.artist) {
      const primary = currentTrack.artist.split(/[,&]/)[0].trim();
      if (primary && !skippedArtistsRef.current.includes(primary)) {
        skippedArtistsRef.current = [primary, ...skippedArtistsRef.current].slice(0, 10);
      }
    }

    if (repeatMode === 'one') {
      seekTo(0);
      togglePlay();
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
    }

    if (nextIndex < queue.length) {
      playSong(queue[nextIndex], queue);
      // Trigger lookahead prefetch if queue is getting low
      if (queue.length - nextIndex <= 3) {
        prefetchAutoplayTracks(queue[nextIndex]);
      }
    } else if (autoplayEnabled && currentTrack) {
      // Reached end of current queue: simply fetch more songs by the artist
      try {
        const artist = currentTrack.artist ? currentTrack.artist.split(/[,&]/)[0].trim() : '';
        const query = artist ? `${artist} songs` : 'popular songs';
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const items = data.results || [];
        const existingIds = new Set(queue.map(s => s.id));
        const newMatching = items.filter(s => !existingIds.has(s.id) && s.id !== currentTrack.id);

        if (newMatching.length > 0) {
          const combinedQueue = deduplicateQueue([...queue, ...newMatching]);
          setQueue(combinedQueue);
          playSong(newMatching[0], combinedQueue);
          return;
        }
      } catch (err) {
        console.warn('Autoplay fetch failed:', err);
      }

      if (repeatMode === 'all') {
        playSong(queue[0], queue);
      } else {
        setIsPlaying(false);
      }
    } else {
      if (repeatMode === 'all') {
        playSong(queue[0], queue);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const playPrev = () => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    if (queue.length === 0) return;

    let prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      playSong(queue[prevIndex], queue);
    } else {
      seekTo(0);
    }
  };

  const handleSongEnded = () => {
    // If a track finished playback and qualified (listened >= 45s or completed full track duration)
    if (currentTrack && recordedTrackIdRef.current !== currentTrack.id) {
      if (currentTime >= 45 || accumulatedListenSecondsRef.current >= 45 || (duration > 0 && currentTime >= duration * 0.85)) {
        recordedTrackIdRef.current = currentTrack.id;
        recordRecentSong(currentTrack);
      }
    }

    if (repeatMode === 'one') {
      seekTo(0);
      if (currentTrack?.source === 'youtube') {
        ytPlayerRef.current?.playVideo();
      } else {
        audioRef.current.play().catch(() => {});
      }
    } else {
      playNext();
    }
  };

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
      toggleAutoplay
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
