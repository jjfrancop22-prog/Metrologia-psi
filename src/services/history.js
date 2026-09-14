import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { writeAudit } from './audit.js';

export function observeOperationsHistory(callback,onError=console.error){
  const q=query(collection(db,'operationsHistory'),orderBy('createdAt','desc'));
  return onSnapshot(q,s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}

export function observeAuditHistory(callback,onError=console.error){
  const q=query(collection(db,'auditLogs'),orderBy('createdAt','desc'));
  return onSnapshot(q,s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}

export async function addManualOperation(data,user){
  if(!user?.uid) throw new Error('Sesión no disponible.');
  if(!data?.equipmentId) throw new Error('Seleccione un equipo.');
  if(!data?.date) throw new Error('Ingrese la fecha de la operación.');
  if(!data?.type) throw new Error('Seleccione el tipo de operación.');
  const ref=await addDoc(collection(db,'operationsHistory'),{
    equipmentId:data.equipmentId,
    equipmentCode:data.equipmentCode||'',
    equipmentName:data.equipmentName||'',
    date:data.date,
    type:data.type,
    title:data.title||'',
    responsible:data.responsible||'',
    result:data.result||'',
    notes:data.notes||'',
    source:'MANUAL_HISTORY',
    requiresFollowUp:data.requiresFollowUp===true,
    createdAt:serverTimestamp(),
    createdBy:user.uid,
    createdByEmail:user.email||''
  });
  return ref.id;
}


export async function updateManualOperation(eventId,data,user,previous={},correctionReason=''){
  if(!user?.uid) throw new Error('Sesión no disponible.');
  if(!eventId) throw new Error('Evento no disponible.');
  if(!data?.equipmentId||!data?.date||!data?.type) throw new Error('Complete equipo, fecha y tipo.');
  const after={
    equipmentId:data.equipmentId, equipmentCode:data.equipmentCode||'', equipmentName:data.equipmentName||'',
    date:data.date, type:data.type, title:data.title||'', responsible:data.responsible||'', result:data.result||'', notes:data.notes||'',
    source:'MANUAL_HISTORY', requiresFollowUp:data.requiresFollowUp===true, updatedAt:serverTimestamp(), updatedBy:user.uid, updatedByEmail:user.email||'',
    correctionReason:String(correctionReason||'Corrección de registro manual').trim(),
    lastCorrection:{previousDate:previous?.date||'',previousType:previous?.type||'',previousTitle:previous?.title||'',correctedBy:user.email||user.uid,correctedAtIso:new Date().toISOString()}
  };
  await updateDoc(doc(db,'operationsHistory',eventId),after);
  await writeAudit({actorUid:user.uid,action:'CORRECT_MANUAL_OPERATION',module:'HISTORIAL_OPERACIONES',entityId:eventId,before:{date:previous?.date||'',type:previous?.type||'',title:previous?.title||'',result:previous?.result||'',notes:previous?.notes||''},after:{date:data.date,type:data.type,title:data.title||'',result:data.result||'',notes:data.notes||'',correctionReason:after.correctionReason}}).catch(console.warn);
}
