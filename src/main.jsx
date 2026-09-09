import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { MusicProvider } from './context/MusicContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <MusicProvider>
        <App />
      </MusicProvider>
    </UserProvider>
  </React.StrictMode>
);
