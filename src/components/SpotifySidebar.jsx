import React from 'react';
import {
  Home,
  Search,
  Sparkles,
  Library,
  Plus,
  Heart,
  Music2,
  Settings
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useMusic } from '../context/MusicContext';

export default function SpotifySidebar({
  activeTab,
  onNavigateTab,
  onOpenPlaylist,
  onOpenSettings
}) {
  const { playlists = [], createPlaylist, userName, userAvatar } = useUser();
  const { likedSongs = [] } = useMusic();

  const handleCreateNewPlaylist = () => {
    const name = window.prompt('Enter playlist name:');
    if (name && name.trim()) {
      createPlaylist(name.trim());
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'foryou', label: 'For You', icon: Sparkles },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <aside className="spotify-sidebar">
      {/* Brand Header */}
      <div className="spotify-sidebar-brand" onClick={() => onNavigateTab('home')}>
        <div className="spotify-sidebar-logo-icon">
          <Music2 size={22} color="#ffffff" />
        </div>
        <span className="spotify-sidebar-brand-name">Suno Music</span>
      </div>

      {/* Main Nav Items */}
      <nav className="spotify-sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`spotify-sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigateTab(item.id)}
            >
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="spotify-sidebar-playlists-section">
        <div className="spotify-sidebar-section-header">
          <span>YOUR PLAYLISTS</span>
          <button
            className="spotify-sidebar-add-btn"
            onClick={handleCreateNewPlaylist}
            title="Create new playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Pinned Liked Songs */}
        <div
          className="spotify-sidebar-playlist-item liked"
          onClick={() => onOpenPlaylist({ id: '__liked__', name: 'Liked Songs', isLiked: true, songs: likedSongs })}
        >
          <div className="spotify-sidebar-liked-thumb">
            <Heart size={14} fill="#ffffff" color="#ffffff" />
          </div>
          <div className="spotify-sidebar-playlist-info">
            <span className="name">Liked Songs</span>
            <span className="count">{likedSongs.length} songs</span>
          </div>
        </div>

        {/* Scrollable list of user playlists */}
        <div className="spotify-sidebar-scroll-list">
          {playlists.map(pl => (
            <button
              key={pl.id}
              className="spotify-sidebar-playlist-link"
              onClick={() => onOpenPlaylist({ ...pl, isUserPlaylist: true })}
            >
              <span className="title">{pl.name}</span>
              <span className="meta">{Array.isArray(pl.songs) ? pl.songs.length : 0} songs</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom User Pill */}
      <div className="spotify-sidebar-footer">
        <button className="spotify-sidebar-user-btn" onClick={onOpenSettings} title="User Profile & Settings">
          <div className="spotify-sidebar-avatar">
            {userAvatar && (userAvatar.startsWith('data:image/') || userAvatar.startsWith('http')) ? (
              <img src={userAvatar} alt="" />
            ) : (
              userName ? userName.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="spotify-sidebar-username">
            <span>{userName || 'Account'}</span>
          </div>
          <Settings size={16} color="rgba(255,255,255,0.5)" />
        </button>
      </div>
    </aside>
  );
}
