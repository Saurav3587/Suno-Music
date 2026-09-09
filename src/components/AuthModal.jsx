import React, { useState } from 'react';
import { X, User, Phone, Lock, AtSign, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useUser();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Status
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your Phone Number or User ID and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ login: loginIdentifier.trim(), password: loginPassword });
      if (res.success) {
        setSuccess('Logged in successfully! Syncing your library...');
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1200);
      } else {
        setError(res.error || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!userId.trim() || userId.trim().length < 3) {
      setError('Please enter a unique User ID (at least 3 characters).');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!registerPassword || registerPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        userId: userId.trim(),
        phone: phone.trim(),
        password: registerPassword
      });

      if (res.success) {
        setSuccess('Account created! Your library is now backed up.');
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1200);
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          padding: '24px',
          background: 'linear-gradient(145deg, #181424 0%, #0c0914 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 75, 114, 0.15)',
          borderRadius: '24px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              {activeTab === 'login' ? 'Sign in to access your library on any device' : 'Save playlists, sync likes, and train your taste profile'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          position: 'relative',
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden'
        }}>
          {/* Liquid Sliding Pill */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: '4px',
              width: 'calc(50% - 4px)',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #ff4b72 0%, #a238ff 100%)',
              boxShadow: '0 4px 16px rgba(255, 75, 114, 0.4)',
              transform: activeTab === 'login' ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              padding: '8px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'login' ? '#ffffff' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.25s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              padding: '8px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'register' ? '#ffffff' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.25s ease'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 75, 114, 0.15)',
            border: '1px solid rgba(255, 75, 114, 0.35)',
            color: '#ff85a2',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(29, 185, 84, 0.15)',
            border: '1px solid rgba(29, 185, 84, 0.35)',
            color: '#1db954',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Phone Number or User ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <User size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="text"
                  placeholder="e.g. 9876543210 or @kumar"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '12px 0',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <Lock size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '12px 0',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn"
              style={{
                marginTop: '8px',
                height: '46px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                Your Name
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <User size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="text"
                  placeholder="e.g. Kumar Gaurav"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 0',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                Unique User ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <AtSign size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="text"
                  placeholder="e.g. kumar_01"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 0',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Phone Number
                </label>
                <span style={{ fontSize: '0.7rem', color: phone.length === 10 ? '#1ed760' : 'rgba(255,255,255,0.4)', fontWeight: phone.length === 10 ? 700 : 400 }}>
                  {phone.length > 0 ? `${phone.length}/10 digits` : '10 digits only'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <Phone size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={e => {
                    const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(onlyNums);
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 0',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Password
                </label>
                <span style={{ fontSize: '0.7rem', color: registerPassword.length >= 8 ? '#1ed760' : 'rgba(255,255,255,0.4)', fontWeight: registerPassword.length >= 8 ? 700 : 400 }}>
                  {registerPassword.length > 0 ? `${registerPassword.length}/8 min` : 'Min 8 chars'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '0 14px'
              }}>
                <Lock size={16} color="rgba(255,255,255,0.4)" />
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={registerPassword}
                  minLength={8}
                  onChange={e => setRegisterPassword(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 0',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn"
              style={{
                marginTop: '8px',
                height: '46px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
