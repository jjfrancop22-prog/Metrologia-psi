import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { writeAudit } from './audit.js';

export function observeFieldMovements(callback,onError=console.error){
  const q=query(collection(db,'fieldMovements'),orderBy('createdAt','desc'));
  return onSnapshot(q,s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}
export async function createFieldMovement(data,user){
  if(!user?.uid) throw new Error('Sesión no disponible.');
  if(!data?.activity||!data?.equipmentId) throw new Error('Seleccione actividad y equipo.');
  const payload={...data,status:'EN_CAMPO',source:'CONTROL_CAMPO_QR',createdAt:serverTimestamp(),createdBy:user.uid,createdByEmail:user.email||''};
  const ref=await addDoc(collection(db,'fieldMovements'),payload);
  await writeAudit({actorUid:user.uid,action:'FIELD_CHECKOUT',module:'CONTROL_CAMPO_QR',entityId:ref.id,before:null,after:{equipmentId:data.equipmentId,equipmentCode:data.equipmentCode,activity:data.activity,status:'EN_CAMPO'}}).catch(console.warn);
  return ref.id;
}
export async function registerFieldReturn(id,data,user){
  if(!user?.uid||!id) throw new Error('Sesión o movimiento no disponible.');
  await updateDoc(doc(db,'fieldMovements',id),{...data,status:'RETORNO_PENDIENTE',returnedAt:serverTimestamp(),returnedBy:user.uid,returnedByEmail:user.email||''});
  await writeAudit({actorUid:user.uid,action:'FIELD_RETURN',module:'CONTROL_CAMPO_QR',entityId:id,before:{status:'EN_CAMPO'},after:{status:'RETORNO_PENDIENTE',returnCondition:data.returnCondition||''}}).catch(console.warn);
}
export async function verifyFieldReturn(id,data,user){
  if(!user?.uid||!id) throw new Error('Sesión o movimiento no disponible.');
  await updateDoc(doc(db,'fieldMovements',id),{...data,status:'CERRADO',closedAt:serverTimestamp(),closedBy:user.uid,closedByEmail:user.email||''});
  await writeAudit({actorUid:user.uid,action:'FIELD_RETURN_VERIFIED',module:'CONTROL_CAMPO_QR',entityId:id,before:{status:'RETORNO_PENDIENTE'},after:{status:'CERRADO',supervisorCondition:data.supervisorCondition||''}}).catch(console.warn);
}
export function observeFieldConfigs(callback,onError=console.error){
  return onSnapshot(collection(db,'fieldEquipmentConfigs'),s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}
export async function saveFieldConfig(equipmentId,data,user){
  if(!user?.uid||!equipmentId) throw new Error('Equipo no disponible.');
  const { setDoc } = await import('firebase/firestore');
  await setDoc(doc(db,'fieldEquipmentConfigs',equipmentId),{...data,equipmentId,updatedAt:serverTimestamp(),updatedBy:user.uid,updatedByEmail:user.email||''},{merge:true});
  await writeAudit({actorUid:user.uid,action:'FIELD_KIT_CONFIG',module:'CONTROL_CAMPO_QR',entityId:equipmentId,before:null,after:{activities:data.activities||[],components:data.components||[]}}).catch(console.warn);
}
