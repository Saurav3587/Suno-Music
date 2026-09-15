import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export default function SongRow({
  song,
  index,
  playlist = null,
  isPlaylist = false,
  onAddToPlaylist = null,
  onOpenNote = null,
  isFromSearch = false,
  onSearchArtist = null,
  isGlass = false,
  className = '',
  onSongClick = null
}) {
  const { currentTrack, isPlaying, playSong, togglePlay, toggleLike, isLiked } = useMusic();

  const isCurrent = currentTrack?.id === song.id;
  const liked = isLiked(song.id);
  const playlistHandler = onAddToPlaylist || onOpenNote;

  const handleRowClick = () => {
    if (onSongClick) onSongClick(song);
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, playlist, { isPlaylist, isFromSearch });
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    toggleLike(song);
  };

  const handleAddPlaylist = (e) => {
    e.stopPropagation();
    if (playlistHandler) playlistHandler(song);
  };

  const handleArtistClick = (e) => {
    if (onSearchArtist && song.artist) {
      e.stopPropagation();
      onSearchArtist(song.artist);
    }
  };

  return (
    <div
      className={`song-row ${isGlass ? 'glass-block' : ''} ${className} ${isCurrent ? 'active' : ''}`}
      onClick={handleRowClick}
    >
      {typeof index === 'number' && (
        <span className="song-row-number">{index + 1}</span>
      )}

      <div className="song-row-thumb">
        <img src={song.image} alt={song.title} loading="lazy" />
        {isCurrent && isPlaying && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div className="equalizer">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          </div>
        )}
      </div>

      <div className="song-row-info">
        <div className="song-row-title">{song.title}</div>
        <div className="song-row-meta">
          {song.isSpotify || song.source === 'spotify-resolved' || (song.badge && song.badge.includes('Spotify')) ? (
            <span style={{
              background: 'rgba(29, 185, 84, 0.15)',
              color: '#1db954',
              border: '1px solid rgba(29, 185, 84, 0.3)',
              borderRadius: '6px',
              padding: '1px 6px',
              fontSize: '0.66rem',
              fontWeight: 600
            }}>
              Spotify 320k
            </span>
          ) : song.source === 'youtube' || song.youtubeId ? (
            <span style={{
              background: 'rgba(255, 50, 50, 0.15)',
              color: '#ff6b6b',
              border: '1px solid rgba(255, 50, 50, 0.25)',
              borderRadius: '6px',
              padding: '1px 6px',
              fontSize: '0.66rem',
              fontWeight: 600
            }}>
              {song.isAcoustic ? 'Acoustic Cover' : 'YouTube Music'}
            </span>
          ) : (
            <span style={{
              background: 'rgba(255, 117, 140, 0.14)',
              color: '#ff85a2',
              border: '1px solid rgba(255, 117, 140, 0.25)',
              borderRadius: '6px',
              padding: '1px 6px',
              fontSize: '0.66rem',
              fontWeight: 600
            }}>
              320k Master
            </span>
          )}
          <span
            className={onSearchArtist ? 'artist-clickable' : ''}
            onClick={handleArtistClick}
            title={onSearchArtist ? `Search songs by ${song.artist}` : undefined}
          >
            {song.artist}
          </span>
        </div>
      </div>

      <div className="song-row-actions">
        {playlistHandler && (
          <button
            className="action-btn"
            onClick={handleAddPlaylist}
            title="Add to Playlist"
          >
            <Plus size={19} />
          </button>
        )}

        <button
          className={`action-btn ${liked ? 'active' : ''}`}
          onClick={handleLike}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={18} fill={liked ? '#ff3b68' : 'none'} color={liked ? '#ff3b68' : 'currentColor'} />
        </button>
      </div>
    </div>
  );
}
