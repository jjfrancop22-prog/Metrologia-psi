import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from './firebase.js';

const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_KEY = 'psi_metrologico_session_activity';

function now(){ return Date.now(); }
export function touchSession(){
  try{ sessionStorage.setItem(SESSION_KEY,String(now())); }catch{}
}
export function clearSessionMarker(){
  try{ sessionStorage.removeItem(SESSION_KEY); }catch{}
}
export function sessionIsFresh(){
  try{
    const last=Number(sessionStorage.getItem(SESSION_KEY)||0);
    return !!last && (now()-last)<SESSION_IDLE_MS;
  }catch{return false;}
}
export function sessionRemainingMs(){
  try{
    const last=Number(sessionStorage.getItem(SESSION_KEY)||0);
    return Math.max(0,SESSION_IDLE_MS-(now()-last));
  }catch{return 0;}
}
export const SESSION_IDLE_MINUTES=30;

export async function login(email, password){
  if(!firebaseConfigured) throw new Error('Firebase aún no está configurado en .env');
  if(!navigator.onLine) throw new Error('Sin conexión a Internet. Conéctese a la red antes de iniciar sesión.');
  // Se marca el intento antes de autenticar para que onAuthStateChanged no descarte
  // la sesión recién creada durante el mismo ciclo de inicio de sesión.
  touchSession();
  try{
    const cred = await signInWithEmailAndPassword(auth,email,password);
    const ref = doc(db,'users',cred.user.uid);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      await setDoc(ref,{email:cred.user.email,displayName:cred.user.email,role:'PENDIENTE',active:false,createdAt:serverTimestamp()});
    }
    touchSession();
    return cred.user;
  }catch(err){
    clearSessionMarker();
    throw err;
  }
}
export async function logout(){ clearSessionMarker(); return signOut(auth); }
export function observeAuth(cb){
  if(!firebaseConfigured){ cb(null); return ()=>{}; }
  return onAuthStateChanged(auth,cb);
}
