import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfigured } from './firebase.js';
export async function writeAudit({actorUid,action,module,entityId='',before=null,after=null}){
  if(!firebaseConfigured || !actorUid) return;
  await addDoc(collection(db,'auditLogs'),{actorUid,action,module,entityId,before,after,createdAt:serverTimestamp(),source:'WEB_PWA'});
}
