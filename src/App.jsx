import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import Navigation from './components/Navigation';
import MiniPlayer from './components/Player/MiniPlayer';
import FullPlayer from './components/Player/FullPlayer';
import YouTubeEngine from './components/Player/YouTubeEngine';
import PlaylistModal from './components/PlaylistModal';
import UnifiedPlaylistModal from './components/UnifiedPlaylistModal';
import UserSettingsModal from './components/UserSettingsModal';
import ImportPlaylistModal from './components/ImportPlaylistModal';
import SplashScreen from './components/SplashScreen';
import AuthScreen from './components/AuthScreen';
import UpdateDialog from './components/UpdateDialog';
import { checkForUpdate, isNewerVersion, CURRENT_VERSION } from './utils/updater';

import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import ForYouView from './views/ForYouView';
import LibraryView from './views/LibraryView';
import PlaylistPageView from './views/PlaylistPageView';

import { useMusic } from './context/MusicContext';
import { useUser } from './context/UserContext';

export default function App() {
  // Mobile History Stack: keeps all pages seamlessly connected
  const [history, setHistory] = useState([{ view: 'home', params: {} }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentRoute = useMemo(() => {
    return history[historyIndex] || { view: 'home', params: {} };
  }, [history, historyIndex]);

  const activeView = currentRoute.view;
  const currentParams = currentRoute.params || {};

  const canGoBack = historyIndex > 0;

  const navigateTo = (view, params = {}) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, { view, params }];
    });
    setHistoryIndex(prev => prev + 1);
    try {
      window.history.pushState({ view, params }, '');
    } catch (_) {}
  };

  const goBack = () => {
    if (canGoBack) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleNavigateTab = (tabId) => {
    if (tabId === activeView && Object.keys(currentParams).length === 0) return;
    navigateTo(tabId, {});
  };

  const handleOpenPlaylist = (playlist) => {
    if (!playlist) {
      navigateTo('library', {});
      return;
    }
    navigateTo('playlist', { playlist });
  };

  const handleSearchArtist = (artistName) => {
    if (!artistName) return;
    navigateTo('search', { query: artistName });
  };

  const [playlistModalSong, setPlaylistModalSong] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  // OTA Update state
  const [updateInfo, setUpdateInfo] = useState(null);   // { version, releaseNotes, forceUpdate }
  const [updateChecked, setUpdateChecked] = useState(false);

  // Check for update silently after splash finishes
  const handleSplashFinish = useCallback(async () => {
    setShowSplash(false);
    try {
      const info = await checkForUpdate();
      if (info && isNewerVersion(CURRENT_VERSION, info.version)) {
        setUpdateInfo(info);
      }
    } catch (_) {
      // Network error — silently skip update check
    } finally {
      setUpdateChecked(true);
    }
  }, []);

  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    volume,
    handleSongEnded,
    ytPlayerRef,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    activePlaylistModal,
    closePlaylist
  } = useMusic();

  const { isLoggedIn } = useUser();

  const isAnyModalOpen = Boolean(
    isImportModalOpen ||
    isSettingsOpen ||
    activePlaylistModal ||
    isFullPlayerOpen ||
    playlistModalSong
  );

  // Lock background scrolling completely whenever any sheet or modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('modal-scroll-lock');
      try {
        window.history.pushState({ modal: true }, '');
      } catch (_) {}
    } else {
      document.body.classList.remove('modal-scroll-lock');
    }
    return () => {
      document.body.classList.remove('modal-scroll-lock');
    };
  }, [isAnyModalOpen]);

  const handleOpenAddToPlaylist = (song) => {
    setPlaylistModalSong(song);
  };

  const handleClosePlaylistModal = () => {
    setPlaylistModalSong(null);
  };

  // Universal Back Handler: ImportModal -> FullPlayer -> Profile -> Modals -> Page History Stack -> Home -> Exit
  const handleUniversalBack = useCallback(() => {
    // 0. If Import Playlist modal is open, close it
    if (isImportModalOpen) {
      setIsImportModalOpen(false);
      return true;
    }

    // 1. If Full Player is open, minimize to mini-player
    if (isFullPlayerOpen) {
      setIsFullPlayerOpen(false);
      return true;
    }

    // 2. If Settings / User Profile page is open, close it
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }

    // 3. If Add to Playlist modal is open, close it
    if (playlistModalSong) {
      setPlaylistModalSong(null);
      return true;
    }

    // 4. If an active playlist modal is open, close it
    if (activePlaylistModal) {
      closePlaylist();
      return true;
    }

    // 5. If we have previous history in stack, go back to recent page
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      return true;
    }

    // 6. If on a sub-tab (search, foryou, library) but at base history, return to home
    if (activeView !== 'home') {
      setHistory([{ view: 'home', params: {} }]);
      setHistoryIndex(0);
      return true;
    }

    // 7. Already at root Home with zero overlays -> Allow App Exit
    return false;
  }, [
    isImportModalOpen,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    isSettingsOpen,
    playlistModalSong,
    activePlaylistModal,
    closePlaylist,
    historyIndex,
    activeView
  ]);

  // Native Android Hardware Back Button & Web History PopState handler
  useEffect(() => {
    let removeCapacitorListener = null;

    // Register Capacitor native Android hardware back button
    try {
      const listenerRes = CapacitorApp.addListener('backButton', () => {
        const handled = handleUniversalBack();
        if (!handled) {
          CapacitorApp.exitApp();
        }
      });
      if (listenerRes && typeof listenerRes.then === 'function') {
        listenerRes.then(handler => {
          removeCapacitorListener = handler;
        }).catch(() => {});
      } else if (listenerRes && typeof listenerRes.remove === 'function') {
        removeCapacitorListener = listenerRes;
      }
    } catch (err) {
      console.warn('Capacitor backButton bridge:', err);
    }

    // Browser popstate handler (for browser back navigation)
    const handlePopState = (e) => {
      const handled = handleUniversalBack();
      if (handled) {
        e.preventDefault();
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (removeCapacitorListener && typeof removeCapacitorListener.remove === 'function') {
        removeCapacitorListener.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleUniversalBack]);

  // 1. Show Animated Splash Screen on app launch
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // 2. Show Update Dialog if a newer version is available
  if (updateInfo) {
    return (
      <UpdateDialog
        versionInfo={updateInfo}
        currentVersion={CURRENT_VERSION}
        onSkip={() => setUpdateInfo(null)}
      />
    );
  }

  // 3. Strictly gate the entire app: Spotify requires sign up or log in to open the app
  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  // Active tab identifier for bottom navigation
  const primaryTabId = ['home', 'search', 'foryou', 'library'].includes(activeView)
    ? activeView
    : 'library';

  return (
    <div className="app-container mobile-app-mode">
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

      {/* Main Mobile App Content View */}
      <main className={`main-content ${isAnyModalOpen ? 'modal-scroll-lock' : ''}`}>
        <div
          key={`${activeView}-${currentParams.playlist?.id || currentParams.query || 'tab'}`}
          className="tab-view-container tab-view-animate"
        >
          {activeView === 'home' && (
            <HomeView
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              onOpenPlaylist={handleOpenPlaylist}
              onSearchArtist={handleSearchArtist}
              onNavigateTab={handleNavigateTab}
              onOpenImport={() => setIsImportModalOpen(true)}
            />
          )}
          {activeView === 'search' && (
            <SearchView
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              initialQuery={currentParams.query}
              onOpenPlaylist={handleOpenPlaylist}
              onSearchArtist={handleSearchArtist}
            />
          )}
          {activeView === 'foryou' && (
            <ForYouView
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              onSearchArtist={handleSearchArtist}
            />
          )}
          {activeView === 'library' && (
            <LibraryView
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              onOpenPlaylistId={pendingPlaylistId}
              onClearPendingPlaylistId={() => setPendingPlaylistId(null)}
              onOpenPlaylist={handleOpenPlaylist}
              onSearchArtist={handleSearchArtist}
            />
          )}
          {activeView === 'playlist' && (
            <PlaylistPageView
              playlist={currentParams.playlist}
              onBack={goBack}
              onOpenAddToPlaylist={handleOpenAddToPlaylist}
              onSearchArtist={handleSearchArtist}
            />
          )}
        </div>
      </main>

      {/* Mobile Floating Mini Player (docks above navigation bar) */}
      <MiniPlayer />

      {/* Mobile Bottom Navigation Tabs */}
      <Navigation
        activeTab={primaryTabId}
        setActiveTab={handleNavigateTab}
      />

      {/* Full Screen Player Modal (expanded lyrics, AI DJ, visualizer) */}
      {isFullPlayerOpen && (
        <FullPlayer onAddToPlaylist={handleOpenAddToPlaylist} />
      )}

      {/* Unified Global Playlist Modal (fallback) */}
      {activePlaylistModal && (
        <UnifiedPlaylistModal
          playlist={activePlaylistModal}
          onClose={closePlaylist}
          onOpenAddToPlaylist={handleOpenAddToPlaylist}
        />
      )}

      {/* Add to Playlist Modal */}
      {playlistModalSong && (
        <PlaylistModal song={playlistModalSong} onClose={handleClosePlaylistModal} />
      )}

      {/* User Profile & Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Smart Import Playlist Modal */}
      {isImportModalOpen && (
        <ImportPlaylistModal
          onClose={() => setIsImportModalOpen(false)}
          onOpenPlaylist={handleOpenPlaylist}
        />
      )}
    </div>
  );
}
