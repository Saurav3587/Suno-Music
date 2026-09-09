import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Flame, Music2, Play, Plus, Compass, RotateCcw, RefreshCw } from 'lucide-react';
import SongCard from '../components/SongCard';
import SongRow from '../components/SongRow';
import SpotifyPlaylistsSection from '../components/SpotifyPlaylistsSection';
import SpotifyPlaylistModal from '../components/SpotifyPlaylistModal';
import { useUser } from '../context/UserContext';
import { useMusic } from '../context/MusicContext';

const SpotifyIcon = ({ size = 16, color = '#1db954' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7 9.5c3.2-1 7.2-.8 10.3 1" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7.8 12.3c2.7-.8 6.1-.6 8.7.9" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8.5 15.1c2.1-.6 4.8-.4 6.9.7" stroke="#000000" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function HomeView({ onOpenSettings, onOpenAddToPlaylist, onOpenPlaylist }) {
  const { userName, userAvatar, currentUser, playlists = [] } = useUser();
  const { recentSongs = [], playSong, likedSongs = [] } = useMusic();

  // Combine Liked Songs + user playlists for the home shelf
  const safePlaylists = Array.isArray(playlists) ? playlists : [];
  const safeLikedSongs = Array.isArray(likedSongs) ? likedSongs : [];

  const homeShelfPlaylists = [
    ...(safeLikedSongs.length > 0 ? [{ id: '__liked__', name: 'Liked Songs', songs: safeLikedSongs, isLiked: true }] : []),
    ...safePlaylists.slice(0, 5)
  ];

  const [forYouSongs, setForYouSongs] = useState([]);
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [acousticSongs, setAcousticSongs] = useState([]);
  const [spotifySongs, setSpotifySongs] = useState([]);
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  // Suggested For You state (dynamically refreshable from user suggestions & taste)
  const [suggestedSongs, setSuggestedSongs] = useState([]);
  const [suggestedSubtitle, setSuggestedSubtitle] = useState('Personalized for you');
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const seedIndexRef = useRef(0);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [featuredRes, chartsRes, forYouRes, spotifyRes] = await Promise.all([
        fetch('/api/featured'),
        fetch('/api/charts'),
        fetch('/api/search?q=Ed+Sheeran+Taylor+Swift+Coldplay+Adele'),
        fetch('/api/spotify/charts?type=top-hits')
      ]);

      const featuredData = await featuredRes.json();
      const chartsData = await chartsRes.json();
      const forYouData = await forYouRes.json();
      const spotifyData = await spotifyRes.json();

      setAcousticSongs(featuredData.songs || []);
      setTrendingSongs(chartsData.songs || []);
      setForYouSongs(forYouData.results || []);

      // Map spotify tracks into playable card format
      const spTracks = (spotifyData.tracks || []).slice(0, 15).map(t => ({
        id: `sp_${t.spotifyId || t.title}`,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        image: spotifyData.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
        badge: 'Spotify 320k',
        isSpotify: true
      }));
      setSpotifySongs(spTracks);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  // Fetch or refresh suggestions based on user suggestions, listening history, and liked tracks
  const loadSuggestions = useCallback(async (forceRefresh = false) => {
    try {
      setSuggestedLoading(true);
      const availableSeeds = [...(recentSongs || []), ...(likedSongs || [])];
      
      let seed = null;
      if (availableSeeds.length > 0) {
        if (forceRefresh) {
          seedIndexRef.current += 1;
        }
        seed = availableSeeds[seedIndexRef.current % availableSeeds.length];
      }

      const likedArtists = Array.from(new Set(
        (likedSongs || []).map(s => s.artist ? s.artist.split(/[,&]/)[0].trim() : '').filter(Boolean)
      ));

      // 1. Query hybrid recommendation engine
      const recRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedSong: seed,
          recentHistory: (recentSongs || []).slice(0, 15),
          likedArtists: likedArtists.slice(0, 5),
          limit: 12
        })
      });

      const recData = await recRes.json();
      let songs = recData.songs || [];

      // 2. Fallback to auto-playlist if needed
      if (songs.length < 4) {
        try {
          const autoRes = await fetch('/api/auto-playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recentSongs: (recentSongs || []).slice(0, 10),
              type: 'vibe-radar',
              seedSong: seed
            })
          });
          const autoData = await autoRes.json();
          if (autoData?.songs?.length) {
            songs = autoData.songs;
          }
        } catch (e) {
          console.warn('Auto-playlist fallback warning:', e);
        }
      }

      // 3. Fallback to charts if still empty
      if (songs.length < 4) {
        const fallbackRes = await fetch('/api/charts');
        const fallbackData = await fallbackRes.json();
        const pool = fallbackData.songs || [];
        songs = pool.slice(0, 12);
      }

      // Map into playable card objects
      const finalSongs = songs.map(s => ({
        ...s,
        badge: s.badge || 'Suggested'
      }));

      setSuggestedSongs(finalSongs);

      // Contextual subtitle
      if (seed && seed.artist) {
        const art = seed.artist.split(/[,&]/)[0].trim();
        setSuggestedSubtitle(`Inspired by ${art}`);
      } else if (seed && seed.title) {
        setSuggestedSubtitle(`Because you liked ${seed.title.slice(0, 18)}...`);
      } else if (recentSongs.length > 0) {
        setSuggestedSubtitle('Based on your listening');
      } else {
        setSuggestedSubtitle('Personalized for you');
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setSuggestedLoading(false);
    }
  }, [recentSongs, likedSongs]);

  // Automatically update suggestions when user listens to songs or likes new ones
  const firstRecentId = recentSongs?.[0]?.id;
  const likedSongsCount = likedSongs?.length || 0;

  useEffect(() => {
    loadSuggestions(false);
  }, [firstRecentId, likedSongsCount]);

  const handleManualRefreshSuggestions = () => {
    loadSuggestions(true);
  };

  const handleGlobalRefresh = () => {
    loadSuggestions(true);
    loadHomeData();
  };

  return (
    <div>
      {/* Top Header with Profile Option in the Left Top Corner & Refresh Feed on the Right */}
      <header className="top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left Top Corner: Profile Avatar Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <button
            onClick={onOpenSettings}
            title="Profile & Settings"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.3), rgba(162, 56, 255, 0.45))',
              border: '2px solid rgba(255, 117, 140, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 59, 104, 0.25)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {userAvatar || '🎧'}
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                {getGreeting()}, {userName.split(' ')[0]}
              </span>
              <Sparkles size={11} color="#ff85a2" />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Suno Music</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-rose-light)' }}>@{currentUser?.userId || 'user'}</span>
            </div>
          </div>
        </div>

        {/* Right Corner: Quick Refresh Feed Button */}
        <button
          onClick={handleGlobalRefresh}
          disabled={loading || suggestedLoading}
          title="Refresh Feed & Suggestions"
          className="shelf-action-btn"
          style={{ padding: '5px 11px' }}
        >
          <RefreshCw size={12} className={loading || suggestedLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </header>

      {/* ── Suggested For You Shelf (Refreshes from user suggestions & taste) ── */}
      <div style={{ marginBottom: '10px' }}>
        <div className="section-header" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-title">
            <Sparkles size={18} color="#ff3b68" />
            <span>Suggested For You</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="section-subtitle" style={{ color: 'var(--accent-rose-light)' }}>
              {suggestedSubtitle}
            </span>

            {/* Refresh Suggestions Button */}
            <button
              onClick={handleManualRefreshSuggestions}
              disabled={suggestedLoading}
              title="Refresh suggestions from your taste"
              className="shelf-action-btn"
            >
              <RefreshCw size={11} className={suggestedLoading ? 'spin' : ''} />
              <span>{suggestedLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Play All Button */}
            {suggestedSongs.length > 0 && (
              <button
                onClick={() => playSong(suggestedSongs[0], suggestedSongs)}
                title="Play all suggested songs"
                className="shelf-action-btn"
              >
                <Play size={10} fill="#ffffff" strokeWidth={0} />
                <span>Play All</span>
              </button>
            )}
          </div>
        </div>

        <div className="horizontal-scroll-row">
          {suggestedLoading && suggestedSongs.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="song-card" style={{ opacity: 0.5 }}>
                <div className="card-image-wrap" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
                <div className="card-info">
                  <div style={{ height: '14px', width: '80%', background: 'rgba(255, 255, 255, 0.07)', borderRadius: '4px', marginBottom: '6px' }} />
                  <div style={{ height: '11px', width: '55%', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
                </div>
              </div>
            ))
          ) : (
            suggestedSongs.map((song, i) => (
              <SongCard
                key={`suggested-${song.id}-${i}`}
                song={song}
                playlist={suggestedSongs}
              />
            ))
          )}
        </div>
      </div>

      {/* Jump Back In Shelf (Displays all songs listened above 45 seconds) */}
      {recentSongs && recentSongs.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div className="section-header" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title">
              <RotateCcw size={17} color="#ff3b68" />
              <span>Jump Back In</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="section-subtitle" style={{ color: 'var(--accent-rose-light)' }}>
                {recentSongs.length} {recentSongs.length === 1 ? 'Track' : 'Tracks'} • Listened 45s+
              </span>
              <button
                onClick={() => playSong(recentSongs[0], recentSongs)}
                title="Play all recent songs"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.22) 0%, rgba(162, 56, 255, 0.25) 100%)',
                  border: '1px solid rgba(255, 75, 114, 0.35)',
                  color: '#ffffff',
                  borderRadius: '100px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Play size={11} fill="#ffffff" strokeWidth={0} />
                <span>Play All</span>
              </button>
            </div>
          </div>

          <div className="horizontal-scroll-row">
            {recentSongs.map((song, i) => (
              <SongCard key={`recent-${song.id}-${i}`} song={song} playlist={recentSongs} />
            ))}
          </div>
        </div>
      )}

      {/* ── Your Playlists shelf ── */}
      {homeShelfPlaylists.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div className="section-header" style={{ marginTop: '8px' }}>
            <div className="section-title">
              <span style={{ fontSize: '1rem' }}>🎵</span>
              <span>Your Playlists</span>
            </div>
            {onOpenPlaylist && (
              <button
                onClick={() => onOpenPlaylist(null)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-tertiary)',
                  fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '3px'
                }}
              >
                See all
              </button>
            )}
          </div>

          <div className="horizontal-scroll-row">
            {homeShelfPlaylists.map(pl => {
              const playlistSongs = Array.isArray(pl.songs) ? pl.songs : [];
              const imgs = playlistSongs.filter(s => s && s.image);
              return (
                <div
                  key={pl.id}
                  className="home-playlist-card"
                  onClick={() => onOpenPlaylist && onOpenPlaylist(pl.id)}
                >
                  <div className="home-playlist-cover">
                    {pl.isLiked ? (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, #9933ff 0%, #ff3b68 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.2rem'
                      }}>❤️</div>
                    ) : imgs.length >= 4 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%' }}>
                        {imgs.slice(0, 4).map((s, i) => (
                          <img key={i} src={s.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ))}
                      </div>
                    ) : imgs.length > 0 ? (
                      <img src={imgs[0].image} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(135deg, rgba(255,59,104,0.25), rgba(162,56,255,0.25))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                      }}>🎵</div>
                    )}
                  </div>
                  <div className="home-playlist-name">{pl.name}</div>
                  <div className="home-playlist-meta">{playlistSongs.length} songs</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Spotify Playlists Showcase (24 Verified Flagship Playlists) */}
      <SpotifyPlaylistsSection onSelectPlaylist={setSelectedSpotifyPlaylist} />

      {/* Spotify Today's Top Hits Tracks */}
      <div className="section-header" style={{ marginTop: '8px' }}>
        <div className="section-title">
          <SpotifyIcon size={18} />
          <span>Today's Top Hits • Tracks</span>
        </div>
        <span className="section-subtitle" style={{ color: '#1db954' }}>Official Spotify 320k</span>
      </div>

      <div className="horizontal-scroll-row">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="song-card" style={{ opacity: 0.5 }}>
              <div className="card-image-wrap" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
              <div className="card-info">
                <div style={{ height: '14px', width: '80%', background: 'rgba(255, 255, 255, 0.07)', borderRadius: '4px', marginBottom: '6px' }} />
                <div style={{ height: '11px', width: '55%', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
              </div>
            </div>
          ))
        ) : (
          (spotifySongs.length > 0 ? spotifySongs : forYouSongs.slice(0, 10)).map((song, i) => (
            <SongCard key={`spotify-${song.id}-${i}`} song={song} playlist={spotifySongs.length > 0 ? spotifySongs : forYouSongs} />
          ))
        )}
      </div>

      {/* Top Global Hits */}
      <div className="section-header" style={{ marginTop: '8px' }}>
        <div className="section-title">
          <Flame size={18} color="#f8c291" />
          <span>Top Global Hits</span>
        </div>
        <span className="section-subtitle">Trending Charts</span>
      </div>

      <div className="horizontal-scroll-row">
        {trendingSongs.slice(0, 10).map((song, i) => (
          <SongCard key={`trend-${song.id}-${i}`} song={song} playlist={trendingSongs} />
        ))}
      </div>

      {/* Essential Melodies & Acoustics */}
      <div className="section-header" style={{ marginTop: '12px' }}>
        <div className="section-title">
          <Music2 size={18} color="#ff3b68" />
          <span>Timeless Melodies & Acoustics</span>
        </div>
        <span className="section-subtitle">{acousticSongs.length} Tracks</span>
      </div>

      <div style={{ paddingBottom: '20px' }}>
        {acousticSongs.slice(0, 12).map((song, i) => (
          <SongRow
            key={`acoustic-${song.id}-${i}`}
            song={song}
            index={i}
            playlist={acousticSongs}
            onAddToPlaylist={onOpenAddToPlaylist}
          />
        ))}
      </div>

      {/* Spotify Playlist Full Modal */}
      {selectedSpotifyPlaylist && (
        <SpotifyPlaylistModal
          playlistKeyOrId={selectedSpotifyPlaylist.key || selectedSpotifyPlaylist.id}
          initialData={selectedSpotifyPlaylist}
          onClose={() => setSelectedSpotifyPlaylist(null)}
          onOpenAddToPlaylist={onOpenAddToPlaylist}
        />
      )}
    </div>
  );
}
