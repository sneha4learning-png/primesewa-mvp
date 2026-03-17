import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAIbQbqLbqDlmrtR-p5R_ICWXwHU06e-BA",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "primeseva-mvp.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "primeseva-mvp",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "primeseva-mvp.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "363714609925",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:363714609925:web:b0cf9af57782de28116d6c"
};

// Check if we are using fallbacks or real env vars
const usedFallbacks = Object.keys(firebaseConfig).filter(k => !import.meta.env[`VITE_FIREBASE_${k.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`]);
if (usedFallbacks.length > 0) {
    console.warn(`[Firebase] Using hardcoded fallbacks for: ${usedFallbacks.join(', ')}. Please check your .env file.`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure auth session persists across page refreshes (stored in localStorage)
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('[Firebase] Failed to set auth persistence:', err);
});
