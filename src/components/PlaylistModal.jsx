import React, { useState } from 'react';
import { X, Plus, Check, ListMusic, Music } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function PlaylistModal({ song, onClose }) {
  const { playlists, createPlaylist, addSongToPlaylist } = useUser();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [addedId, setAddedId] = useState(null);

  if (!song) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      const pl = createPlaylist(newPlaylistName.trim());
      if (pl) {
        addSongToPlaylist(pl.id, song);
        setAddedId(pl.id);
        setTimeout(() => onClose(), 600);
      }
    }
  };

  const handleAddToExisting = (plId) => {
    addSongToPlaylist(plId, song);
    setAddedId(plId);
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <ListMusic size={22} color="#ff3b68" />
            <span>Add to Playlist</span>
          </div>
          <button className="action-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Selected Song Preview */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '10px 14px',
          borderRadius: '14px',
          marginBottom: '16px'
        }}>
          <img
            src={song.image}
            alt={song.title}
            style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
          />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {song.title}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {song.artist}
            </div>
          </div>
        </div>

        {/* New Playlist Trigger / Form */}
        {showCreate ? (
          <form onSubmit={handleCreate} style={{ marginBottom: '16px' }}>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name..."
              className="romantic-input"
              autoFocus
              required
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn" style={{ flex: 1, padding: '10px' }}>
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              width: '100%',
              background: 'rgba(255, 59, 104, 0.12)',
              border: '1px dashed rgba(255, 59, 104, 0.35)',
              color: '#ff85a2',
              padding: '12px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            <Plus size={18} />
            <span>Create New Playlist</span>
          </button>
        )}

        {/* Existing Playlists List */}
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {playlists.map(pl => {
            const alreadyIn = pl.songs.some(s => s.id === song.id);
            const isJustAdded = addedId === pl.id;

            return (
              <div
                key={pl.id}
                onClick={() => !alreadyIn && handleAddToExisting(pl.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  cursor: alreadyIn ? 'default' : 'pointer',
                  opacity: alreadyIn ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={pl.cover}
                    alt={pl.name}
                    style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ffffff' }}>{pl.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)' }}>{pl.songs.length} songs</div>
                  </div>
                </div>

                {isJustAdded ? (
                  <Check size={18} color="#2ed573" />
                ) : alreadyIn ? (
                  <span style={{ fontSize: '0.72rem', color: '#ff85a2' }}>Added</span>
                ) : (
                  <Plus size={18} color="rgba(255,255,255,0.4)" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
