import React from 'react';
import { ChevronLeft, ChevronRight, User, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function SpotifyTopBar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onOpenSettings,
  currentView,
  playlistName
}) {
  const { userName, userAvatar } = useUser();

  const getViewTitle = () => {
    if (currentView === 'playlist') return playlistName || 'Playlist';
    if (currentView === 'search') return 'Search';
    if (currentView === 'foryou') return 'For You';
    if (currentView === 'library') return 'Your Library';
    return '';
  };

  return (
    <header className="spotify-top-bar">
      {/* History Navigation Buttons */}
      <div className="spotify-topbar-history-btns">
        <button
          className="spotify-history-btn"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Go back"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          className="spotify-history-btn"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Go forward"
        >
          <ChevronRight size={22} />
        </button>

        {/* Current title if on sub-page */}
        {getViewTitle() && (
          <span className="spotify-topbar-page-label">
            {getViewTitle()}
          </span>
        )}
      </div>

      {/* Right User Profile */}
      <div className="spotify-topbar-right">
        <button
          className="spotify-topbar-profile-pill"
          onClick={onOpenSettings}
          title="Profile & Settings"
        >
          <div className="spotify-topbar-avatar">
            {userAvatar && (userAvatar.startsWith('data:image/') || userAvatar.startsWith('http')) ? (
              <img src={userAvatar} alt="" />
            ) : (
              userName ? userName.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <span className="spotify-topbar-username">{userName ? userName.split(' ')[0] : 'Account'}</span>
        </button>
      </div>
    </header>
  );
}
