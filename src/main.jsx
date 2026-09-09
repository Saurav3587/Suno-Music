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
    'http://10.0.2.2:3001',
    'http://10.51.125.150:3001',
    'http://localhost:3001'
  ].filter(Boolean);

  let currentBackend = CANDIDATES[0] || 'http://10.0.2.2:3001';

  // Proactive background ping to lock onto responding host immediately
  (async () => {
    for (const host of [currentBackend, 'http://10.0.2.2:3001', 'http://10.51.125.150:3001']) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1500);
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
        currentBackend === 'http://10.0.2.2:3001' ? 'http://10.51.125.150:3001' : 'http://10.0.2.2:3001',
        'http://localhost:3001'
      ];

      let lastError;
      for (const host of endpointsToTry) {
        try {
          const res = await originalFetch(`${host}${resource}`, init);
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


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <MusicProvider>
        <App />
      </MusicProvider>
    </UserProvider>
  </React.StrictMode>
);

