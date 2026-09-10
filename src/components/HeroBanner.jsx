import React from 'react';
import { Sparkles, Play, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useMusic } from '../context/MusicContext';

export default function HeroBanner({ onOpenSettings }) {
  const { userName, userBio, userAvatar, playlists, currentUser } = useUser();
  const { recentSongs, likedSongs, playSong } = useMusic();

  const handleQuickPlay = () => {
    if (recentSongs.length > 0) {
      playSong(recentSongs[0], recentSongs);
    }
  };

  return (
    <div className="dedication-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            onClick={onOpenSettings}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.25), rgba(123, 44, 191, 0.35))',
              border: '2px solid rgba(255, 117, 140, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 59, 104, 0.2)',
              overflow: 'hidden'
            }}
            title="Edit Profile"
          >
            {userAvatar && (userAvatar.startsWith('data:image/') || userAvatar.startsWith('http://') || userAvatar.startsWith('https://') || userAvatar.startsWith('blob:')) ? (
              <img
                src={userAvatar}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              userAvatar || (userName ? userName.charAt(0).toUpperCase() : 'A')
            )}
          </div>
          <div>
            <div className="dedication-badge" style={{ marginBottom: 0 }}>
              <Sparkles size={11} />
              <span>Suno Music Stream</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={onOpenSettings}
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#1db954',
              background: 'rgba(29, 185, 84, 0.15)',
              border: '1px solid rgba(29, 185, 84, 0.3)',
              padding: '4px 10px',
              borderRadius: '100px',
              cursor: 'pointer'
            }}
          >
            @{currentUser?.userId || 'user'}
          </div>

          <button
            onClick={onOpenSettings}
            title="Profile & Settings"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.85)',
              padding: '7px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <h1 className="dedication-title" style={{ marginTop: '12px' }}>
        Welcome back, {userName}
      </h1>
      <p className="dedication-subtitle">"{userBio}"</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '14px' }}>
        {recentSongs.length > 0 && (
          <button
            onClick={handleQuickPlay}
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              color: '#08060d',
              border: 'none',
              borderRadius: '100px',
              padding: '8px 18px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)'
            }}
          >
            <Play size={14} fill="#08060d" strokeWidth={0} />
            <span>Resume Listening</span>
          </button>
        )}
      </div>

      <div className="dedication-stats">
        <div className="stat-item">
          <span className="stat-value">{likedSongs.length}</span>
          <span className="stat-label">Favorites</span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
        <div className="stat-item">
          <span className="stat-value">{playlists.length}</span>
          <span className="stat-label">Playlists</span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
        <div className="stat-item">
          <span className="stat-value">{recentSongs.length}</span>
          <span className="stat-label">Recents</span>
        </div>
      </div>
    </div>
  );
}
