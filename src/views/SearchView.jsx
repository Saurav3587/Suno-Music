import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, Sparkles, Flame, ListMusic, Play, Compass, Layers, Clock } from 'lucide-react';
import SongRow from '../components/SongRow';
import SpotifyPlaylistsSection from '../components/SpotifyPlaylistsSection';
import { useMusic } from '../context/MusicContext';

const SpotifyIcon = ({ size = 12, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.471-1.044.253-2.864-1.75-6.47-2.146-10.718-1.176-.411.094-.823-.16-.917-.571-.094-.411.16-.823.571-.917 4.654-1.063 8.647-.611 11.855 1.348.358.218.471.686.253 1.063zm1.472-3.276c-.275.447-.86.589-1.307.314-3.28-2.016-8.28-2.599-12.16-1.421-.502.152-1.037-.133-1.189-.635-.152-.502.133-1.037.635-1.189 4.433-1.344 9.94-.7-13.626 1.564.447.275.589.86.314 1.307zm.126-3.41c-3.933-2.336-10.426-2.55-14.204-1.403-.604.183-1.246-.162-1.429-.766-.183-.604.162-1.246.766-1.429 4.343-1.318 11.516-1.069 16.037 1.614.542.322.721 1.026.399 1.568-.322.542-1.026.721-1.568.399z" />
  </svg>
);

const YoutubeIcon = ({ size = 13, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" fill={color} />
    <polygon points="10 15 15 12 10 9" fill="#ffffff" />
  </svg>
);

const QUICK_SEARCH_CHIPS = [
  { label: 'Punjabi Hits', query: 'punjabi hits' },
  { label: 'Sad Melodies', query: 'sad songs' },
  { label: 'Romantic Hits', query: 'romantic hindi' },
  { label: 'Bhakti & Divine', query: 'bhakti bhajan' },
  { label: 'Taylor Swift', query: 'Taylor Swift' },
  { label: 'Arijit Singh', query: 'Arijit Singh hits' },
  { label: 'Acoustic Chill', query: 'acoustic guitar chill songs' },
  { label: 'Global Top Hits', query: 'global top hits' }
];

const SPOTIFY_CATEGORIES = [
  { id: 'bollywood', title: 'Bollywood', query: 'bollywood top hits', gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
  { id: 'punjabi', title: 'Punjabi', query: 'punjabi hits', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'pop', title: 'Pop & Viral', query: 'pop hits', gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' },
  { id: 'hiphop', title: 'Hip-Hop & Rap', query: 'hip hop rap hits', gradient: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)' },
  { id: 'romantic', title: 'Romance', query: 'romantic hindi songs', gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
  { id: 'sad', title: 'Sad Melodies', query: 'sad emotional songs', gradient: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)' },
  { id: 'chill', title: 'Lo-Fi & Chill', query: 'lo-fi chill beats', gradient: 'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)' },
  { id: 'workout', title: 'Workout', query: 'workout energetic songs', gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' },
  { id: 'party', title: 'Party & Dance', query: 'party dance club hits', gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)' },
  { id: 'focus', title: 'Focus & Study', query: 'deep focus calm instrumental', gradient: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)' },
  { id: 'bhakti', title: 'Devotional', query: 'bhakti bhajan aarti', gradient: 'linear-gradient(135deg, #f85032 0%, #e73827 100%)' },
  { id: 'nostalgia', title: '90s Nostalgia', query: '90s bollywood golden hits', gradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' },
];

function PlaylistSearchCard({ playlist, onSelect }) {
  const isYt = playlist.source === 'youtube';
  const isSp = playlist.source === 'spotify';

  return (
    <div
      onClick={() => onSelect(playlist)}
      className="playlist-search-card"
    >
      <div className="playlist-search-card-cover-wrap">
        <img
          src={playlist.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80'}
          alt={playlist.name}
          loading="lazy"
        />
        {/* Source Badge */}
        <div className={`playlist-search-badge ${isYt ? 'yt' : isSp ? 'sp' : 'custom'}`}>
          {isYt ? <YoutubeIcon size={12} color="#ffffff" /> : isSp ? <SpotifyIcon size={11} color="#ffffff" /> : <Sparkles size={10} color="#ffffff" />}
          <span>{playlist.badge || (isYt ? 'YouTube Music' : 'Playlist')}</span>
        </div>

        {/* Play Overlay Button */}
        <div className="playlist-search-play-overlay">
          <Play size={16} fill="#000000" strokeWidth={0} style={{ marginLeft: '2px' }} />
        </div>
      </div>

      <div className="playlist-search-card-info">
        <div className="playlist-search-card-name" title={playlist.name}>
          {playlist.name}
        </div>
        <div className="playlist-search-card-meta">
          <span>{playlist.author || 'Curated'}</span>
          <span>•</span>
          <span>{playlist.trackCount} songs</span>
        </div>
      </div>
    </div>
  );
}

export default function SearchView({
  onOpenAddToPlaylist,
  initialQuery = '',
  onOpenPlaylist = null,
  onSearchArtist = null
}) {
  const { openPlaylist: contextOpenPlaylist } = useMusic();
  const handlePlaylistSelect = onOpenPlaylist || contextOpenPlaylist;

  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'songs' | 'playlists'
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Search History State from LocalStorage
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('suno_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addToHistory = (term) => {
    const clean = (term || '').trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('suno_search_history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save search history', e);
      }
      return updated;
    });
  };

  const removeFromHistory = (termToRemove, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem('suno_search_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearAllHistory = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSearchHistory([]);
    try {
      localStorage.removeItem('suno_search_history');
    } catch (e) {}
  };

  // Pure Studio 320k Master Audio + Playlists Search
  const performSearch = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      setResults([]);
      setPlaylists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = encodeURIComponent(searchTerm.trim());

    try {
      const [studioRes, playlistRes] = await Promise.all([
        fetch(`/api/search?q=${q}`),
        fetch(`/api/search/playlists?q=${q}`)
      ]);

      const studioData = await studioRes.json();
      const playlistData = await playlistRes.json();

      const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mashup|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;
      const isClean = (t) => t && t.title && !EXCLUDE_REMIX_REGEX.test(t.title);

      const studioList = (studioData.results || []).filter(isClean);
      const combined = [];
      const seenTitles = new Set();

      studioList.forEach(s => {
        const key = `${s.title.toLowerCase()}_${s.artist.toLowerCase()}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push({
            ...s,
            badge: 'Studio 320k',
            isSpotify: true
          });
        }
      });

      setResults(combined);
      setPlaylists(playlistData.playlists || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // React to initialQuery changes (e.g. from artist click)
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(val);
    }, 400);
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputRef.current) {
      inputRef.current.blur(); // dismiss mobile virtual keyboard
    }
    const clean = query.trim();
    if (clean) {
      addToHistory(clean);
      performSearch(clean);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const handleHistoryClick = (historyQuery) => {
    setQuery(historyQuery);
    addToHistory(historyQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(historyQuery);
  };

  const handleChipClick = (chipQuery) => {
    setQuery(chipQuery);
    addToHistory(chipQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(chipQuery);
  };

  const handleCategoryClick = (catQuery) => {
    setQuery(catQuery);
    addToHistory(catQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(catQuery);
  };

  const clearSearch = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setResults([]);
    setPlaylists([]);
    setActiveTab('all');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  const handleSongClickFromSearch = (song) => {
    const termToSave = query.trim() || song?.title;
    if (termToSave) {
      addToHistory(termToSave);
    }
  };

  const handlePlaylistClickFromSearch = (playlist) => {
    const termToSave = query.trim() || playlist?.name;
    if (termToSave) {
      addToHistory(termToSave);
    }
    handlePlaylistSelect(playlist);
  };

  const displayedResults = results;

  return (
    <div className="search-view-container">
      <header className="top-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.35px', margin: 0, color: '#ffffff' }}>
            Search
          </h1>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Songs, Playlists, Artists & Moods
          </span>
        </div>
      </header>

      {/* Search Form Box */}
      <form onSubmit={handleFormSubmit} className="search-form" action="" role="search">
        <div className="search-input-wrap">
          <Search size={19} className="search-input-icon" color="rgba(255,255,255,0.6)" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to listen to? (e.g. Taylor Swift, Arijit Singh)..."
            className="search-input"
            autoFocus={Boolean(initialQuery)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={clearSearch}
              onTouchEnd={(e) => {
                e.preventDefault();
                clearSearch(e);
              }}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </form>

      {/* Smart Filter Tabs */}
      {query && !loading && (results.length > 0 || playlists.length > 0) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '4px 0 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'all', label: 'All Results', count: results.length + playlists.length },
            { id: 'songs', label: 'Songs', count: results.length },
            { id: 'playlists', label: 'Playlists & Albums', count: playlists.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #ff3b68 0%, #a238ff 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                border: activeTab === tab.id
                  ? '1px solid rgba(255, 117, 140, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '0.8rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search Home: Quick Chips + Browse All Spotify Categories */}
      {!query && (
        <div style={{ paddingBottom: '24px' }}>
          {/* Recent Searches Section */}
          {searchHistory.length > 0 && (
            <div className="search-history-section">
              <div className="search-history-header">
                <div className="search-history-title">
                  <Clock size={14} color="#00d2d3" />
                  <span>Recent Searches</span>
                </div>
                <button
                  type="button"
                  onClick={clearAllHistory}
                  className="search-history-clear-all"
                >
                  Clear All
                </button>
              </div>
              <div className="search-history-chips">
                {searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="search-history-chip"
                    onClick={() => handleHistoryClick(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <Clock size={12} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
                    <span className="search-history-text">{item}</span>
                    <button
                      type="button"
                      className="search-history-remove-btn"
                      onClick={(e) => removeFromHistory(item, e)}
                      onTouchEnd={(e) => removeFromHistory(item, e)}
                      aria-label={`Remove ${item}`}
                      title="Remove"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Search Chips */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} color="#f8c291" />
              <span>Trending & Popular Searches</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {QUICK_SEARCH_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.query)}
                  className="quick-search-chip"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spotify-style Browse All Categories Grid */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
              <Layers size={18} color="#ff3b68" />
              <span>Browse All Categories</span>
            </div>

            <div className="spotify-browse-grid">
              {SPOTIFY_CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  className="spotify-browse-card"
                  style={{ background: cat.gradient }}
                  onClick={() => handleCategoryClick(cat.query)}
                >
                  <span className="spotify-browse-title">{cat.title}</span>
                  <div className="spotify-browse-icon-tag">
                    <Music size={22} color="rgba(255,255,255,0.6)" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Flagship Spotify Playlists */}
          <div style={{ marginTop: '16px' }}>
            <SpotifyPlaylistsSection onSelectPlaylist={handlePlaylistSelect} />
          </div>
        </div>
      )}

      {/* Search Content Results */}
      <div style={{ paddingBottom: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.6)' }}>
            <div className="equalizer" style={{ justifyContent: 'center', marginBottom: '14px' }}>
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
            <span>Searching 320k songs and Spotify playlists...</span>
          </div>
        ) : query ? (
          <>
            {/* 1. Songs Section (Primary Priority - Shown in 'all' or 'songs' tabs) */}
            {(activeTab === 'all' || activeTab === 'songs') && (
              <div style={{ marginBottom: (activeTab === 'all' && playlists.length > 0 && displayedResults.length > 0) ? '26px' : '0' }}>
                {displayedResults.length > 0 && (
                  <div className="section-header" style={{ paddingTop: '4px' }}>
                    <div className="section-title">
                      <Sparkles size={16} color="#ff3b68" />
                      <span>{displayedResults.length} Studio Master Songs</span>
                    </div>
                  </div>
                )}

                {displayedResults.length > 0 ? (
                  displayedResults.map((song, i) => (
                    <SongRow
                      key={song.id || `${song.title}-${i}`}
                      song={song}
                      index={i}
                      playlist={displayedResults}
                      isFromSearch={true}
                      onAddToPlaylist={onOpenAddToPlaylist}
                      onSearchArtist={onSearchArtist}
                      onSongClick={handleSongClickFromSearch}
                    />
                  ))
                ) : activeTab === 'songs' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                    <Music size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>No individual songs found matching "{query}". Check the Playlists tab!</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* 2. Playlists & Albums Section (Secondary Priority - Shown in 'all' or 'playlists' tabs) */}
            {(activeTab === 'all' || activeTab === 'playlists') && playlists.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <div className="section-header" style={{ paddingTop: activeTab === 'all' && displayedResults.length > 0 ? '8px' : '4px' }}>
                  <div className="section-title">
                    <ListMusic size={18} color="#00d2d3" />
                    <span>Playlists & Albums</span>
                  </div>
                  <span className="section-subtitle" style={{ color: '#00d2d3' }}>
                    {playlists.length} Curated
                  </span>
                </div>

                <div className="spotify-playlists-responsive-grid">
                  {playlists.map(p => (
                    <PlaylistSearchCard key={p.id} playlist={p} onSelect={handlePlaylistClickFromSearch} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {results.length === 0 && playlists.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
                <Music size={42} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p>No songs or playlists found for "{query}". Try another search term!</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
