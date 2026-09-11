import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Maximize2,
  FileText,
  Sparkles
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

function fmtTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function DesktopPlayer({ onSearchArtist }) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    togglePlay,
    seekTo,
    playNext,
    playPrev,
    toggleLike,
    isLiked,
    setIsFullPlayerOpen
  } = useMusic();

  const [prevVolume, setPrevVolume] = useState(1);

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  const handleArtistClick = (e) => {
    if (onSearchArtist && currentTrack.artist) {
      e.stopPropagation();
      onSearchArtist(currentTrack.artist);
    }
  };

  return (
    <footer className="spotify-desktop-player">
      {/* 1. Left Track Info */}
      <div className="desktop-player-left">
        <div
          className="desktop-player-cover-wrap"
          onClick={() => setIsFullPlayerOpen(true)}
          title="Expand now playing"
        >
          <img
            src={currentTrack.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80'}
            alt={currentTrack.title}
          />
        </div>

        <div className="desktop-player-track-info">
          <div
            className="desktop-player-title"
            onClick={() => setIsFullPlayerOpen(true)}
            title={currentTrack.title}
          >
            {currentTrack.title}
          </div>
          <div
            className={`desktop-player-artist ${onSearchArtist ? 'artist-clickable' : ''}`}
            onClick={handleArtistClick}
            title={currentTrack.artist}
          >
            {currentTrack.artist}
          </div>
        </div>

        <button
          className={`desktop-player-heart-btn ${liked ? 'active' : ''}`}
          onClick={() => toggleLike(currentTrack)}
          title={liked ? 'Remove from your Liked Songs' : 'Save to your Liked Songs'}
        >
          <Heart size={18} fill={liked ? '#ff3b68' : 'none'} color={liked ? '#ff3b68' : 'currentColor'} />
        </button>
      </div>

      {/* 2. Center Playback Controls & Scrubber */}
      <div className="desktop-player-center">
        <div className="desktop-player-controls">
          <button
            className={`desktop-control-btn ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            <Shuffle size={16} />
          </button>

          <button
            className="desktop-control-btn"
            onClick={playPrev}
            title="Previous"
          >
            <SkipBack size={19} />
          </button>

          <button
            className="desktop-play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} fill="#08070d" strokeWidth={0} />
            ) : (
              <Play size={18} fill="#08070d" strokeWidth={0} style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            className="desktop-control-btn"
            onClick={playNext}
            title="Next"
          >
            <SkipForward size={19} />
          </button>

          <button
            className={`desktop-control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={toggleRepeat}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        <div className="desktop-scrubber-bar">
          <span className="desktop-time-stamp">{fmtTime(currentTime)}</span>
          <div className="desktop-range-container">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="desktop-progress-slider"
              style={{
                background: `linear-gradient(to right, #ff3b68 0%, #ff3b68 ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%, rgba(255, 255, 255, 0.2) 100%)`
              }}
            />
          </div>
          <span className="desktop-time-stamp">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right Volume & Extra Actions */}
      <div className="desktop-player-right">
        <button
          className="desktop-control-btn"
          onClick={() => setIsFullPlayerOpen(true)}
          title="Open Fullscreen Player & Lyrics"
        >
          <Maximize2 size={16} />
        </button>

        <div className="desktop-volume-bar">
          <button
            className="desktop-control-btn"
            onClick={toggleMute}
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="desktop-volume-slider"
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume * 100}%, rgba(255, 255, 255, 0.2) ${volume * 100}%, rgba(255, 255, 255, 0.2) 100%)`
            }}
          />
        </div>
      </div>
    </footer>
  );
}
