import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseConfigured } from './firebase.js';

export function observeEquipment(cb, onError=console.error){
  if(!firebaseConfigured) return ()=>{};
  const q=query(collection(db,'equipment'),orderBy('code'));
  return onSnapshot(q, snap => cb(snap.docs.map(d=>({id:d.id,...d.data()}))), onError);
}


export function observeSystemStatus(cb){
  if(!firebaseConfigured){ cb({mode:'NO_CONFIGURADO'}); return ()=>{}; }
  return onSnapshot(doc(db,'system','status'), snap => cb(snap.exists()?snap.data():{mode:'CONECTADO'}), ()=>cb({mode:'CONECTADO'}));
}
export async function heartbeat(uid){
  if(!firebaseConfigured || !uid) return;
  await setDoc(doc(db,'users',uid),{lastSeenAt:serverTimestamp()},{merge:true});
}
