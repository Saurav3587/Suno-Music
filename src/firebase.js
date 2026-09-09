import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDIDvIAmPuoNAbVbWEMtiwg5nAH0mla3Kc",
  authDomain: "suno-music-c01ee.firebaseapp.com",
  projectId: "suno-music-c01ee",
  storageBucket: "suno-music-c01ee.firebasestorage.app",
  messagingSenderId: "161468380634",
  appId: "1:161468380634:web:10274fa440864e53877ce3",
  measurementId: "G-444XS16PVH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
