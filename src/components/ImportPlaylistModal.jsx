import React, { useState, useEffect } from 'react';
import {
  Link2,
  Download,
  X,
  Sparkles,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  Music2,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useUser } from '../context/UserContext';

export default function ImportPlaylistModal({ onClose, onOpenPlaylist }) {
  const { importPlaylistToLibrary } = useUser();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const [clipboardDetected, setClipboardDetected] = useState('');

  // Smart detect platform from URL
  const detectPlatform = (text) => {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();
    if (lower.includes('spotify.com')) {
      return { name: 'Spotify', color: '#1db954', icon: '🟢', type: 'Spotify Playlist or Album' };
    }
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return { name: 'YouTube Music', color: '#ff4d4d', icon: '🔴', type: 'YouTube Music Playlist' };
    }
    if (lower.includes('jiosaavn.com')) {
      return { name: 'JioSaavn', color: '#00d2c4', icon: '🟣', type: 'JioSaavn 320k Lossless' };
    }
    return null;
  };

  // Check clipboard on mount smartly
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && (text.includes('spotify.com') || text.includes('youtube.com') || text.includes('youtu.be') || text.includes('jiosaavn.com'))) {
            setClipboardDetected(text.trim());
            // If input is empty, pre-fill it!
            setUrl(prev => prev ? prev : text.trim());
          }
        }
      } catch (_) {
        // Clipboard read permission not granted or not supported
      }
    };
    checkClipboard();
  }, []);

  // Update detected platform whenever url changes
  useEffect(() => {
    setDetectedPlatform(detectPlatform(url));
    if (error) setError('');
  }, [url]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
        }
      }
    } catch (_) {
      // Manual paste fallback
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please paste a playlist URL to import');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/playlist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to import playlist');
      }

      // Add to user's library
      const savedPl = await importPlaylistToLibrary(data);

      // Celebration confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (_) {}

      // Close modal and navigate directly to the newly imported playlist
      onClose();
      if (onOpenPlaylist) {
        onOpenPlaylist(savedPl || data);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Could not import playlist. Please ensure the link is public.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-settings-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="import-playlist-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.25), rgba(162, 56, 255, 0.35))',
              border: '1px solid rgba(255, 117, 140, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Download size={17} color="#ff758c" />
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>
                Import Playlist
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, rgba(255,255,255,0.6))', fontWeight: 500 }}>
                Spotify • YouTube Music • JioSaavn
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="action-btn"
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)' }}
            title="Close"
          >
            <X size={16} color="#ffffff" />
          </button>
        </div>

        {/* Smart Clipboard Prompt Hint */}
        {clipboardDetected && !url && (
          <div
            onClick={() => setUrl(clipboardDetected)}
            style={{
              background: 'rgba(255, 59, 104, 0.12)',
              border: '1px solid rgba(255, 59, 104, 0.3)',
              borderRadius: '12px',
              padding: '8px 12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              <Sparkles size={13} color="#ff758c" />
              <span style={{ fontSize: '0.74rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Found in clipboard: <strong style={{ color: '#ff85a2' }}>{clipboardDetected}</strong>
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose-light)', fontWeight: 700, flexShrink: 0, marginLeft: '6px' }}>
              Paste & Use
            </span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleImport}>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Spotify or YouTube link here..."
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 64px 12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: detectedPlatform ? `1.5px solid ${detectedPlatform.color}` : '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: detectedPlatform ? `0 0 16px ${detectedPlatform.color}33` : 'none'
              }}
            />

            <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
              {url ? (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Clipboard size={11} />
                  <span>Paste</span>
                </button>
              )}
            </div>
          </div>

          {/* Platform Recognition Badge */}
          {detectedPlatform && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '100px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${detectedPlatform.color}66`,
              fontSize: '0.70rem',
              fontWeight: 700,
              color: detectedPlatform.color,
              marginBottom: '12px'
            }}>
              <CheckCircle2 size={12} color={detectedPlatform.color} />
              <span>{detectedPlatform.type} Recognized</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(255, 77, 77, 0.12)',
              border: '1px solid rgba(255, 77, 77, 0.3)',
              borderRadius: '10px',
              padding: '8px 12px',
              marginBottom: '12px',
              fontSize: '0.72rem',
              color: '#ff6b6b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Supported Format Hints */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Supported Playlist Links:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.70rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#1db954' }}>•</span>
                <span><strong>Spotify:</strong> open.spotify.com/playlist/...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#ff4d4d' }}>•</span>
                <span><strong>YouTube Music:</strong> music.youtube.com/playlist?list=...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#00d2c4' }}>•</span>
                <span><strong>JioSaavn:</strong> jiosaavn.com/featured/...</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.75)',
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: '14px',
                background: url.trim()
                  ? 'linear-gradient(135deg, #ff3b68 0%, #a238ff 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                boxShadow: url.trim() ? '0 4px 18px rgba(255, 59, 104, 0.45)' : 'none',
                opacity: loading || !url.trim() ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  <span>Importing Streams...</span>
                </>
              ) : (
                <>
                  <span>Smart Import</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
