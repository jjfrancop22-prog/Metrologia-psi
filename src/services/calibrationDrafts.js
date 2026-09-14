import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

function draftId(equipmentId, scopeKey='general'){
  return `${equipmentId}__${scopeKey||'general'}`.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,900);
}

export async function saveCalibrationDraft(equipmentId, scopeKey, payload, user){
  const id=draftId(equipmentId,scopeKey);
  await setDoc(doc(db,'calibrationDrafts',id),{
    equipmentId, scopeKey:scopeKey||'', payload,
    status:'BORRADOR', updatedAt:serverTimestamp(),
    updatedBy:user?.uid||'', updatedByEmail:user?.email||''
  },{merge:true});
  return id;
}

export async function getCalibrationDraft(equipmentId, scopeKey){
  const snap=await getDoc(doc(db,'calibrationDrafts',draftId(equipmentId,scopeKey)));
  return snap.exists()?{id:snap.id,...snap.data()}:null;
}

export async function deleteCalibrationDraft(equipmentId, scopeKey){
  await deleteDoc(doc(db,'calibrationDrafts',draftId(equipmentId,scopeKey)));
}
