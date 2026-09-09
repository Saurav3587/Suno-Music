import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { MusicProvider } from './context/MusicContext';

// Automatically route API requests to the backend server when running as native mobile app
if (Capacitor.isNativePlatform()) {
  const originalFetch = window.fetch;
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://10.51.125.150:3001';
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      resource = `${backendBase}${resource}`;
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

