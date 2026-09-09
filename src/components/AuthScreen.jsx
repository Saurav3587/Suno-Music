import React, { useState, useRef, useEffect } from 'react';
import { Music2, User, Phone, Lock, AtSign, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, Zap, Radio, LogIn, UserPlus } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function AuthScreen() {
  const { login, register } = useUser();
  const [activeTab, setActiveTab] = useState('signup'); // 'signup' | 'login'
  const [slideDirection, setSlideDirection] = useState('forward'); // 'forward' | 'backward'

  // Refs for smooth dynamic height and stage transitions
  const signupRef = useRef(null);
  const loginRef = useRef(null);
  const [formHeight, setFormHeight] = useState(undefined);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up form state
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Feedback & Loading
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Smoothly measure and transition form container height
  useEffect(() => {
    const updateHeight = () => {
      const activeEl = activeTab === 'signup' ? signupRef.current : loginRef.current;
      if (activeEl) {
        setFormHeight(activeEl.scrollHeight);
      }
    };
    updateHeight();
    const timer = setTimeout(updateHeight, 50);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [activeTab, error, success]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setSlideDirection(tab === 'login' ? 'forward' : 'backward');
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginIdentifier.trim()) {
      setError('Please enter your Phone Number or User ID.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ login: loginIdentifier.trim(), password: loginPassword });
      if (res.success) {
        setSuccess(`Welcome back, ${res.user.name}! Opening Suno Music...`);
        setIsUnlocking(true);
      } else {
        setError(res.error || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Cannot connect to database server. Please ensure MySQL is running.');
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
      setError('Please choose a unique User ID (at least 3 characters).');
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
        setSuccess(`Account created! Welcome, ${res.user.name}! Opening Suno Music...`);
        setIsUnlocking(true);
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Cannot connect to database server. Please ensure MySQL is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      backgroundColor: 'var(--bg-base, #08070d)',
      backgroundImage: `
        radial-gradient(circle at 50% 10%, rgba(255, 59, 104, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 15% 35%, rgba(123, 44, 191, 0.22) 0%, transparent 50%),
        radial-gradient(circle at 85% 75%, rgba(162, 56, 255, 0.18) 0%, transparent 50%),
        linear-gradient(180deg, #0d0918 0%, #08070d 100%)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      overflowY: 'auto',
      fontFamily: 'var(--font-body, "Plus Jakarta Sans", sans-serif)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: isUnlocking ? 0.9 : 1,
      transform: isUnlocking ? 'scale(1.02)' : 'scale(1)'
    }}>
      {/* Ambient background glows matching app */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '460px',
        height: '460px',
        background: 'radial-gradient(circle, rgba(255, 59, 104, 0.22) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '480px',
        height: '480px',
        background: 'radial-gradient(circle, rgba(162, 56, 255, 0.22) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />

      {/* Main Glassmorphic Auth Container matching app surfaces */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-surface, rgba(22, 18, 33, 0.75))',
        backdropFilter: 'blur(35px)',
        WebkitBackdropFilter: 'blur(35px)',
        border: '1px solid var(--border-glow, rgba(255, 75, 114, 0.25))',
        borderRadius: '28px',
        padding: '36px 30px',
        boxShadow: 'var(--shadow-floating, 0 12px 36px rgba(0, 0, 0, 0.6)), 0 0 35px rgba(255, 59, 104, 0.15)',
        position: 'relative',
        zIndex: 2,
        margin: 'auto'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {/* App Logo with gradient glow */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'var(--gradient-romantic, linear-gradient(135deg, #ff3b68 0%, #a238ff 100%))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(255, 59, 104, 0.45)',
            marginBottom: '16px'
          }}>
            <Music2 size={34} color="#ffffff" strokeWidth={2.2} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display, "Outfit", sans-serif)',
            fontSize: '1.95rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
            marginBottom: '8px'
          }}>
            Millions of songs.<br />
            <span style={{
              background: 'linear-gradient(90deg, #ffffff 0%, #ff758c 50%, #b185ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Free on Suno Music.
            </span>
          </h1>

          <p style={{
            fontSize: '0.86rem',
            color: 'var(--text-secondary, rgba(255, 255, 255, 0.68))',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <span>Sign up or log in to unlock player</span>
            <Sparkles size={14} color="var(--accent-rose-light, #ff758c)" />
          </p>
        </div>

        {/* Inline styles for custom animations and focus effects */}
        <style>{`
          @keyframes authCascadeIn {
            0% {
              opacity: 0;
              transform: translateY(12px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .auth-field-1 { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.04s both; }
          .auth-field-2 { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both; }
          .auth-field-3 { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both; }
          .auth-field-4 { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both; }
          .auth-field-btn { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.20s both; }
          .auth-field-footer { animation: authCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both; }

          .auth-input-box {
            transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1) !important;
          }
          .auth-input-box:focus-within {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: var(--accent-rose-light, #ff758c) !important;
            box-shadow: 0 0 20px rgba(255, 59, 104, 0.25) !important;
            transform: translateY(-1px);
          }
        `}</style>

        {/* Tab Switcher: Liquid Spring Sliding Pill */}
        <div style={{
          position: 'relative',
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.45)',
          borderRadius: '16px',
          padding: '4px',
          marginBottom: '22px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          overflow: 'hidden'
        }}>
          {/* Animated Liquid Background Pill */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: '4px',
              width: 'calc(50% - 4px)',
              borderRadius: '12px',
              background: activeTab === 'signup'
                ? 'var(--gradient-romantic, linear-gradient(135deg, #ff3b68 0%, #a238ff 100%))'
                : 'linear-gradient(135deg, #a238ff 0%, #ff3b68 100%)',
              boxShadow: activeTab === 'signup'
                ? '0 4px 20px rgba(255, 59, 104, 0.45), 0 0 16px rgba(162, 56, 255, 0.3)'
                : '0 4px 20px rgba(162, 56, 255, 0.45), 0 0 16px rgba(255, 59, 104, 0.3)',
              transform: activeTab === 'signup' ? 'translateX(0%)' : 'translateX(100%)',
              transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, background 0.35s ease',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />

          <button
            type="button"
            onClick={() => switchTab('signup')}
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              padding: '11px 0',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-display, "Outfit", sans-serif)',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'signup' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              transition: 'color 0.25s ease, transform 0.25s ease',
              transform: activeTab === 'signup' ? 'scale(1.02)' : 'scale(0.97)',
              outline: 'none'
            }}
          >
            <UserPlus size={15} color={activeTab === 'signup' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)'} />
            <span>Sign Up</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('login')}
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              padding: '11px 0',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-display, "Outfit", sans-serif)',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'login' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              transition: 'color 0.25s ease, transform 0.25s ease',
              transform: activeTab === 'login' ? 'scale(1.02)' : 'scale(0.97)',
              outline: 'none'
            }}
          >
            <LogIn size={15} color={activeTab === 'login' ? '#ffffff' : 'rgba(255, 255, 255, 0.55)'} />
            <span>Log In</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 59, 104, 0.15)',
            border: '1px solid rgba(255, 59, 104, 0.4)',
            color: '#ff85a2',
            padding: '12px 14px',
            borderRadius: '14px',
            fontSize: '0.84rem',
            marginBottom: '18px',
            animation: 'authCascadeIn 0.3s ease'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(162, 56, 255, 0.18)',
            border: '1px solid rgba(162, 56, 255, 0.45)',
            color: '#d1b8ff',
            padding: '12px 14px',
            borderRadius: '14px',
            fontSize: '0.84rem',
            marginBottom: '18px',
            animation: 'authCascadeIn 0.3s ease'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{success}</span>
          </div>
        )}

        {/* Smooth Form Stage Viewport with Dynamic Height */}
        <div style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          height: formHeight ? `${formHeight}px` : 'auto',
          transition: 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          {/* 2-Slide Horizontal Sliding Track */}
          <div style={{
            display: 'flex',
            width: '200%',
            transform: activeTab === 'signup' ? 'translateX(0%)' : 'translateX(-50%)',
            transition: 'transform 0.48s cubic-bezier(0.22, 1, 0.36, 1)',
            alignItems: 'flex-start'
          }}>
            {/* SLIDE 1: Sign Up Form */}
            <div
              ref={signupRef}
              style={{
                width: '50%',
                padding: '0 2px',
                boxSizing: 'border-box',
                flexShrink: 0,
                opacity: activeTab === 'signup' ? 1 : 0,
                transform: activeTab === 'signup' ? 'translateX(0) scale(1)' : 'translateX(-32px) scale(0.96)',
                filter: activeTab === 'signup' ? 'blur(0px)' : 'blur(5px)',
                pointerEvents: activeTab === 'signup' ? 'auto' : 'none',
                visibility: activeTab === 'signup' ? 'visible' : 'hidden',
                transition: 'opacity 0.36s ease, transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), filter 0.36s ease, visibility 0.48s'
              }}
            >
              <form key={activeTab === 'signup' ? 'signup-active' : 'signup-idle'} onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Full Name */}
                <div className="auth-field-1">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)', marginBottom: '6px' }}>
                    Your Full Name
                  </label>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <User size={17} color="var(--accent-rose-light, #ff758c)" />
                    <input
                      type="text"
                      placeholder="e.g. Saurav Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '13px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Unique User ID */}
                <div className="auth-field-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)' }}>
                      Choose Unique User ID
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, rgba(255, 255, 255, 0.4))' }}>Unique handle</span>
                  </div>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <AtSign size={17} color="var(--accent-rose-light, #ff758c)" />
                    <input
                      type="text"
                      placeholder="e.g. saurav_01"
                      value={userId}
                      onChange={e => setUserId(e.target.value.toLowerCase())}
                      autoComplete="username"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '13px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="auth-field-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)' }}>
                      Phone Number
                    </label>
                    <span style={{ fontSize: '0.72rem', color: phone.length === 10 ? '#1ed760' : 'var(--accent-lavender, #b185ff)', fontWeight: phone.length === 10 ? 700 : 400 }}>
                      {phone.length > 0 ? `${phone.length}/10 digits` : '10 digits only'}
                    </span>
                  </div>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <Phone size={17} color="var(--accent-rose-light, #ff758c)" />
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
                      autoComplete="tel"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '13px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="auth-field-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)' }}>
                      Create Password
                    </label>
                    <span style={{ fontSize: '0.72rem', color: registerPassword.length >= 8 ? '#1ed760' : 'rgba(255, 255, 255, 0.45)', fontWeight: registerPassword.length >= 8 ? 700 : 400 }}>
                      {registerPassword.length > 0 ? `${registerPassword.length}/8 min` : 'Min 8 characters'}
                    </span>
                  </div>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <Lock size={17} color="var(--accent-rose-light, #ff758c)" />
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={registerPassword}
                      minLength={8}
                      onChange={e => setRegisterPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '13px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary, rgba(255, 255, 255, 0.4))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || isUnlocking}
                  className="auth-field-btn"
                  style={{
                    marginTop: '8px',
                    height: '50px',
                    borderRadius: '500px',
                    background: 'var(--gradient-romantic, linear-gradient(135deg, #ff3b68 0%, #a238ff 100%))',
                    color: '#ffffff',
                    border: 'none',
                    fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(255, 59, 104, 0.45)',
                    transform: 'scale(1)',
                    transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(255, 59, 104, 0.6)'; } }}
                  onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 59, 104, 0.45)'; } }}
                >
                  <span>{loading ? 'Creating Your Account...' : 'Sign Up Free'}</span>
                  <ArrowRight size={18} />
                </button>

                {/* Quick Switch Link */}
                <div className="auth-field-footer" style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-rose-light, #ff758c)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '0 4px',
                      textDecoration: 'none',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    Log In →
                  </button>
                </div>
              </form>
            </div>

            {/* SLIDE 2: Log In Form */}
            <div
              ref={loginRef}
              style={{
                width: '50%',
                padding: '0 2px',
                boxSizing: 'border-box',
                flexShrink: 0,
                opacity: activeTab === 'login' ? 1 : 0,
                transform: activeTab === 'login' ? 'translateX(0) scale(1)' : 'translateX(32px) scale(0.96)',
                filter: activeTab === 'login' ? 'blur(0px)' : 'blur(5px)',
                pointerEvents: activeTab === 'login' ? 'auto' : 'none',
                visibility: activeTab === 'login' ? 'visible' : 'hidden',
                transition: 'opacity 0.36s ease, transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), filter 0.36s ease, visibility 0.48s'
              }}
            >
              <form key={activeTab === 'login' ? 'login-active' : 'login-idle'} onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="auth-field-1">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)', marginBottom: '6px' }}>
                    Phone Number or User ID
                  </label>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <User size={17} color="var(--accent-rose-light, #ff758c)" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210 or saurav_01"
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      autoComplete="username"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '14px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div className="auth-field-2">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-rose-light, #ff758c)', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div className="auth-input-box" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    borderRadius: '14px',
                    padding: '0 14px'
                  }}>
                    <Lock size={17} color="var(--accent-rose-light, #ff758c)" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        padding: '14px 0',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary, rgba(255, 255, 255, 0.4))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* App's Romantic Gradient Pill Button */}
                <button
                  type="submit"
                  disabled={loading || isUnlocking}
                  className="auth-field-btn"
                  style={{
                    marginTop: '6px',
                    height: '50px',
                    borderRadius: '500px',
                    background: 'var(--gradient-romantic, linear-gradient(135deg, #ff3b68 0%, #a238ff 100%))',
                    color: '#ffffff',
                    border: 'none',
                    fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(255, 59, 104, 0.45)',
                    transform: 'scale(1)',
                    transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(255, 59, 104, 0.6)'; } }}
                  onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 59, 104, 0.45)'; } }}
                >
                  <span>{loading ? 'Logging in...' : 'Log In'}</span>
                  <ArrowRight size={18} />
                </button>

                {/* Quick Switch Link */}
                <div className="auth-field-footer" style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-rose-light, #ff758c)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '0 4px',
                      textDecoration: 'none',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    Sign Up Free →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Trust Badges matching app accents */}
        <div style={{
          marginTop: '26px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          color: 'var(--text-secondary, rgba(255, 255, 255, 0.68))',
          fontSize: '0.74rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={13} color="var(--accent-rose, #ff3b68)" />
            <span>Ad-Free Audio</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Radio size={13} color="var(--accent-rose-light, #ff758c)" />
            <span>Indian Music Brain</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={13} color="var(--accent-lavender, #b185ff)" />
            <span>MySQL Cloud Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
