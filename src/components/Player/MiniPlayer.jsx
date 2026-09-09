import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Heart } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playNext,
    setIsFullPlayerOpen,
    toggleLike,
    isLiked
  } = useMusic();

  const [displayedTrack, setDisplayedTrack] = useState(currentTrack);
  const [miniPhase, setMiniPhase] = useState('idle');
  const prevMiniIdRef = useRef(currentTrack?.id);

  useEffect(() => {
    if (!currentTrack) {
      setDisplayedTrack(null);
      prevMiniIdRef.current = null;
      return;
    }
    // If no previous track was loaded, display immediately without transition
    if (!prevMiniIdRef.current) {
      setDisplayedTrack(currentTrack);
      prevMiniIdRef.current = currentTrack.id;
      return;
    }
    if (currentTrack.id === prevMiniIdRef.current) return;
    // Slide out left
    setMiniPhase('exit');
    const exitTimer = setTimeout(() => {
      setDisplayedTrack(currentTrack);
      prevMiniIdRef.current = currentTrack.id;
      setMiniPhase('enter');
      const enterTimer = setTimeout(() => setMiniPhase('idle'), 360);
      return () => clearTimeout(enterTimer);
    }, 180);
    return () => clearTimeout(exitTimer);
  }, [currentTrack]);

  const track = displayedTrack || currentTrack;
  if (!currentTrack || !track) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div className="mini-player-dock" onClick={() => setIsFullPlayerOpen(true)}>
      <div className="mini-progress-bar">
        <div
          className="mini-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mini-player-content">
        <div className={`mini-thumb-wrapper mini-phase-${miniPhase}`}>
          <img
            src={track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80'}
            alt={track.title || 'Playing track'}
            className="mini-thumb"
          />
        </div>

        <div className={`mini-info mini-phase-${miniPhase}`}>
          <div className="mini-title">{track.title || 'Unknown Title'}</div>
          <div className="mini-artist">{track.artist || 'Unknown Artist'}</div>
        </div>

        <div className="mini-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn"
            onClick={() => toggleLike(currentTrack)}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={20}
              fill={liked ? '#ff3b68' : 'none'}
              color={liked ? '#ff3b68' : 'currentColor'}
            />
          </button>

          <button
            className="mini-play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} fill="#ffffff" strokeWidth={0} />
            ) : (
              <Play size={18} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            className="action-btn"
            onClick={playNext}
            title="Next Track"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
