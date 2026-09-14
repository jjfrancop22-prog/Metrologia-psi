import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ERP METROLÓGICO NEXTGEN — Firebase Web App
// La configuración web de Firebase no es una contraseña secreta.
const firebaseConfig = {
  apiKey: 'AIzaSyBR_MV4cQZakUPLTQrV6TWqMRX5mNHpf2k',
  authDomain: 'psi-inventarios2026.firebaseapp.com',
  projectId: 'psi-inventarios2026',
  storageBucket: 'psi-inventarios2026.firebasestorage.app',
  messagingSenderId: '238951165415',
  appId: '1:238951165415:web:06e0321ea96bc47407a142'
};

export let app = null;
export let auth = null;
export let db = null;
export let storage = null;
export let firebaseConfigured = true;
export let firebaseInitError = '';

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
