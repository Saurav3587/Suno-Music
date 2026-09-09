import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Flame, Music2, Play, Plus, Compass, RotateCcw, ArrowDown, Heart } from 'lucide-react';
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

  // ── Suggestion Engine (Vibe Radar-style) ─────────────────────────────────
  // Same parallel multi-source approach as Vibe Radar:
  // top artists × 2 mood queries × discovery × trending — all fired in parallel,
  // round-robin interleaved, Fisher-Yates shuffled.
  const MOOD_PALETTE = [
    { mood: 'Chill Vibes',  queries: ['chill relaxing songs',            'lo-fi chill beats'] },
    { mood: 'High Energy',  queries: ['high energy upbeat songs',         'power workout hits'] },
    { mood: 'Acoustic',     queries: ['acoustic guitar unplugged songs',  'acoustic cover hits'] },
    { mood: 'Focus Flow',   queries: ['focus deep work instrumental',     'study playlist calm'] },
    { mood: 'Party Night',  queries: ['party pop dance songs',            'club banger hits'] },
    { mood: 'Romantic',     queries: ['romantic love songs hindi',        'romantic english ballads'] },
    { mood: 'Hip-Hop',      queries: ['hip hop rap hits',                 'trap beats rap'] },
    { mood: 'Indie',        queries: ['indie alternative songs',          'indie pop hits'] },
    { mood: 'Bollywood',    queries: ['bollywood top hits',               'latest bollywood songs'] },
  ];

  // Pull-to-refresh state
  const [pullProgress, setPullProgress] = useState(0); // 0-100
  const [isPulling, setIsPulling]       = useState(false);
  const pullStartY  = useRef(null);
  const scrollRef   = useRef(null);
  const PULL_THRESHOLD = 70; // px of drag needed to trigger refresh

  const onTouchStart = useCallback((e) => {
    if (scrollRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (pullStartY.current === null) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0) {
      setPullProgress(Math.min(100, (delta / PULL_THRESHOLD) * 100));
      setIsPulling(true);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullProgress >= 100) {
      loadSuggestions(true);
      loadHomeData();
    }
    setPullProgress(0);
    setIsPulling(false);
    pullStartY.current = null;
  }, [pullProgress]);

  // Also support mouse drag on desktop (scroll-down gesture)
  const mouseStartY = useRef(null);
  const onMouseDown = useCallback((e) => {
    if (scrollRef.current?.scrollTop === 0) mouseStartY.current = e.clientY;
  }, []);
  const onMouseMove = useCallback((e) => {
    if (mouseStartY.current === null) return;
    const delta = e.clientY - mouseStartY.current;
    if (delta > 0) {
      setPullProgress(Math.min(100, (delta / PULL_THRESHOLD) * 100));
      setIsPulling(true);
    }
  }, []);
  const onMouseUp = useCallback(() => {
    if (pullProgress >= 100) {
      loadSuggestions(true);
      loadHomeData();
    }
    setPullProgress(0);
    setIsPulling(false);
    mouseStartY.current = null;
  }, [pullProgress]);

  const loadSuggestions = useCallback(async (forceRefresh = false) => {
    try {
      setSuggestedLoading(true);

      // Advance seed index on every refresh so seeds & moods rotate
      if (forceRefresh) seedIndexRef.current += 1;

      // Rotating mood — uses current-minute clock like Vibe Radar, but
      // also advances with seedIndex so manual refresh gives a new mood
      const moodIndex = (Math.floor(Date.now() / 60000) + seedIndexRef.current) % MOOD_PALETTE.length;
      const activeMood = MOOD_PALETTE[moodIndex];

      // Collect seeds from recent + liked history (up to 5 unique artists)
      const allSeeds = [...(recentSongs || []), ...(likedSongs || [])];
      const artistsSeen = new Set();
      const topArtists = [];
      for (const s of allSeeds) {
        if (!s?.artist) continue;
        const primary = s.artist.split(/[,&]/)[0].trim();
        if (primary && !artistsSeen.has(primary)) {
          artistsSeen.add(primary);
          topArtists.push(primary);
          if (topArtists.length >= 5) break;
        }
      }

      // Build all parallel fetch promises (same pattern as Vibe Radar)
      const fetchQ = (q) => q
        ? fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => d.results || []).catch(() => [])
        : Promise.resolve([]);

      const artistPromises = topArtists.map(a => fetchQ(`${a} songs hits`));
      const mood1Promise   = fetchQ(activeMood.queries[0]);
      const mood2Promise   = fetchQ(activeMood.queries[1]);
      const discoveryP     = fetchQ('new popular music releases');
      const trendingP      = fetchQ('trending global top hits');

      // Fire ALL in parallel
      const allBuckets = await Promise.all([
        ...artistPromises, mood1Promise, mood2Promise, discoveryP, trendingP
      ]);

      // Round-robin interleave across all buckets
      const seen = new Set();
      const mixed = [];
      const maxRounds = Math.ceil(20 / Math.max(allBuckets.length, 1));
      for (let round = 0; round < maxRounds && mixed.length < 20; round++) {
        for (const bucket of allBuckets) {
          if (mixed.length >= 20) break;
          const item = bucket[round];
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            mixed.push(item);
          }
        }
      }

      // Fisher-Yates shuffle
      for (let i = mixed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
      }

      setSuggestedSongs(mixed.slice(0, 16));

      // Subtitle: "Artist • Mood & more" or just mood
      const leadArtist = topArtists[0] || '';
      setSuggestedSubtitle(
        leadArtist
          ? `${leadArtist} · ${activeMood.mood} & more`
          : `${activeMood.mood} picks for you`
      );
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setSuggestedLoading(false);
    }
  }, [recentSongs, likedSongs]);

  // Auto-refresh whenever the user listens to a new song or likes one
  const firstRecentId   = recentSongs?.[0]?.id;
  const likedSongsCount = likedSongs?.length || 0;
  useEffect(() => { loadSuggestions(false); }, [firstRecentId, likedSongsCount]);

  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ userSelect: 'none' }}
    >
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
            {userAvatar || 'A'}
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

        {/* Pull-to-refresh hint shown when user starts dragging */}
        {isPulling && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--accent-rose-light)', opacity: pullProgress / 100 }}>
            <ArrowDown size={12} style={{ transform: `rotate(${pullProgress * 1.8}deg)`, transition: 'transform 0.1s' }} />
            <span>{pullProgress >= 100 ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        )}
      </header>

      {/* ── Suggested For You Shelf ── */}
      <div style={{ marginBottom: '10px' }}>
        <div className="section-header" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-title">
            <Sparkles size={18} color="#ff3b68" />
            <span>Suggested For You</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="section-subtitle" style={{ color: 'var(--accent-rose-light)' }}>
              {suggestedLoading ? 'Refreshing…' : suggestedSubtitle}
            </span>

            {/* Play All — only button left in the header */}
            {suggestedSongs.length > 0 && !suggestedLoading && (
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
              <Music2 size={17} color="#ff3b68" />
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}><Heart size={28} color="#fff" fill="#ff3b68" /></div>
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
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}><Music2 size={26} color="rgba(255,59,104,0.7)" /></div>
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
