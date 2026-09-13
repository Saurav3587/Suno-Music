import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { MusicProvider } from './context/MusicContext';

// Automatically route API requests to backend with resilient fallback between Cloud (Render) and Local (Laptop/Emulator)
const isNative = Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.location.port !== '5173');

if (isNative) {
  const originalFetch = window.fetch;
  const CLOUD_BACKEND = 'https://suno-music-x6c4.onrender.com';

  // Default to 24/7 cloud backend; only use custom local backend if developer explicitly set it
  let currentBackend = localStorage.getItem('suno_custom_backend') || CLOUD_BACKEND;

  // Proactive background ping on app launch to warm up Render if cold
  (async () => {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 12000);
      await originalFetch(`${CLOUD_BACKEND}/api/health`, { signal: c.signal });
      clearTimeout(t);
    } catch (_) {}
  })();

  window.fetch = async function (resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      const endpointsToTry = [
        currentBackend,
        CLOUD_BACKEND
      ].filter((h, idx, arr) => arr.indexOf(h) === idx);

      let lastError;
      for (const host of endpointsToTry) {
        try {
          const timeoutMs = 20000;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const combinedSignal = init?.signal || controller.signal;
          const res = await originalFetch(`${host}${resource}`, { ...init, signal: combinedSignal });
          clearTimeout(timer);
          return res;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error('Failed to connect to cloud backend server');
    }
    return originalFetch(resource, init);
  };
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Suno Music Root Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px',
          color: '#ffffff',
          textAlign: 'center',
          background: '#06050a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#ff3b68', fontSize: '1.4rem', marginBottom: '12px' }}>Unable to launch app</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '360px', fontSize: '0.88rem', lineHeight: '1.6' }}>
            {String(this.state.error?.message || this.state.error || 'An unexpected initialization error occurred.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '12px 28px',
              borderRadius: '99px',
              background: 'linear-gradient(135deg, #ff3b68, #a238ff)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}
          >
            Restart App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <MusicProvider>
          <App />
        </MusicProvider>
      </UserProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

