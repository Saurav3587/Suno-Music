import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Plus,
  ListPlus,
  ListMusic,
  FileText,
  Sparkles,
  Infinity as InfinityIcon,
  X,
  Timer,
  Download,
  Loader2,
  Check,
  Moon,
  SlidersHorizontal,
  Mic2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMusic } from '../../context/MusicContext';
import EqualizerModal from './EqualizerModal';

const SpotifyIcon = ({ size = 15, color = '#1db954' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7 9.5c3.2-1 7.2-.8 10.3 1" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7.8 12.3c2.7-.8 6.1-.6 8.7.9" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8.5 15.1c2.1-.6 4.8-.4 6.9.7" stroke="#000000" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const YoutubeIcon = ({ size = 16, color = '#ff0000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" fill={color} />
    <polygon points="10 15 15 12 10 9" fill="#ffffff" />
  </svg>
);

export default function FullPlayer({ onAddToPlaylist, onOpenNote }) {
  const handleAddPlaylist = () => {
    const handler = onAddToPlaylist || onOpenNote;
    if (handler && currentTrack) handler(currentTrack);
  };
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    setIsFullPlayerOpen,
    playSong,
    togglePlay,
    seekTo,
    playNext,
    playPrev,
    toggleLike,
    isLiked,
    autoplayEnabled,
    toggleAutoplay,
    queue,
    queueIndex,
    radioMoodLabel,
    sleepTimerRemaining,
    sleepTimerMode,
    selectedTimerOption,
    setTimerPreset,
    getBackendBase,
    eqEnabled
  } = useMusic();

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [syncedLines, setSyncedLines] = useState([]);
  const [isSyncedLyrics, setIsSyncedLyrics] = useState(false);
  const [lyricsViewMode, setLyricsViewMode] = useState('synced'); // 'synced' | 'plain'
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [showEqModal, setShowEqModal] = useState(false);
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  // AI DJ Mood State
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [activeMoodName, setActiveMoodName] = useState('');
  const [aiDjFeedback, setAiDjFeedback] = useState('');
  const [aiDjSongsCount, setAiDjSongsCount] = useState(0);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const chatInputRef = useRef(null);

  const PRESET_MOODS = [
    { label: 'Romantic', query: 'Romantic' },
    { label: 'Chill & Relax', query: 'Chill' },
    { label: 'Party & Dance', query: 'Party' },
    { label: 'Sad & Melancholy', query: 'Sad' },
    { label: 'Gym & Energy', query: 'Energetic' },
    { label: 'Late Night', query: 'Late Night' },
    { label: 'Focus & Study', query: 'Focus' },
    { label: 'Nostalgic 90s', query: 'Nostalgic' },
  ];

  // Check AI availability on mount
  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(d => setAiAvailable(d.available)).catch(() => {});
  }, []);

  // Sleep Timer modal visibility (state, timers, and background persistence managed globally in MusicContext)
  const [showTimerModal, setShowTimerModal] = useState(false);

  const handleSelectTimerPreset = (option) => {
    if (typeof setTimerPreset === 'function') {
      setTimerPreset(option);
    }
    setShowTimerModal(false);
  };

  // Download state & handler
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');

  const handleDownload = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!currentTrack || isDownloading) return;

    setIsDownloading(true);
    setDownloadNotice('Starting 320k download...');

    try {
      const streamUrl = currentTrack.streamUrl || '';
      const youtubeId = currentTrack.youtubeId || (currentTrack.id && String(currentTrack.id).startsWith('yt_') ? String(currentTrack.id).replace('yt_', '') : '');
      const title = currentTrack.title || 'Track';
      const artist = currentTrack.artist || 'Suno Music';

      const base = typeof getBackendBase === 'function' ? getBackendBase() : '';
      const downloadPath = `/api/download?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&youtubeId=${encodeURIComponent(youtubeId)}`;
      const fullDownloadUrl = base ? `${base}${downloadPath}` : downloadPath;

      const isNative = typeof window !== 'undefined' && (
        window.location.protocol === 'capacitor:' ||
        (window.location.hostname === 'localhost' && window.location.port !== '5173')
      );

      if (isNative) {
        // Native Android Capacitor: trigger system browser/download manager to save the MP3 directly
        window.open(fullDownloadUrl, '_system');
      } else {
        const a = document.createElement('a');
        a.href = fullDownloadUrl;
        a.setAttribute('download', `${title} - ${artist}.mp3`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      confetti({
        particleCount: 26,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#00e676', '#00b0ff', '#1db954']
      });
      setDownloadNotice('Download started!');
    } catch (err) {
      console.error('Download error:', err);
      setDownloadNotice('Download failed');
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadNotice('');
      }, 2500);
    }
  };

  // Up Next state & computed upcoming queue
  const [showUpNext, setShowUpNext] = useState(false);

  const effectiveQueueIndex = (typeof queueIndex === 'number' && queueIndex >= 0)
    ? queueIndex
    : (queue ? queue.findIndex(t => t.id === currentTrack?.id) : -1);

  const upcomingTracks = (queue && queue.length > 0)
    ? (effectiveQueueIndex >= 0 ? queue.slice(effectiveQueueIndex + 1) : queue.filter(t => t.id !== currentTrack?.id))
    : [];

  const nextTrack = upcomingTracks[0] || null;



  // AI DJ Mood selection handler: plays curated songs immediately based on mood
  const handleSelectMood = useCallback(async (moodText) => {
    const targetMood = (typeof moodText === 'string' ? moodText : aiChatInput).trim();
    if (!targetMood || aiChatLoading) return;

    setAiChatInput('');
    setAiChatLoading(true);
    setActiveMoodName(targetMood);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: targetMood, mood: targetMood, currentTrack })
      });
      const data = await res.json();

      setAiDjFeedback(data.response || `Playing songs matching your ${targetMood} mood.`);
      if (data.mood) setActiveMoodName(data.mood);

      if (data.songs && data.songs.length > 0) {
        setAiDjSongsCount(data.songs.length);
        playSong(data.songs[0], data.songs, { isPlaylist: true });
      } else {
        setAiDjSongsCount(0);
      }
    } catch {
      setAiDjFeedback('Could not load songs for this mood. Please try another mood.');
    } finally {
      setAiChatLoading(false);
    }
  }, [aiChatInput, aiChatLoading, currentTrack, playSong]);

  // Two-phase horizontal card deck transition: 'idle' | 'exit' | 'enter'
  const [displayedTrack, setDisplayedTrack] = useState(currentTrack);
  const [cardPhase, setCardPhase] = useState('idle');
  const [cardDirection, setCardDirection] = useState('next');
  const cardDirectionRef = useRef('next');
  const prevTrackIdRef = useRef(currentTrack?.id);

  const handleNextTrack = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    cardDirectionRef.current = 'next';
    playNext();
  };

  const handlePrevTrack = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    cardDirectionRef.current = 'prev';
    playPrev();
  };

  // Touch swipe support on player card (swiping left = next, swiping right = previous)
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const handleCardTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleCardTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX < 0) {
        handleNextTrack();
      } else {
        handlePrevTrack();
      }
    }
  };

  useEffect(() => {
    if (!currentTrack) {
      setDisplayedTrack(null);
      prevTrackIdRef.current = null;
      return;
    }
    // If no previous track was loaded, display immediately without transition
    if (!prevTrackIdRef.current) {
      setDisplayedTrack(currentTrack);
      prevTrackIdRef.current = currentTrack.id;
      return;
    }
    if (currentTrack.id === prevTrackIdRef.current) return;

    const dir = cardDirectionRef.current || 'next';
    setCardDirection(dir);

    // Phase 1: trigger horizontal exit (card slides like a card deck)
    setCardPhase('exit');
    const exitTimer = setTimeout(() => {
      // Phase 2: swap content, trigger enter (enters smoothly from opposite side)
      setDisplayedTrack(currentTrack);
      prevTrackIdRef.current = currentTrack.id;
      setCardPhase('enter');
      const enterTimer = setTimeout(() => {
        setCardPhase('idle');
        cardDirectionRef.current = 'next';
      }, 400);
      return () => clearTimeout(enterTimer);
    }, 220);
    return () => clearTimeout(exitTimer);
  }, [currentTrack]);

  const track = displayedTrack || currentTrack;
  if (!currentTrack || !track) return null;

  const liked = isLiked(currentTrack.id);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Reset lyrics when track changes
  useEffect(() => {
    setLyrics('');
    setSyncedLines([]);
    setIsSyncedLyrics(false);
  }, [currentTrack?.id]);

  // Compute active synced lyric line based on current playback time
  const activeLineIndex = useMemo(() => {
    if (!isSyncedLyrics || !syncedLines.length) return -1;
    for (let i = syncedLines.length - 1; i >= 0; i--) {
      if (currentTime >= syncedLines[i].time - 0.25) {
        return i;
      }
    }
    return 0;
  }, [isSyncedLyrics, syncedLines, currentTime]);

  // Auto-scroll active lyric into center view
  useEffect(() => {
    if (showLyrics && isSyncedLyrics && lyricsViewMode === 'synced' && activeLineIndex >= 0 && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineIndex, showLyrics, isSyncedLyrics, lyricsViewMode]);

  // Fetch lyrics when requested (Supports Synced Karaoke LRCLIB + JioSaavn fallback)
  const handleToggleLyrics = async () => {
    if (!showLyrics && !lyrics && !syncedLines.length) {
      setLoadingLyrics(true);
      try {
        const titleParam = encodeURIComponent(currentTrack?.title || '');
        const artistParam = encodeURIComponent(currentTrack?.artist || '');
        const durParam = currentTrack?.duration ? `&duration=${Math.round(currentTrack.duration)}` : '';
        const res = await fetch(`/api/lyrics?id=${currentTrack?.id}&title=${titleParam}&artist=${artistParam}${durParam}`);
        const data = await res.json();

        if (data.isSynced && Array.isArray(data.lines) && data.lines.length > 0) {
          setSyncedLines(data.lines);
          setIsSyncedLyrics(true);
          setLyrics(data.lyrics ? data.lyrics.replace(/<br\s*[\/]?>/gi, '\n') : '');
        } else if (data.lyrics) {
          setLyrics(data.lyrics.replace(/<br\s*[\/]?>/gi, '\n'));
          setSyncedLines([]);
          setIsSyncedLyrics(false);
        } else {
          setLyrics('No lyrics found for this song. Enjoy the rhythm!');
          setSyncedLines([]);
          setIsSyncedLyrics(false);
        }
      } catch {
        setLyrics('Unable to load lyrics at this moment.');
        setSyncedLines([]);
        setIsSyncedLyrics(false);
      } finally {
        setLoadingLyrics(false);
      }
    }
    setShowLyrics(!showLyrics);
  };

  // Trigger celebration on like
  const handleLikeWithConfetti = () => {
    toggleLike(currentTrack);
    if (!liked) {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#ff3b68', '#ff758c', '#a238ff']
      });
    }
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFullPlayerOpen(false);
    }, 240);
  }, [setIsFullPlayerOpen]);

  return (
    <div
      className="full-player-sheet"
      style={{
        transform: isClosing ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
        opacity: isClosing ? 0 : 1
      }}
    >
      {/* Blurred Album Artwork Background with smooth crossfade */}
      <div
        key={`bg-${currentTrack.id}`}
        className="full-player-bg"
        style={{ backgroundImage: `url(${currentTrack.image})` }}
      />

      {/* Top Header */}
      <div className="full-player-header">
        <button
          className="action-btn"
          onClick={handleClose}
          title="Minimize to mini player"
        >
          <ChevronDown size={26} />
        </button>

        <div className="player-header-title">
          <span className="player-badge">Now Playing</span>
          <span className="player-playlist-name">Suno Music</span>
        </div>

        <div className="player-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Equalizer & Audio FX button */}
          <button
            className={`action-btn player-eq-btn ${eqEnabled ? 'eq-active' : ''}`}
            onClick={() => setShowEqModal(true)}
            title="Audio Equalizer & FX"
          >
            <SlidersHorizontal size={20} />
          </button>

          {/* Sleep Timer badge / button */}
          <button
            className={`action-btn player-timer-btn ${sleepTimerMode ? 'timer-active' : ''}`}
            onClick={() => setShowTimerModal(true)}
            title={sleepTimerMode ? 'Sleep timer active' : 'Set sleep timer'}
          >
            {sleepTimerMode === 'minutes' && sleepTimerRemaining !== null ? (
              <span className="timer-countdown-badge">
                <Moon size={12} />
                <span>{Math.floor(sleepTimerRemaining / 60)}:{(sleepTimerRemaining % 60).toString().padStart(2, '0')}</span>
              </span>
            ) : sleepTimerMode === 'end-of-song' ? (
              <span className="timer-countdown-badge">
                <Moon size={12} />
                <span>End</span>
              </span>
            ) : (
              <Timer size={20} />
            )}
          </button>

          <button
            className="action-btn"
            onClick={handleAddPlaylist}
            title="Add to Playlist"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Center: Album Art Card or Synced Karaoke Lyrics */}
      {showLyrics ? (
        <div className="player-lyrics-card">
          {/* Lyrics Header & View Mode Switcher */}
          <div className="player-lyrics-header">
            <div className="lyrics-badge">
              <Mic2 size={13} color="#f5a65b" />
              <span>{isSyncedLyrics ? 'Live Karaoke Lyrics' : 'Lyrics'}</span>
            </div>

            {isSyncedLyrics && (
              <div className="lyrics-mode-toggle">
                <button
                  type="button"
                  className={`lyrics-mode-btn ${lyricsViewMode === 'synced' ? 'active' : ''}`}
                  onClick={() => setLyricsViewMode('synced')}
                >
                  Karaoke
                </button>
                <button
                  type="button"
                  className={`lyrics-mode-btn ${lyricsViewMode === 'plain' ? 'active' : ''}`}
                  onClick={() => setLyricsViewMode('plain')}
                >
                  Plain
                </button>
              </div>
            )}
          </div>

          {loadingLyrics ? (
            <div className="lyrics-loading-state">
              <div className="equalizer" style={{ justifyContent: 'center', marginBottom: '8px' }}>
                <div className="eq-bar" />
                <div className="eq-bar" />
                <div className="eq-bar" />
              </div>
              <p>Finding synchronized lyrics...</p>
            </div>
          ) : isSyncedLyrics && lyricsViewMode === 'synced' ? (
            <div
              ref={lyricsContainerRef}
              className="karaoke-scroll-container"
            >
              {syncedLines.map((line, idx) => {
                const isActive = activeLineIndex === idx;
                const isPast = activeLineIndex > idx;
                return (
                  <div
                    key={`${line.time}-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    className={`karaoke-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                    onClick={() => seekTo(line.time)}
                    role="button"
                    tabIndex={0}
                    title="Click to jump to this lyric"
                  >
                    <span className="karaoke-text">{line.text || '♪'}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="plain-lyrics-container">
              <p className="plain-lyrics-text">
                {lyrics}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          className="player-card-container"
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
        >
          {/* card-phase & card-dir drive smooth left-to-right card deck transitions */}
          <div
            className={`player-art-card card-phase-${cardPhase} card-dir-${cardDirection} ${isPlaying && cardPhase === 'idle' ? 'playing' : ''}`}
          >
            <img
              src={track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80'}
              alt={track.title || 'Playing track'}
              className="player-art-card-img"
            />
            <div className="player-art-card-glare" />
            {track.badge && (
              <div className="player-art-badge">
                {track.badge}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Lower Controls Container — Lifted Upward */}
      <div className="player-lower-controls">
        {/* Track Details — slides together with the card */}
        <div className="player-details">
          <div className={`player-details-info details-phase-${cardPhase} details-dir-${cardDirection}`}>
            <div className="player-song-title">{track.title || 'Unknown Title'}</div>
            <div className="player-song-artist">{track.artist || 'Unknown Artist'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`action-btn download-btn ${isDownloading ? 'downloading' : ''}`}
              onClick={handleDownload}
              title="Download 320k Track"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={20} className="spin-loader" />
              ) : (
                <Download size={20} />
              )}
            </button>

            <button
              className="action-btn heart-burst"
              onClick={handleLikeWithConfetti}
              title={liked ? 'Liked' : 'Like'}
            >
              <Heart
                size={24}
                fill={liked ? '#ff3b68' : 'none'}
                color={liked ? '#ff3b68' : 'currentColor'}
              />
            </button>
          </div>
        </div>

        {/* Scrubber with Dynamic Playing Fill */}
        {(() => {
          const displayTime = isSeeking ? seekValue : currentTime;
          const progressPercent = duration ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
          return (
            <div className="scrubber-container">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step="0.1"
                value={displayTime || 0}
                onMouseDown={() => { setIsSeeking(true); setSeekValue(currentTime); }}
                onTouchStart={() => { setIsSeeking(true); setSeekValue(currentTime); }}
                onPointerDown={() => { setIsSeeking(true); setSeekValue(currentTime); }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSeekValue(val);
                }}
                onMouseUp={(e) => {
                  setIsSeeking(false);
                  seekTo(Number(e.target.value));
                }}
                onTouchEnd={() => {
                  setIsSeeking(false);
                  seekTo(seekValue);
                }}
                onPointerUp={() => {
                  setIsSeeking(false);
                  seekTo(seekValue);
                }}
                className="scrubber-slider"
                aria-label="Track progress slider"
                style={{
                  background: `linear-gradient(to right, #ff3b68 0%, #ff758c ${progressPercent}%, rgba(255, 255, 255, 0.16) ${progressPercent}%, rgba(255, 255, 255, 0.16) 100%)`
                }}
              />
              <div className="scrubber-times">
                <span>{formatTime(displayTime)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {radioMoodLabel ? (
                    <span style={{
                      color: '#ff758c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(255, 59, 104, 0.12)',
                      border: '1px solid rgba(255, 59, 104, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontSize: '0.68rem',
                      fontWeight: 600
                    }}>
                      <Sparkles size={11} /> {radioMoodLabel}
                    </span>
                  ) : currentTrack.isSpotify || currentTrack.source === 'spotify-resolved' || (currentTrack.badge && currentTrack.badge.includes('Spotify')) ? (
                    <span style={{ color: '#1db954', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <SpotifyIcon size={13} /> Spotify 320k
                    </span>
                  ) : currentTrack.source === 'youtube' ? (
                    <span style={{ color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <YoutubeIcon size={14} color="#ff0000" /> {currentTrack.isAcoustic ? 'Acoustic Cover' : 'YouTube Music'}
                    </span>
                  ) : (
                    <span style={{ color: '#ff85a2', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={11} /> 320k Studio Master
                    </span>
                  )}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          );
        })()}

      {/* Main Controls */}
      <div className="player-actions-row">
        <button
          className={`action-btn ${isShuffle ? 'active' : ''}`}
          onClick={toggleShuffle}
          title="Shuffle"
        >
          <Shuffle size={20} color={isShuffle ? '#ff3b68' : 'currentColor'} />
        </button>

        <button className="action-btn" onClick={handlePrevTrack} title="Previous">
          <SkipBack size={26} />
        </button>

        <button className="play-main-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <Pause size={28} fill="#ffffff" strokeWidth={0} />
          ) : (
            <Play size={28} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '4px' }} />
          )}
        </button>

        <button className="action-btn" onClick={handleNextTrack} title="Next">
          <SkipForward size={26} />
        </button>

        <button className="action-btn" onClick={toggleRepeat} title={`Repeat: ${repeatMode}`}>
          {repeatMode === 'one' ? (
            <Repeat1 size={20} color="#ff3b68" />
          ) : (
            <Repeat size={20} color={repeatMode === 'all' ? '#ff3b68' : 'currentColor'} />
          )}
        </button>
      </div>

      {/* Up Next Bottom Peek Bar */}
      <div
        className="player-up-next-peek"
        onClick={() => setShowUpNext(true)}
        role="button"
        tabIndex={0}
        title="Open Up Next queue"
      >
        <div className="up-next-peek-left">
          <ListMusic size={15} className="up-next-icon" />
          <span className="up-next-tag">UP NEXT:</span>
          <span className="up-next-title">
            {nextTrack ? `${nextTrack.title} • ${nextTrack.artist}` : (autoplayEnabled ? 'Infinite Smart Flow ready' : 'Queue ended')}
          </span>
        </div>
        <div className="up-next-peek-right">
          {upcomingTracks.length > 0 && (
            <span className="up-next-badge">+{upcomingTracks.length}</span>
          )}
          <ChevronUp size={15} className="up-next-chevron" />
        </div>
      </div>



      {/* AI DJ Mood Player Overlay */}
      {showAiChat && (
        <div style={{
          position: 'absolute',
          bottom: '105px',
          left: '10px',
          right: '10px',
          maxHeight: '340px',
          background: 'rgba(15, 10, 25, 0.96)',
          border: '1px solid rgba(162, 56, 255, 0.35)',
          borderRadius: '20px',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(162, 56, 255, 0.2)',
          animation: 'aiChatSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(162, 56, 255, 0.4)'
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                  AI DJ - Mood Player
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>
                  Tell your mood to play matching songs
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAiChat(false)}
              title="Close"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Mood Pills */}
          <div style={{
            padding: '10px 14px 6px',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            flexShrink: 0
          }}>
            {PRESET_MOODS.map(m => {
              const isSelected = activeMoodName && activeMoodName.toLowerCase().includes(m.query.toLowerCase());
              return (
                <button
                  key={m.query}
                  type="button"
                  disabled={aiChatLoading}
                  onClick={() => handleSelectMood(m.query)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, #ff3b68, #a238ff)'
                      : 'rgba(255, 255, 255, 0.08)',
                    border: isSelected
                      ? '1px solid rgba(255, 117, 140, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '5px 11px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: aiChatLoading ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Status & Feedback Area */}
          <div style={{
            flex: 1,
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '65px'
          }}>
            {aiChatLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(162, 56, 255, 0.12)',
                border: '1px solid rgba(162, 56, 255, 0.25)',
                color: '#d1b8ff',
                fontSize: '0.78rem'
              }}>
                <Sparkles size={14} />
                <span>AI DJ is queuing songs for "{activeMoodName}" mood...</span>
              </div>
            ) : activeMoodName ? (
              <div style={{
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: '#ff758c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Mood: {activeMoodName}
                  </span>
                  {aiDjSongsCount > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                      {aiDjSongsCount} songs playing
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ffffff', lineHeight: 1.35 }}>
                  {aiDjFeedback || `Playing songs matching your ${activeMoodName} vibe.`}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '0.76rem',
                padding: '8px 4px',
                lineHeight: 1.4
              }}>
                Pick a mood above or type any feeling below to start listening.
              </div>
            )}
          </div>

          {/* Custom Mood Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSelectMood(aiChatInput);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <input
              ref={chatInputRef}
              type="text"
              value={aiChatInput}
              onChange={e => setAiChatInput(e.target.value)}
              placeholder="Tell your mood... (e.g. peaceful, broken, romantic)"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                fontFamily: 'var(--font-display)'
              }}
            />
            <button
              type="submit"
              disabled={!aiChatInput.trim() || aiChatLoading}
              title="Play on Mood"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: aiChatInput.trim() ? 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: aiChatInput.trim() ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, background 0.2s ease',
                flexShrink: 0
              }}
            >
              <Play size={14} color="#ffffff" fill="#ffffff" />
            </button>
          </form>
        </div>
      )}

      {/* Footer Tools: Smartly balanced 3 sections — AI DJ, Smart Flow, & Lyrics */}
      <div className="player-footer-tools">
        <button
          className={`tool-chip ${showAiChat ? 'active' : ''}`}
          onClick={() => setShowAiChat(!showAiChat)}
          style={{
            borderColor: showAiChat ? 'rgba(162, 56, 255, 0.55)' : undefined,
            color: showAiChat ? '#d1b8ff' : undefined,
            background: showAiChat ? 'rgba(162, 56, 255, 0.18)' : undefined,
            boxShadow: showAiChat ? '0 4px 16px rgba(162, 56, 255, 0.3)' : undefined
          }}
        >
          <Sparkles size={15} />
          <span>AI DJ</span>
        </button>

        <button
          className={`tool-chip ${autoplayEnabled ? 'active' : ''}`}
          onClick={toggleAutoplay}
          title="Toggles Studio Master endless autoplay flow"
          style={{
            borderColor: autoplayEnabled ? 'rgba(29, 185, 84, 0.5)' : undefined,
            color: autoplayEnabled ? '#1db954' : undefined,
            background: autoplayEnabled ? 'rgba(29, 185, 84, 0.16)' : undefined,
            boxShadow: autoplayEnabled ? '0 4px 16px rgba(29, 185, 84, 0.25)' : undefined
          }}
        >
          <InfinityIcon size={15} />
          <span>{autoplayEnabled ? 'Smart Flow' : 'Autoplay Off'}</span>
        </button>

        <button
          className={`tool-chip ${showLyrics ? 'active' : ''}`}
          onClick={handleToggleLyrics}
          style={{
            borderColor: showLyrics ? 'rgba(255, 59, 104, 0.55)' : undefined,
            color: showLyrics ? '#ff85a2' : undefined,
            background: showLyrics ? 'rgba(255, 59, 104, 0.18)' : undefined,
            boxShadow: showLyrics ? '0 4px 16px rgba(255, 59, 104, 0.3)' : undefined
          }}
        >
          <FileText size={15} />
          <span>{showLyrics ? 'Hide Lyrics' : 'Lyrics'}</span>
        </button>
      </div>
    </div>

    {/* Toast Notice (Download / Feedback) */}
    {downloadNotice && (
      <div className="player-toast-notice">
        <Sparkles size={14} color="#00e676" />
        <span>{downloadNotice}</span>
      </div>
    )}

    {/* Sleep Timer Modal */}
    {showTimerModal && (
      <div className="player-modal-backdrop" onClick={() => setShowTimerModal(false)}>
        <div className="player-modal-card" onClick={e => e.stopPropagation()}>
          <div className="player-modal-header">
            <div className="player-modal-title-group">
              <div className="modal-icon-badge">
                <Moon size={16} color="#ffffff" />
              </div>
              <div>
                <div className="modal-title">Sleep Timer</div>
                <div className="modal-subtitle">
                  {sleepTimerMode === 'minutes' && sleepTimerRemaining !== null
                    ? `Active: ${Math.floor(sleepTimerRemaining / 60)}m ${sleepTimerRemaining % 60}s remaining`
                    : sleepTimerMode === 'end-of-song'
                    ? 'Active: Pauses when this song ends'
                    : 'Audio will automatically pause'}
                </div>
              </div>
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setShowTimerModal(false)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="timer-options-list">
            {[
              { label: '15 Minutes', value: 15 },
              { label: '30 Minutes', value: 30 },
              { label: '45 Minutes', value: 45 },
              { label: '60 Minutes', value: 60 },
              { label: 'End of This Song', value: 'end-of-song' },
              { label: 'Turn Off Timer', value: 'off', isOff: true }
            ].map(opt => {
              const isSelected = selectedTimerOption === opt.value || (opt.value === 'off' && !sleepTimerMode);
              return (
                <button
                  key={opt.label}
                  className={`timer-option-btn ${isSelected ? 'selected' : ''} ${opt.isOff ? 'off-opt' : ''}`}
                  onClick={() => handleSelectTimerPreset(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={16} className="timer-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* Up Next Sliding Drawer */}
    {showUpNext && (
      <div className="up-next-drawer-backdrop" onClick={() => setShowUpNext(false)}>
        <div className="up-next-drawer-panel" onClick={e => e.stopPropagation()}>
          <div className="drawer-drag-handle" />
          <div className="drawer-header">
            <div className="drawer-title-group">
              <ListMusic size={18} color="#ff758c" />
              <span className="drawer-title">Playing Queue</span>
              <span className="drawer-count-pill">{upcomingTracks.length} upcoming</span>
            </div>
            <button className="modal-close-btn" onClick={() => setShowUpNext(false)} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Currently Playing Track Highlight */}
          <div className="drawer-now-playing-item">
            <span className="drawer-item-state">Now Playing</span>
            <div className="drawer-track-row active-track">
              <img
                src={track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&auto=format&fit=crop&q=80'}
                alt={track.title}
                className="drawer-track-img"
              />
              <div className="drawer-track-info">
                <div className="drawer-track-title">{track.title}</div>
                <div className="drawer-track-artist">{track.artist}</div>
              </div>
              <div className="drawer-equalizer">
                <span className="eq-bar" />
                <span className="eq-bar" />
                <span className="eq-bar" />
              </div>
            </div>
          </div>

          {/* Upcoming items list */}
          <div className="drawer-queue-list">
            <div className="drawer-section-label">Up Next</div>
            {upcomingTracks.length === 0 ? (
              <div className="drawer-empty-state">
                <p>No more songs in queue.</p>
                {autoplayEnabled ? (
                  <span className="empty-sub">Smart Flow is active — similar tracks will autoplay continuously.</span>
                ) : (
                  <span className="empty-sub">Turn on Smart Flow or select songs from search to build your queue.</span>
                )}
              </div>
            ) : (
              upcomingTracks.map((item, idx) => {
                const actualQueueIndex = effectiveQueueIndex >= 0 ? effectiveQueueIndex + 1 + idx : idx;
                return (
                  <div
                    key={`${item.id || item.title}-${idx}`}
                    className="drawer-track-row"
                    onClick={() => {
                      playSong(item, queue, { isPlaylist: true, isQueueAdvance: true, advanceIndex: actualQueueIndex });
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="drawer-track-num">{idx + 1}</span>
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="drawer-track-img"
                      loading="lazy"
                    />
                    <div className="drawer-track-info">
                      <div className="drawer-track-title">{item.title}</div>
                      <div className="drawer-track-artist">{item.artist}</div>
                    </div>
                    {item.duration ? (
                      <span className="drawer-track-duration">{formatTime(item.duration)}</span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    )}

    {/* 5-Band Studio Equalizer & Audio FX Modal */}
    {showEqModal && (
      <EqualizerModal onClose={() => setShowEqModal(false)} />
    )}
  </div>
);
}
