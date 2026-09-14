import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ERP METROLÓGICO NEXTGEN — Firebase Web App
// En producción la configuración se inyecta desde variables VITE_* de Netlify.
// Estas variables identifican la app web de Firebase; la seguridad real se mantiene
// en Authentication + reglas de Firestore/Storage + restricciones de la API key.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const firebaseProjectId = firebaseConfig.projectId;
export let app = null;
export let auth = null;
export let db = null;
export let storage = null;
export let firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
export let firebaseInitError = firebaseConfigured ? '' : 'Faltan variables VITE_FIREBASE_* de configuración.';

if (firebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    setPersistence(auth, browserSessionPersistence).catch((err) => {
      console.warn('Persistencia de sesión:', err);
    });
  } catch (err) {
    firebaseConfigured = false;
    firebaseInitError = err?.message || String(err);
    console.error('Error inicializando Firebase:', err);
  }
} else {
  console.error('Firebase no configurado:', firebaseInitError);
}
