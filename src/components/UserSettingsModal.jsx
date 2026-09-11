import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Settings,
  Edit3,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  LogOut,
  Share2,
  User,
  X,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import ImageCropModal from './ImageCropModal';

const AVATARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function UserSettingsModal({ onClose }) {
  const {
    userName,
    setUserName,
    userBio,
    setUserBio,
    userAvatar,
    setUserAvatar,
    updateUserProfile,
    sleepTimerRemaining,
    setSleepTimer,
    cancelSleepTimer,
    currentUser,
    logout
  } = useUser();

  // Internal state
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings drawer/view
  const [name, setName] = useState(userName);
  const [bio, setBio] = useState(userBio);
  const [avatar, setAvatar] = useState(userAvatar || 'A');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Photo Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const isImageAvatar = (val) => {
    return typeof val === 'string' && (val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('blob:'));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropSave = async (croppedDataUrl) => {
    setAvatar(croppedDataUrl);
    setCropModalOpen(false);
    setTempImageSrc(null);
    if (updateUserProfile) {
      await updateUserProfile({ avatar: croppedDataUrl });
    } else {
      setUserAvatar(croppedDataUrl);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1200);
  };

  const handleRemovePhoto = async () => {
    const fallbackInitial = (name || userName || 'A').charAt(0).toUpperCase();
    setAvatar(fallbackInitial);
    if (updateUserProfile) {
      await updateUserProfile({ avatar: fallbackInitial });
    } else {
      setUserAvatar(fallbackInitial);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const finalName = name.trim() || userName;
    const finalBio = bio.trim() || userBio;

    if (updateUserProfile) {
      await updateUserProfile({
        name: finalName,
        bio: finalBio,
        avatar
      });
    } else {
      setUserName(finalName);
      setUserBio(finalBio);
      setUserAvatar(avatar);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsEditing(false);
    }, 600);
  };

  const handleSetTimer = (minutes) => {
    setSleepTimer(minutes, () => {
      if (isPlaying) togglePlay();
    });
  };

  const formatTimerMinutes = (secs) => {
    if (!secs) return 'Off';
    const m = Math.ceil(secs / 60);
    return `${m} min left`;
  };

  const handleShareProfile = () => {
    const handle = currentUser?.userId ? `@${currentUser.userId}` : userName;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`Listen with me on Suno Music! Profile: ${handle}`);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  return (
    <div className="user-settings-overlay" onClick={onClose}>
      <div className="user-settings-sheet full-screen" onClick={e => e.stopPropagation()}>
        {/* Top Bar: Back Button, "My Profile", and Settings Gear */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'calc(12px + var(--safe-top)) 18px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(14, 11, 20, 0.75)',
            backdropFilter: 'var(--backdrop-liquid)',
            WebkitBackdropFilter: 'var(--backdrop-liquid)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          {/* Back Button */}
          <button
            type="button"
            className="unified-back-pill"
            onClick={onClose}
            title="Back to Music"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {/* Title */}
          <h2
            style={{
              fontFamily: 'var(--font-display, "Outfit", sans-serif)',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.3px',
              margin: 0
            }}
          >
            {isSettingsOpen ? 'Settings' : 'My Profile'}
          </h2>

          {/* Settings Button in Top Right */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title={isSettingsOpen ? 'Close Settings' : 'Settings & Account'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isSettingsOpen
                ? 'var(--gradient-romantic, linear-gradient(135deg, #ff3b68 0%, #a238ff 100%))'
                : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isSettingsOpen ? '0 4px 14px rgba(255, 59, 104, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {isSettingsOpen ? <X size={18} /> : <Settings size={18} />}
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="user-settings-body">
          {isSettingsOpen ? (
            /* ============================================================ */
            /* SETTINGS DRAWER VIEW (Triggered by Top Right Gear Button)    */
            /* ============================================================ */
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Account Section */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glow, rgba(255, 75, 114, 0.2))',
                  borderRadius: '20px',
                  padding: '18px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'var(--gradient-romantic)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      Account & Sync
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose-light, #ff758c)' }}>
                      MySQL Database Cloud Sync Active
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Display Name</span>
                    <strong style={{ color: '#ffffff' }}>{userName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>User ID</span>
                    <strong style={{ color: 'var(--accent-rose-light, #ff758c)' }}>
                      @{currentUser?.userId || 'user'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Phone Number</span>
                    <strong style={{ color: '#ffffff' }}>{currentUser?.phone || 'Not provided'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Database Engine</span>
                    <strong style={{ color: '#1ed760' }}>MySQL (suno_music)</strong>
                  </div>
                </div>
              </div>

              {/* Sleep Timer */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: '20px',
                  padding: '18px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="var(--accent-rose-light, #ff758c)" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>Sleep Timer</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: sleepTimerRemaining ? 'var(--accent-rose-light)' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {formatTimerMinutes(sleepTimerRemaining)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSetTimer(mins)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 104, 0.2)'; e.currentTarget.style.borderColor = '#ff3b68'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                      {mins}m
                    </button>
                  ))}
                  {sleepTimerRemaining && (
                    <button
                      type="button"
                      onClick={cancelSleepTimer}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 59, 104, 0.4)',
                        background: 'rgba(255, 59, 104, 0.15)',
                        color: '#ff85a2',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Turn Off
                    </button>
                  )}
                </div>
              </div>

              {/* Streaming & Audio Master Quality */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: '20px',
                  padding: '18px',
                  marginBottom: '18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={18} color="var(--accent-rose-light, #ff758c)" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>Ultra HD Audio Engine</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.45, margin: 0 }}>
                  Streaming original 320kbps CD Masters. Slowed, reverb, and low-quality remix tracks are strictly filtered out of your feed.
                </p>
              </div>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '500px',
                  background: 'rgba(255, 59, 104, 0.12)',
                  border: '1px solid rgba(255, 59, 104, 0.35)',
                  color: '#ff85a2',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  marginTop: '10px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 104, 0.25)'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 104, 0.12)'; e.currentTarget.style.color = '#ff85a2'; }}
              >
                <LogOut size={16} />
                <span>Log Out of Suno Music</span>
              </button>
            </div>
          ) : (
            /* ============================================================ */
            /* AMAZON MUSIC STYLE PROFILE VIEW                              */
            /* ============================================================ */
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Profile Hero Header */}
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                {/* Large Avatar with Glowing Ring & Camera Upload Badge */}
                <div
                  style={{
                    position: 'relative',
                    width: '96px',
                    height: '96px',
                    margin: '0 auto 14px auto'
                  }}
                >
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.35), rgba(162, 56, 255, 0.5))',
                      border: '3px solid rgba(255, 117, 140, 0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.8rem',
                      cursor: 'pointer',
                      boxShadow: '0 8px 28px rgba(255, 59, 104, 0.4)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    title="Click to upload profile photo"
                  >
                    {isImageAvatar(userAvatar) ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      userAvatar || (userName ? userName.charAt(0).toUpperCase() : 'A')
                    )}
                  </div>

                  {/* Camera icon badge on avatar */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload profile photo"
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff3b68, #a238ff)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #08070d',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(255, 59, 104, 0.6)',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Camera size={15} />
                  </button>
                </div>

                {/* Display Name */}
                <h1
                  style={{
                    fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.4px',
                    marginBottom: '4px'
                  }}
                >
                  {userName}
                </h1>

                {/* Handle & Cloud Sync Tag */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 59, 104, 0.12)',
                    border: '1px solid rgba(255, 75, 114, 0.28)',
                    borderRadius: '100px',
                    padding: '3px 12px',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-rose-light, #ff758c)' }}>
                    @{currentUser?.userId || 'user'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>•</span>
                  <span style={{ fontSize: '0.7rem', color: '#ffffff', fontWeight: 600 }}>Suno Cloud</span>
                </div>

                {/* Bio / Music Vibe */}
                <p
                  style={{
                    fontSize: '0.84rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontStyle: 'italic',
                    maxWidth: '300px',
                    margin: '0 auto 16px auto',
                    lineHeight: 1.4
                  }}
                >
                  "{userBio}"
                </p>

                {/* Action Buttons (Amazon Music Style) */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '500px',
                      background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Edit3 size={14} color="var(--accent-rose-light, #ff758c)" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareProfile}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '500px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {copiedSuccess ? (
                      <>
                        <Check size={14} color="#1ed760" />
                        <span style={{ color: '#1ed760' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} color="var(--accent-lavender, #b185ff)" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Edit Profile Panel (Expanded when user clicks Edit Profile) */}
              {isEditing && (
                <form
                  onSubmit={handleSaveProfile}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-glow, rgba(255, 75, 114, 0.3))',
                    borderRadius: '20px',
                    padding: '18px',
                    marginBottom: '20px',
                    animation: 'fadeIn 0.2s ease'
                  }}
                >
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>
                    Customize Profile
                  </h3>

                  {/* Profile Photo Upload & Actions */}
                  <label style={{ fontSize: '0.76rem', color: 'var(--accent-rose-light)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    Profile Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '2px solid rgba(255, 117, 140, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      {isImageAvatar(avatar) ? (
                        <img
                          src={avatar}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        avatar || (name ? name.charAt(0).toUpperCase() : 'A')
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '100px',
                        background: 'linear-gradient(135deg, rgba(255, 59, 104, 0.25), rgba(162, 56, 255, 0.35))',
                        border: '1px solid rgba(255, 117, 140, 0.5)',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={14} />
                      <span>{isImageAvatar(avatar) ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {isImageAvatar(avatar) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        title="Remove custom photo"
                        style={{
                          padding: '7px 12px',
                          borderRadius: '100px',
                          background: 'rgba(255, 59, 104, 0.12)',
                          border: '1px solid rgba(255, 59, 104, 0.3)',
                          color: '#ff85a2',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Avatar Letter Picker */}
                  <label style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    Or Choose Letter Avatar
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: avatar === emoji ? 'rgba(255, 59, 104, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                          border: avatar === emoji ? '2px solid #ff3b68' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transform: avatar === emoji ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: '0.76rem', color: 'var(--accent-rose-light)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '10px 14px',
                      fontSize: '0.86rem',
                      outline: 'none',
                      marginBottom: '12px'
                    }}
                    required
                  />

                  <label style={{ fontSize: '0.76rem', color: 'var(--accent-rose-light)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Music Vibe / Bio
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What's your current vibe?"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      padding: '10px 14px',
                      fontSize: '0.86rem',
                      outline: 'none',
                      marginBottom: '14px'
                    }}
                  />

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '500px',
                      background: 'var(--gradient-romantic)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 16px rgba(255, 59, 104, 0.4)'
                    }}
                  >
                    {savedSuccess ? (
                      <>
                        <Check size={16} />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Profile Account Info & Quick Settings Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  borderRadius: '20px',
                  padding: '18px',
                  marginTop: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Account Status</span>
                  <span style={{ fontSize: '0.75rem', color: '#1ed760', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1ed760', boxShadow: '0 0 8px #1ed760' }} />
                    Active & Synced
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Audio Tier</span>
                    <strong style={{ color: '#ffffff' }}>Studio Master (320kbps)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Experience</span>
                    <strong style={{ color: 'var(--accent-rose-light, #ff758c)' }}>100% Ad-Free</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Cloud Storage</span>
                    <strong style={{ color: '#ffffff' }}>MySQL Database</strong>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  >
                    <Settings size={15} color="var(--accent-rose-light, #ff758c)" />
                    <span>Manage Settings & Audio Quality</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input for Profile Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Interactive Image Crop Modal */}
      {cropModalOpen && tempImageSrc && (
        <ImageCropModal
          imageSrc={tempImageSrc}
          onClose={() => {
            setCropModalOpen(false);
            setTempImageSrc(null);
          }}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
