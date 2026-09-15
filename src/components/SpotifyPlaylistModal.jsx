import React, { useState, useEffect } from 'react';
import { X, Play, Shuffle, Bookmark, Check, Sparkles, Disc3 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useUser } from '../context/UserContext';
import SongRow from './SongRow';

// Spotify official SVG Icon
function SpotifyIcon({ size = 18, color = '#1db954' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.471-1.044.253-2.864-1.75-6.47-2.146-10.718-1.176-.411.094-.823-.16-.917-.571-.094-.411.16-.823.571-.917 4.654-1.063 8.647-.611 11.855 1.348.358.218.471.686.253 1.063zm1.472-3.276c-.275.447-.86.589-1.307.314-3.28-2.016-8.28-2.599-12.16-1.421-.502.152-1.037-.133-1.189-.635-.152-.502.133-1.037.635-1.189 4.433-1.344 9.94-.7-13.626 1.564.447.275.589.86.314 1.307zm.126-3.41c-3.933-2.336-10.426-2.55-14.204-1.403-.604.183-1.246-.162-1.429-.766-.183-.604.162-1.246.766-1.429 4.343-1.318 11.516-1.069 16.037 1.614.542.322.721 1.026.399 1.568-.322.542-1.026.721-1.568.399z" />
    </svg>
  );
}

// YouTube official SVG Icon
function YoutubeIcon({ size = 18, color = '#ff0000' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" fill={color} />
      <polygon points="10 15 15 12 10 9" fill="#ffffff" />
    </svg>
  );
}

export default function SpotifyPlaylistModal({ playlistKeyOrId, initialData, onClose, onOpenAddToPlaylist }) {
  const { playSong } = useMusic();
  const { createPlaylist, addSongToPlaylist } = useUser();
  const [playlist, setPlaylist] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData?.songs || initialData.songs.length === 0);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  useEffect(() => {
    if (!playlistKeyOrId) return;

    let isMounted = true;
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/spotify/playlist/${playlistKeyOrId}`);
        const data = await res.json();
        if (isMounted && data && !data.error) {
          setPlaylist(data);
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlaylist();
    return () => {
      isMounted = false;
    };
  }, [playlistKeyOrId]);

  if (!playlistKeyOrId) return null;

  const songs = playlist?.songs || [];

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, { isPlaylist: true });
    }
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled, { isPlaylist: true });
    }
  };

  const handleSaveToLibrary = () => {
    if (!playlist || savedToLibrary) return;
    const newPl = createPlaylist(playlist.name);
    if (newPl && songs.length > 0) {
      // Add first 30 songs to the new user playlist
      songs.slice(0, 30).forEach(song => {
        addSongToPlaylist(newPl.id, song);
      });
      setSavedToLibrary(true);
      setTimeout(() => setSavedToLibrary(false), 3000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9000,
        backgroundColor: 'rgba(8, 7, 13, 0.92)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '90vh',
          maxHeight: '840px',
          background: 'linear-gradient(180deg, #181326 0%, #0c0916 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(29, 185, 84, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient Top Glow from cover */}
        {playlist?.cover && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '240px',
              backgroundImage: `url(${playlist.cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(45px)',
              opacity: 0.28,
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        )}

        {/* Header Bar */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {playlist?.source === 'youtube' ? (
              <>
                <YoutubeIcon size={20} color="#ff0000" />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.5px', color: '#ff4d4d', textTransform: 'uppercase' }}>
                  YouTube Music Playlist
                </span>
              </>
            ) : playlist?.source === 'saavn' ? (
              <>
                <Sparkles size={18} color="#ff85a2" />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.5px', color: '#ff85a2', textTransform: 'uppercase' }}>
                  Studio 320k Curated
                </span>
              </>
            ) : (
              <>
                <SpotifyIcon size={20} />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.5px', color: '#1db954', textTransform: 'uppercase' }}>
                  Spotify Official
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease, transform 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 80px'
        }}>
          {/* Hero Details */}
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '18px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(29, 185, 84, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: '#1a1426'
            }}>
              {playlist?.cover ? (
                <img
                  src={playlist.cover}
                  alt={playlist?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SpotifyIcon size={44} />
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(29, 185, 84, 0.16)',
                border: '1px solid rgba(29, 185, 84, 0.4)',
                borderRadius: '100px',
                padding: '2px 9px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#1db954',
                marginBottom: '6px'
              }}>
                <Sparkles size={11} />
                <span>{playlist?.badge || 'Flagship Playlist'}</span>
              </div>

              <h2 style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                color: '#ffffff',
                lineHeight: 1.2,
                margin: '0 0 6px 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {playlist?.name || 'Spotify Playlist'}
              </h2>

              <p style={{
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.65)',
                margin: '0 0 8px 0',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {playlist?.description || 'Curated by Spotify editors for millions of daily listeners worldwide.'}
              </p>

              <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600 }}>
                {songs.length > 0 ? `${songs.length} tracks • Master 320k Audio` : 'Loading tracks...'}
              </div>
            </div>
          </div>

          {/* Action Buttons: Play All, Shuffle, Save to Library */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '22px' }}>
            <button
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              style={{
                flex: 1.4,
                height: '44px',
                borderRadius: '500px',
                background: 'linear-gradient(135deg, #1db954 0%, #179b44 100%)',
                color: '#ffffff',
                border: 'none',
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: songs.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(29, 185, 84, 0.4)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={e => { if (songs.length > 0) { e.currentTarget.style.transform = 'scale(1.03)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Play size={16} fill="#ffffff" strokeWidth={0} />
              <span>Play All</span>
            </button>

            <button
              onClick={handleShuffle}
              disabled={songs.length === 0}
              title="Shuffle Playlist"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: songs.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
            >
              <Shuffle size={17} />
            </button>

            <button
              onClick={handleSaveToLibrary}
              disabled={songs.length === 0 || savedToLibrary}
              title="Save to My Library"
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '500px',
                background: savedToLibrary ? 'rgba(29, 185, 84, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: savedToLibrary ? '1px solid #1db954' : '1px solid rgba(255, 255, 255, 0.14)',
                color: savedToLibrary ? '#1db954' : '#ffffff',
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {savedToLibrary ? (
                <>
                  <Check size={15} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Bookmark size={15} />
                  <span>Add to Library</span>
                </>
              )}
            </button>
          </div>

          {/* Songs List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255, 255, 255, 0.5)' }}>
                <Disc3 size={32} className="spin-slow" style={{ margin: '0 auto 12px auto', color: '#1db954' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Official Spotify Master Tracklist...</div>
              </div>
            ) : songs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255, 255, 255, 0.5)' }}>
                No tracks found for this playlist.
              </div>
            ) : (
              songs.map((song, i) => (
                <SongRow
                  key={`sp-modal-${song.id}-${i}`}
                  song={song}
                  index={i}
                  playlist={songs}
                  isPlaylist={true}
                  onAddToPlaylist={onOpenAddToPlaylist}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
