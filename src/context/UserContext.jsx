import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  // Authentication State
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('suno_auth_token') || null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // User Profile fields (derived from logged-in user or guest storage)
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('suno_user_name') || 'Music Lover';
  });

  const [userBio, setUserBio] = useState(() => {
    return localStorage.getItem('suno_user_bio') || 'Lost in the rhythm 🎧';
  });

  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('suno_user_avatar') || '🎧';
  });

  // User Custom Playlists: [ { id, name, description, cover, createdAt, songs: [] } ]
  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_user_playlists');
      return saved ? JSON.parse(saved) : [
        {
          id: 'pl_favorites_default',
          name: 'My Vibe Playlist',
          description: 'Handpicked favorites for everyday listening',
          cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
          createdAt: new Date().toLocaleDateString(),
          songs: []
        }
      ];
    } catch {
      return [];
    }
  });

  // Sleep Timer state (minutes remaining)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(null);
  const sleepTimerRef = useRef(null);

  // Keep local storage in sync
  useEffect(() => {
    localStorage.setItem('suno_user_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('suno_user_bio', userBio);
  }, [userBio]);

  useEffect(() => {
    localStorage.setItem('suno_user_avatar', userAvatar);
  }, [userAvatar]);

  useEffect(() => {
    localStorage.setItem('suno_user_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem('suno_auth_token', authToken);
    } else {
      localStorage.removeItem('suno_auth_token');
    }
  }, [authToken]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('suno_current_user', JSON.stringify(currentUser));
      if (currentUser.name) setUserName(currentUser.name);
      if (currentUser.avatar) setUserAvatar(currentUser.avatar);
      if (currentUser.bio) setUserBio(currentUser.bio);
    } else {
      localStorage.removeItem('suno_current_user');
    }
  }, [currentUser]);

  // Validate session and restore cloud library on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (!authToken) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            // Fetch cloud library
            const libRes = await fetch('/api/user/library', {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (libRes.ok) {
              const libData = await libRes.json();
              if (Array.isArray(libData.playlists) && libData.playlists.length > 0) {
                setPlaylists(libData.playlists);
              }
            }
          }
        } else {
          // Token expired or invalid
          setAuthToken(null);
          setCurrentUser(null);
        }
      } catch (e) {
        console.warn('Session restore warning:', e.message);
      }
    };

    restoreSession();
  }, [authToken]);

  // Login handler
  const login = async ({ login: loginInput, password }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);

      // Trigger automatic sync with guest library
      syncGuestLibrary(data.token);
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  // Register handler (Phone, User ID, Name, Password)
  const register = async ({ name, userId, phone, password }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId, phone, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);

      // Sync guest playlists and likes into new cloud account
      syncGuestLibrary(data.token);
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  // Logout handler
  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setUserName('Music Lover');
    setUserAvatar('🎧');
  };

  // Sync guest library to cloud
  const syncGuestLibrary = async (token) => {
    const activeToken = token || authToken;
    if (!activeToken) return;

    try {
      const rawLikes = localStorage.getItem('suno_liked_songs');
      const likedSongs = rawLikes ? JSON.parse(rawLikes) : [];
      const rawRecent = localStorage.getItem('suno_recent_songs');
      const recentSongs = rawRecent ? JSON.parse(rawRecent) : [];

      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          playlists,
          likedSongs,
          recentSongs
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.library?.playlists) {
          setPlaylists(data.library.playlists);
        }
      }
    } catch (e) {
      console.warn('Sync library failed:', e.message);
    }
  };

  // Handle sleep timer countdown
  const setSleepTimer = (minutes, onTimeExpired) => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (!minutes || minutes <= 0) {
      setSleepTimerRemaining(null);
      return;
    }

    let remainingSeconds = minutes * 60;
    setSleepTimerRemaining(remainingSeconds);

    sleepTimerRef.current = setInterval(() => {
      remainingSeconds -= 1;
      setSleepTimerRemaining(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(sleepTimerRef.current);
        sleepTimerRef.current = null;
        setSleepTimerRemaining(null);
        if (onTimeExpired) onTimeExpired();
      }
    }, 1000);
  };

  const cancelSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerRemaining(null);
  };

  // Playlist Management
  const createPlaylist = async (name, description = '') => {
    if (!name || !name.trim()) return null;
    const localId = `pl_${Date.now()}`;
    const newPl = {
      id: localId,
      name: name.trim(),
      description: description.trim() || 'Custom playlist created by you',
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      createdAt: new Date().toLocaleDateString(),
      songs: []
    };

    setPlaylists(prev => [newPl, ...prev]);

    // If logged in, sync to MySQL
    if (authToken) {
      try {
        const res = await fetch('/api/user/playlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ name: newPl.name, description: newPl.description, cover: newPl.cover })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.playlist?.id) {
            setPlaylists(prev => prev.map(p => p.id === localId ? { ...p, id: data.playlist.id } : p));
          }
        }
      } catch (e) {
        console.warn('Cloud playlist create warning:', e.message);
      }
    }

    return newPl;
  };

  const deletePlaylist = async (playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));

    if (authToken) {
      try {
        await fetch(`/api/user/playlist/${playlistId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (e) {
        console.warn('Cloud playlist delete warning:', e.message);
      }
    }
  };

  const addSongToPlaylist = async (playlistId, song) => {
    if (!playlistId || !song) return;
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.songs.some(s => s.id === song.id)) return p;
        return {
          ...p,
          cover: song.image || p.cover,
          songs: [song, ...p.songs]
        };
      }
      return p;
    }));

    if (authToken) {
      try {
        await fetch(`/api/user/playlist/${playlistId}/song`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ song })
        });
      } catch (e) {
        console.warn('Cloud add song warning:', e.message);
      }
    }
  };

  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          songs: p.songs.filter(s => s.id !== songId)
        };
      }
      return p;
    }));
  };

  return (
    <UserContext.Provider value={{
      // Auth State & Actions
      currentUser,
      authToken,
      isLoggedIn: !!currentUser,
      isAuthModalOpen,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false),
      login,
      register,
      logout,
      syncGuestLibrary,

      // Profile State
      userName,
      setUserName,
      userBio,
      setUserBio,
      userAvatar,
      setUserAvatar,

      // Playlist Management
      playlists,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,

      // Sleep Timer
      sleepTimerRemaining,
      setSleepTimer,
      cancelSleepTimer
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
