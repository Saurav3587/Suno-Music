import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown,
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
  FileText,
  Sparkles,
  Infinity as InfinityIcon,
  Send,
  Bot,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMusic } from '../../context/MusicContext';
import Visualizer from './Visualizer';

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
    queue
  } = useMusic();

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  // AI DJ State
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const aiInsightTrackRef = useRef(null);
  const chatInputRef = useRef(null);

  // Check AI availability on mount
  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(d => setAiAvailable(d.available)).catch(() => {});
  }, []);

  // Fetch AI insight when track changes
  useEffect(() => {
    if (!currentTrack || !currentTrack.id) return;
    if (aiInsightTrackRef.current === currentTrack.id) return;
    aiInsightTrackRef.current = currentTrack.id;

    // Get the next song in queue for explanation
    const nextIdx = queue.findIndex(s => s.id === currentTrack.id) + 1;
    const nextSong = nextIdx < queue.length ? queue[nextIdx] : null;

    setAiLoading(true);
    const fetchInsight = async () => {
      try {
        if (nextSong) {
          // Explain why current song follows the previous
          const res = await fetch('/api/ai/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentSong: currentTrack, nextSong, recentHistory: [] })
          });
          const data = await res.json();
          setAiInsight(data.reasoning || '');
        } else {
          // Session-level insight
          const res = await fetch('/api/ai/session-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentTrack, recentHistory: [], likedSongs: [] })
          });
          const data = await res.json();
          setAiInsight(data.insight || '');
        }
      } catch {
        setAiInsight('');
      } finally {
        setAiLoading(false);
      }
    };
    fetchInsight();
  }, [currentTrack?.id, queue]);

  // AI Chat handler
  const handleAiChat = useCallback(async (e) => {
    e?.preventDefault();
    const msg = aiChatInput.trim();
    if (!msg || aiChatLoading) return;

    setAiChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setAiChatInput('');
    setAiChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, currentTrack })
      });
      const data = await res.json();

      setAiChatMessages(prev => [...prev, {
        role: 'ai',
        text: data.response || 'Let me find that for you!',
        songs: data.songs || []
      }]);

      // Auto-play the first result if songs were found
      if (data.songs && data.songs.length > 0) {
        playSong(data.songs[0], data.songs);
      }
    } catch {
      setAiChatMessages(prev => [...prev, { role: 'ai', text: 'Oops, something went wrong! Try again 🎵', songs: [] }]);
    } finally {
      setAiChatLoading(false);
    }
  }, [aiChatInput, aiChatLoading, currentTrack, playSong]);

  // Two-phase card slide transition: 'idle' | 'exit' | 'enter'
  const [displayedTrack, setDisplayedTrack] = useState(currentTrack);
  const [cardPhase, setCardPhase] = useState('idle');
  const prevTrackIdRef = useRef(currentTrack?.id);

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
    // Phase 1: trigger exit (slide down)
    setCardPhase('exit');
    const exitTimer = setTimeout(() => {
      // Phase 2: swap content, trigger enter (rise from below)
      setDisplayedTrack(currentTrack);
      prevTrackIdRef.current = currentTrack.id;
      setCardPhase('enter');
      const enterTimer = setTimeout(() => setCardPhase('idle'), 400);
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

  // Fetch lyrics when requested
  const handleToggleLyrics = async () => {
    if (!showLyrics && !lyrics) {
      setLoadingLyrics(true);
      try {
        const res = await fetch(`/api/lyrics?id=${currentTrack.id}`);
        const data = await res.json();
        if (data.lyrics) {
          setLyrics(data.lyrics.replace(/<br\s*[\/]?>/gi, '\n'));
        } else {
          setLyrics('No lyrics found for this song. Enjoy the rhythm! 🎵');
        }
      } catch {
        setLyrics('Unable to load lyrics at this moment.');
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

  return (
    <div className="full-player-sheet">
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
          onClick={() => setIsFullPlayerOpen(false)}
          title="Minimize"
        >
          <ChevronDown size={28} />
        </button>

        <div className="player-header-title">
          <span className="player-badge">Now Playing</span>
          <span className="player-playlist-name">Suno Music</span>
        </div>

        <button
          className="action-btn"
          onClick={handleAddPlaylist}
          title="Add to Playlist"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Center: Album Art Card or Lyrics */}
      {showLyrics ? (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '24px',
          backdropFilter: 'blur(20px)',
          margin: '10px 0',
          position: 'relative',
          zIndex: 2,
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1rem', color: '#ff85a2', marginBottom: '16px' }}>Lyrics</h3>
          {loadingLyrics ? (
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Finding lyrics...</p>
          ) : (
            <p style={{
              whiteSpace: 'pre-line',
              lineHeight: '2',
              fontSize: '1.05rem',
              color: '#ffffff',
              fontFamily: 'var(--font-display)'
            }}>
              {lyrics}
            </p>
          )}
        </div>
      ) : (
        <div className="player-card-container">
          {/* card-phase class drives exit-slide-down / enter-slide-up CSS keyframes */}
          <div
            className={`player-art-card card-phase-${cardPhase} ${isPlaying && cardPhase === 'idle' ? 'playing' : ''}`}
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

      {/* Track Details — slides together with the card */}
      <div className="player-details">
        <div className={`player-details-info details-phase-${cardPhase}`}>
          <div className="player-song-title">{track.title || 'Unknown Title'}</div>
          <div className="player-song-artist">{track.artist || 'Unknown Artist'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Waveform Visualizer */}
      <Visualizer isPlaying={isPlaying} />

      {/* Scrubber */}
      <div className="scrubber-container">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="scrubber-slider"
        />
        <div className="scrubber-times">
          <span>{formatTime(currentTime)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {currentTrack.isSpotify || currentTrack.source === 'spotify-resolved' || (currentTrack.badge && currentTrack.badge.includes('Spotify')) ? (
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

      {/* Main Controls */}
      <div className="player-actions-row">
        <button
          className={`action-btn ${isShuffle ? 'active' : ''}`}
          onClick={toggleShuffle}
          title="Shuffle"
        >
          <Shuffle size={20} color={isShuffle ? '#ff3b68' : 'currentColor'} />
        </button>

        <button className="action-btn" onClick={playPrev} title="Previous">
          <SkipBack size={26} />
        </button>

        <button className="play-main-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <Pause size={28} fill="#ffffff" strokeWidth={0} />
          ) : (
            <Play size={28} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '4px' }} />
          )}
        </button>

        <button className="action-btn" onClick={playNext} title="Next">
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

      {/* AI DJ Insight Bubble */}
      {aiInsight && (
        <div className="ai-dj-bubble" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          margin: '0 8px 4px',
          background: 'linear-gradient(135deg, rgba(162, 56, 255, 0.15) 0%, rgba(255, 59, 104, 0.12) 100%)',
          border: '1px solid rgba(162, 56, 255, 0.25)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          animation: 'aiDjFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: aiLoading ? 'aiDjPulse 1.5s ease-in-out infinite' : 'none'
          }}>
            <Sparkles size={14} color="#ffffff" />
          </div>
          <span style={{
            fontSize: '0.78rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.4,
            fontFamily: 'var(--font-display, "Outfit", sans-serif)'
          }}>
            {aiLoading ? 'AI DJ is thinking...' : aiInsight}
          </span>
        </div>
      )}

      {/* AI Chat Overlay */}
      {showAiChat && (
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '12px',
          right: '12px',
          maxHeight: '280px',
          background: 'rgba(15, 10, 25, 0.95)',
          border: '1px solid rgba(162, 56, 255, 0.3)',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 100,
          animation: 'aiChatSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          {/* Chat Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={13} color="#fff" />
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#d1b8ff', fontFamily: 'var(--font-display)' }}>AI DJ</span>
            </div>
            <button
              onClick={() => setShowAiChat(false)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '170px'
          }}>
            {aiChatMessages.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', textAlign: 'center', padding: '16px 0' }}>
                Ask me anything! Try "play chill vibes" or "something Punjabi and upbeat" 🎵
              </div>
            )}
            {aiChatMessages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #ff3b68, #a238ff)'
                  : 'rgba(255, 255, 255, 0.08)',
                fontSize: '0.8rem',
                color: '#ffffff',
                lineHeight: 1.4
              }}>
                {msg.text}
                {msg.songs && msg.songs.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                    🎵 Playing: {msg.songs[0].title} by {msg.songs[0].artist}
                  </div>
                )}
              </div>
            ))}
            {aiChatLoading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '8px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255, 255, 255, 0.08)',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.5)'
              }}>
                <span className="ai-typing-dots">Thinking</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleAiChat} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <input
              ref={chatInputRef}
              type="text"
              value={aiChatInput}
              onChange={e => setAiChatInput(e.target.value)}
              placeholder="Ask the AI DJ..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'var(--font-display)'
              }}
            />
            <button
              type="submit"
              disabled={!aiChatInput.trim() || aiChatLoading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: aiChatInput.trim() ? 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)' : 'rgba(255,255,255,0.08)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: aiChatInput.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s ease'
              }}
            >
              <Send size={16} color="#ffffff" />
            </button>
          </form>
        </div>
      )}

      {/* Footer Tools: Add to Playlist, AI DJ, Smart Flow Autoplay, & Lyrics */}
      <div className="player-footer-tools">
        <button
          className="tool-chip"
          onClick={handleAddPlaylist}
        >
          <ListPlus size={16} />
          <span>Add to Playlist</span>
        </button>

        <button
          className={`tool-chip ${showAiChat ? 'active' : ''}`}
          onClick={() => {
            setShowAiChat(!showAiChat);
            if (!showAiChat) {
              setTimeout(() => chatInputRef.current?.focus(), 100);
            }
          }}
          style={{
            borderColor: showAiChat ? 'rgba(162, 56, 255, 0.5)' : 'rgba(255,255,255,0.1)',
            color: showAiChat ? '#d1b8ff' : 'rgba(255,255,255,0.6)',
            background: showAiChat ? 'rgba(162, 56, 255, 0.15)' : undefined
          }}
        >
          <Sparkles size={16} />
          <span>AI DJ</span>
        </button>

        <button
          className={`tool-chip ${autoplayEnabled ? 'active' : ''}`}
          onClick={toggleAutoplay}
          title="Toggles Studio Master endless autoplay flow"
          style={{
            borderColor: autoplayEnabled ? 'rgba(29, 185, 84, 0.4)' : 'rgba(255,255,255,0.1)',
            color: autoplayEnabled ? '#1db954' : 'rgba(255,255,255,0.6)'
          }}
        >
          <InfinityIcon size={16} />
          <span>{autoplayEnabled ? 'Smart Flow' : 'Autoplay Off'}</span>
        </button>

        <button
          className={`tool-chip ${showLyrics ? 'active' : ''}`}
          onClick={handleToggleLyrics}
        >
          <FileText size={16} />
          <span>{showLyrics ? 'Hide Lyrics' : 'Lyrics'}</span>
        </button>
      </div>
    </div>
  );
}
