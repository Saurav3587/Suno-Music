import React from 'react';
import { Play, Pause } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80';

export default function SongCard({ song, playlist = null }) {
  const { currentTrack, isPlaying, playSong, togglePlay } = useMusic();
  const isCurrent = currentTrack?.id === song.id;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlist);
    }
  };

  const imgSrc = song.image || FALLBACK_IMAGE;
  const title = song.title || 'Unknown Title';
  const artist = song.artist || 'Unknown Artist';

  return (
    <div className="song-card" onClick={handleClick}>
      <div className="card-image-wrap">
        <img
          src={imgSrc}
          alt={title}
          className="card-image"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_IMAGE) {
              e.currentTarget.src = FALLBACK_IMAGE;
            }
          }}
        />
        {song.badge && (
          <div style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            background: song.badge.startsWith('#') ? 'linear-gradient(135deg, #ff4b72 0%, #a238ff 100%)' : 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '100px',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            zIndex: 2,
            letterSpacing: '0.2px'
          }}>
            {song.badge}
          </div>
        )}
        <div className="card-play-overlay">
          {isCurrent && isPlaying ? (
            <Pause size={18} fill="#ffffff" strokeWidth={0} />
          ) : (
            <Play size={18} fill="#ffffff" strokeWidth={0} style={{ marginLeft: '2px' }} />
          )}
        </div>
      </div>
      <div className="card-info">
        <span className="card-title" title={title}>{title}</span>
        <span className="card-artist" title={artist}>{artist}</span>
      </div>
    </div>
  );
}
