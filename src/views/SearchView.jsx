import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, Sparkles, Flame } from 'lucide-react';
import SongRow from '../components/SongRow';
import SpotifyPlaylistsSection from '../components/SpotifyPlaylistsSection';
import SpotifyPlaylistModal from '../components/SpotifyPlaylistModal';

const QUICK_SEARCH_CHIPS = [
  { label: 'Global Top Hits', query: 'global top hits 2024' },
  { label: 'Taylor Swift', query: 'Taylor Swift' },
  { label: 'Arijit Singh', query: 'Arijit Singh hits' },
  { label: 'The Weeknd', query: 'The Weeknd' },
  { label: 'Ed Sheeran', query: 'Ed Sheeran' },
  { label: 'Acoustic Chill', query: 'acoustic guitar chill songs' },
  { label: 'Bollywood Melodies', query: 'bollywood romantic melodies' },
  { label: 'Lo-Fi Chillout', query: 'lofi chill study beats' }
];

export default function SearchView({ onOpenAddToPlaylist }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState(null);
  const debounceRef = useRef(null);

  // Pure Studio 320k Master Audio Search
  const performSearch = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = encodeURIComponent(searchTerm.trim());

    try {
      // Query Studio 320k lossless catalog directly
      const studioRes = await fetch(`/api/search?q=${q}`);
      const studioData = await studioRes.json();

      const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mashup|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;
      const isClean = (t) => t && t.title && !EXCLUDE_REMIX_REGEX.test(t.title);

      const studioList = (studioData.results || []).filter(isClean);

      const combined = [];
      const seenTitles = new Set();

      // Add clean studio originals with Studio 320k badge
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
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(val);
    }, 350);
  };

  const handleChipClick = (chipQuery) => {
    setQuery(chipQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(chipQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const displayedResults = results;

  return (
    <div>
      <header className="top-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
            Search Any Song
          </h2>
          <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Studio 320kbps CD Quality Audio</span>
            <Sparkles size={11} color="#ff85a2" />
          </span>
        </div>
      </header>

      {/* Search Input */}
      <div className="search-input-wrap" style={{ marginTop: '16px', marginBottom: '10px' }}>
        <Search size={20} />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search any song, artist, or album..."
          className="search-input"
          autoFocus
        />
        {query && (
          <button className="search-clear-btn" onClick={clearSearch}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick Search Exploration Chips */}
      {!query && (
        <div style={{ margin: '0 16px 16px 16px' }}>
          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={13} color="#f8c291" />
            <span>Popular Searches</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {QUICK_SEARCH_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip.query)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  padding: '6px 12px',
                  borderRadius: '100px',
                  fontSize: '0.76rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Official Spotify Playlists on Search */}
          <div style={{ marginTop: '16px' }}>
            <SpotifyPlaylistsSection onSelectPlaylist={setSelectedSpotifyPlaylist} />
          </div>
        </div>
      )}

      {/* Results Header */}
      {query && (
        <div className="section-header" style={{ paddingTop: '8px' }}>
          <div className="section-title">
            <Sparkles size={16} color="#ff3b68" />
            <span>{loading ? 'Searching studio masters...' : `${displayedResults.length} Studio Master Tracks Found`}</span>
          </div>
        </div>
      )}

      {/* Results List */}
      <div style={{ paddingBottom: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <div className="equalizer" style={{ justifyContent: 'center', marginBottom: '12px' }}>
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
            <span>Searching 320kbps studio master audio...</span>
          </div>
        ) : displayedResults.length > 0 ? (
          displayedResults.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              playlist={displayedResults}
              onAddToPlaylist={onOpenAddToPlaylist}
            />
          ))
        ) : query ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <Music size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>No songs found for "{query}". Try another title or artist name!</p>
          </div>
        ) : null}
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
