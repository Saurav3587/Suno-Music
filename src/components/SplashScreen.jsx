import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';

export default function SplashScreen({ onFinish }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show the animated splash for 2.2 seconds before starting smooth fade-out
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2200);

    // Completely unmount after fade transition (600ms)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 2800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`app-splash-screen ${isExiting ? 'splash-fade-out' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100dvh',
        backgroundColor: '#06050a',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
    >
      {/* Dynamic Background Ambient Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 46, 147, 0.35) 0%, rgba(162, 56, 255, 0.2) 45%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'splashPulseGlow 2.8s ease-in-out infinite alternate',
          pointerEvents: 'none'
        }}
      />

      {/* Ripple Sound Resonance Waves */}
      <div className="splash-ripple splash-ripple-1" />
      <div className="splash-ripple splash-ripple-2" />
      <div className="splash-ripple splash-ripple-3" />

      {/* Central Logo & Brand Stack */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
          animation: 'splashLogoEntrance 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Animated Logo Frame */}
        <div
          style={{
            position: 'relative',
            width: '144px',
            height: '144px',
            borderRadius: '34px',
            padding: '3px',
            background: 'linear-gradient(135deg, rgba(255, 46, 147, 0.45) 0%, rgba(162, 56, 255, 0.45) 100%)',
            boxShadow: '0 16px 48px rgba(255, 46, 147, 0.36), 0 0 65px rgba(162, 56, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'splashFloat 3.2s ease-in-out infinite'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '31px',
              backgroundColor: '#0c0b14',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <img
              src={logoImg}
              alt="Suno Music Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
        </div>

        {/* Brand App Name */}
        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, "Outfit", sans-serif)',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              margin: 0,
              background: 'linear-gradient(135deg, #ffffff 0%, #ff85a2 50%, #c482ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 20px rgba(255, 46, 147, 0.28)'
            }}
          >
            Suno Music
          </h1>

          {/* Subtitle / Tagline */}
          <p
            style={{
              fontSize: '0.78rem',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '6px 0 0 0',
              fontWeight: 500,
              letterSpacing: '0.2px'
            }}
          >
            Feel Every Beat <span style={{ color: '#ff758c', margin: '0 4px' }}>•</span> In India, For India 🇮🇳
          </p>
        </div>

        {/* Animated Soundwave Equalizer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            marginTop: '22px',
            height: '22px'
          }}
        >
          {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9].map((delay, idx) => (
            <div
              key={idx}
              style={{
                width: '3.5px',
                height: '100%',
                background: 'linear-gradient(to top, #ff2e93, #a238ff)',
                borderRadius: '99px',
                animation: `splashBarDance 1s ease-in-out ${delay * 0.2}s infinite alternate`
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Studio Lossless Label */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(24px + var(--safe-bottom, 10px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 2,
          opacity: 0.75
        }}
      >
        <span
          style={{
            fontSize: '0.66rem',
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}
        >
          Studio Lossless & Acoustics
        </span>
      </div>
    </div>
  );
}
