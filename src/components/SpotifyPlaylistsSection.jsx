import React, { useState, useEffect } from 'react';
import { Play, Disc3 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

function SpotifyIcon({ size = 18, color = '#1db954' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.471-1.044.253-2.864-1.75-6.47-2.146-10.718-1.176-.411.094-.823-.16-.917-.571-.094-.411.16-.823.571-.917 4.654-1.063 8.647-.611 11.855 1.348.358.218.471.686.253 1.063zm1.472-3.276c-.275.447-.86.589-1.307.314-3.28-2.016-8.28-2.599-12.16-1.421-.502.152-1.037-.133-1.189-.635-.152-.502.133-1.037.635-1.189 4.433-1.344 9.94-.7-13.626 1.564.447.275.589.86.314 1.307zm.126-3.41c-3.933-2.336-10.426-2.55-14.204-1.403-.604.183-1.246-.162-1.429-.766-.183-.604.162-1.246.766-1.429 4.343-1.318 11.516-1.069 16.037 1.614.542.322.721 1.026.399 1.568-.322.542-1.026.721-1.568.399z" />
    </svg>
  );
}

const CATEGORY_CHIPS = [
  { id: 'all',     label: 'All' },
  { id: 'india',   label: 'India & Desi' },
  { id: 'charts',  label: 'Top Charts' },
  { id: 'genres',  label: 'Rap & Pop' },
  { id: 'moods',   label: 'Chill & Focus' },
  { id: 'decades', label: 'Classics' }
];

export default function SpotifyPlaylistsSection({ onSelectPlaylist }) {
  const { playSong } = useMusic();
  const [playlists, setPlaylists] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [playingPlaylistKey, setPlayingPlaylistKey] = useState(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/spotify/playlists');
        const data = await res.json();
        if (data && data.playlists) {
          setPlaylists(data.playlists);
        }
      } catch (err) {
        console.error('Failed to load Spotify playlists:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const filteredPlaylists = activeCategory === 'all'
    ? playlists
    : playlists.filter(p => p.category === activeCategory);

  // Quick 1-click play of the playlist
  const handleQuickPlay = async (e, playlist) => {
    e.stopPropagation();
    try {
      setPlayingPlaylistKey(playlist.key);
      const res = await fetch(`/api/spotify/playlist/${playlist.key}`);
      const data = await res.json();
      if (data && data.songs && data.songs.length > 0) {
        playSong(data.songs[0], data.songs);
      }
    } catch (err) {
      console.error('Failed to quick play Spotify playlist:', err);
    } finally {
      setPlayingPlaylistKey(null);
    }
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      {/* Section Header */}
      <div className="section-header" style={{ marginTop: '14px', marginBottom: '8px' }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SpotifyIcon size={20} />
          <span>Official Spotify Playlists</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="section-subtitle" style={{ color: '#1db954', fontWeight: 700 }}>
            {playlists.length || 24} Playlists
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{
        display: 'flex',
        gap: '7px',
        overflowX: 'auto',
        padding: '2px 0 10px 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {CATEGORY_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveCategory(chip.id)}
            style={{
              whiteSpace: 'nowrap',
              padding: '6px 14px',
              borderRadius: '100px',
              border: activeCategory === chip.id ? '1px solid rgba(29, 185, 84, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeCategory === chip.id ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: activeCategory === chip.id ? '#1db954' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.78rem',
              fontWeight: activeCategory === chip.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Playlists Horizontal Row */}
      <div className="horizontal-scroll-row" style={{ paddingTop: '2px', paddingBottom: '8px' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '144px',
                flexShrink: 0,
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '10px',
                opacity: 0.5
              }}
            >
              <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.08)', marginBottom: '8px' }} />
              <div style={{ height: '12px', width: '80%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginBottom: '4px' }} />
              <div style={{ height: '10px', width: '50%', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
            </div>
          ))
        ) : (
          filteredPlaylists.map(pl => (
            <div
              key={pl.key || pl.id}
              onClick={() => onSelectPlaylist && onSelectPlaylist(pl)}
              style={{
                width: '148px',
                flexShrink: 0,
                cursor: 'pointer',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '10px',
                position: 'relative',
                transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease, border-color 0.22s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.4)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(29, 185, 84, 0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Cover Image Wrap */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1/1',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
                background: '#151120',
                marginBottom: '10px'
              }}>
                <img
                  src={pl.cover}
                  alt={pl.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />

                {/* Spotify Logo Pill Top Left */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '100px',
                  padding: '3px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <SpotifyIcon size={12} />
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1db954' }}>
                    {pl.badge || 'Official'}
                  </span>
                </div>

                {/* 1-Click Play Overlay Button */}
                <button
                  onClick={e => handleQuickPlay(e, pl)}
                  title={`Play ${pl.title}`}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#1db954',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, background 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.background = '#1ed760'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#1db954'; }}
                >
                  {playingPlaylistKey === pl.key ? (
                    <Disc3 size={18} className="spin-slow" />
                  ) : (
                    <Play size={15} fill="#ffffff" strokeWidth={0} />
                  )}
                </button>
              </div>

              {/* Text Meta */}
              <div style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '3px'
              }}>
                {pl.title}
              </div>

              <div style={{
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '26px'
              }}>
                {pl.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
