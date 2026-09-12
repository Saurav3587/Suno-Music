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
  const LOCAL_BACKENDS = [
    'http://10.51.125.150:3001',
    'http://10.0.2.2:3001',
    'http://localhost:3001'
  ];

  // Default to saved custom backend or cloud backend (never stick permanently to a dead local IP)
  let currentBackend = localStorage.getItem('suno_custom_backend')
    || localStorage.getItem('suno_active_backend')
    || CLOUD_BACKEND;

  // Proactive background ping on app launch:
  // 1. Probe local server with a fast 1200ms timeout
  // 2. Ping cloud backend concurrently to ensure Render is awake and ready
  (async () => {
    let foundLocal = false;
    for (const localHost of LOCAL_BACKENDS) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1200);
        const r = await originalFetch(`${localHost}/api/health`, { signal: controller.signal });
        clearTimeout(t);
        if (r.ok) {
          currentBackend = localHost;
          localStorage.setItem('suno_active_backend', localHost);
          foundLocal = true;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    // If laptop is closed or on a different network, lock immediately onto cloud backend
    if (!foundLocal && !localStorage.getItem('suno_custom_backend')) {
      currentBackend = CLOUD_BACKEND;
      localStorage.setItem('suno_active_backend', CLOUD_BACKEND);
      // Warm up Render if cold
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 10000);
        await originalFetch(`${CLOUD_BACKEND}/api/health`, { signal: c.signal });
        clearTimeout(t);
      } catch (e) {}
    }
  })();

  window.fetch = async function (resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      const endpointsToTry = [
        currentBackend,
        CLOUD_BACKEND,
        ...LOCAL_BACKENDS
      ].filter((h, idx, arr) => arr.indexOf(h) === idx);

      let lastError;
      for (const host of endpointsToTry) {
        try {
          const isLocal = host.includes('10.') || host.includes('localhost') || host.includes('127.0.0.1');
          // Local hosts fail fast (1500ms) if laptop is closed; Cloud host gets 15s for scraping & searches
          const timeoutMs = isLocal ? 1500 : 15000;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const combinedSignal = init?.signal || controller.signal;
          const res = await originalFetch(`${host}${resource}`, { ...init, signal: combinedSignal });
          clearTimeout(timer);

          if (currentBackend !== host) {
            currentBackend = host;
            localStorage.setItem('suno_active_backend', host);
          }
          return res;
        } catch (err) {
          lastError = err;
          // If the failed host was currentBackend, immediately switch to Cloud so next requests don't lag
          if (currentBackend === host && host !== CLOUD_BACKEND) {
            currentBackend = CLOUD_BACKEND;
          }
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

