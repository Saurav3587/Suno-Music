import React, { useState } from 'react';
import Navigation from './components/Navigation';
import MiniPlayer from './components/Player/MiniPlayer';
import FullPlayer from './components/Player/FullPlayer';
import YouTubeEngine from './components/Player/YouTubeEngine';
import PlaylistModal from './components/PlaylistModal';
import UserSettingsModal from './components/UserSettingsModal';
import AuthScreen from './components/AuthScreen';

import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import ForYouView from './views/ForYouView';
import LibraryView from './views/LibraryView';

import { useMusic } from './context/MusicContext';
import { useUser } from './context/UserContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [playlistModalSong, setPlaylistModalSong] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState(null);

  const handleOpenPlaylist = (playlistId) => {
    setPendingPlaylistId(playlistId || null);
    setActiveTab('library');
  };

  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    volume,
    handleSongEnded,
    ytPlayerRef,
    isFullPlayerOpen
  } = useMusic();

  const { isLoggedIn } = useUser();

  const handleOpenAddToPlaylist = (song) => {
    setPlaylistModalSong(song);
  };

  const handleClosePlaylistModal = () => {
    setPlaylistModalSong(null);
  };

  // Strictly gate the entire app: Spotify requires sign up or log in to open the app
  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      {/* Ambient background glows */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      {/* Embedded Background YouTube Engine */}
      <YouTubeEngine
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
        onStateChange={setIsPlaying}
        onEnded={handleSongEnded}
        ytPlayerRef={ytPlayerRef}
      />

      {/* Main Tab Content */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeView
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAddToPlaylist={handleOpenAddToPlaylist}
            onOpenPlaylist={handleOpenPlaylist}
          />
        )}
        {activeTab === 'search' && (
          <SearchView
            onOpenAddToPlaylist={handleOpenAddToPlaylist}
          />
        )}
        {activeTab === 'foryou' && (
          <ForYouView onOpenAddToPlaylist={handleOpenAddToPlaylist} />
        )}
        {activeTab === 'library' && (
          <LibraryView
            onOpenAddToPlaylist={handleOpenAddToPlaylist}
            onOpenPlaylistId={pendingPlaylistId}
          />
        )}
      </main>

      {/* Floating Mini Player (only when song is selected) */}
      <MiniPlayer />

      {/* Bottom Navigation Tabs */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Full Screen Player Modal */}
      {isFullPlayerOpen && (
        <FullPlayer onAddToPlaylist={handleOpenAddToPlaylist} />
      )}

      {/* Add to Playlist Modal */}
      {playlistModalSong && (
        <PlaylistModal song={playlistModalSong} onClose={handleClosePlaylistModal} />
      )}

      {/* User Profile & Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}


    </div>
  );
}
