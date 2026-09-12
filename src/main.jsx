import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { MusicProvider } from './context/MusicContext';

// Automatically route API requests to the backend server with auto-fallback between Emulator (10.0.2.2) and Physical Device (10.51.125.150)
const isNative = Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && window.location.port !== '5173');

if (isNative) {
  const originalFetch = window.fetch;
  const CANDIDATES = [
    localStorage.getItem('suno_custom_backend'),
    localStorage.getItem('suno_active_backend'),
    'http://10.51.125.150:3001',
    'http://10.0.2.2:3001',
    'http://localhost:3001'
  ].filter(Boolean);

  let currentBackend = CANDIDATES[0] || 'http://10.51.125.150:3001';

  // Proactive background ping to lock onto responding host immediately
  (async () => {
    for (const host of ['http://10.51.125.150:3001', currentBackend, 'http://10.0.2.2:3001']) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1200);
        const r = await originalFetch(`${host}/api/health`, { signal: controller.signal });
        clearTimeout(t);
        if (r.ok) {
          currentBackend = host;
          localStorage.setItem('suno_active_backend', host);
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }
  })();

  window.fetch = async function (resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      const endpointsToTry = [
        currentBackend,
        'http://10.51.125.150:3001',
        'http://10.0.2.2:3001',
        'http://localhost:3001'
      ].filter((h, idx, arr) => arr.indexOf(h) === idx);

      let lastError;
      for (const host of endpointsToTry) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const combinedSignal = init?.signal || controller.signal;
          const res = await originalFetch(`${host}${resource}`, { ...init, signal: combinedSignal });
          clearTimeout(timer);
          currentBackend = host;
          localStorage.setItem('suno_active_backend', host);
          return res;
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error('Failed to connect to backend server');
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

