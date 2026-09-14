import {
  collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from './firebase.js';
import { writeAudit } from './audit.js';

export function observeMetrologyProgram(callback,onError=console.error){
  const q=query(collection(db,'metrologyProgram'),orderBy('updatedAt','desc'));
  return onSnapshot(q,s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}

export function programDocId(equipmentId,controlType,modality,scopeKey=''){
  return `${equipmentId}__${controlType}__${modality}${scopeKey?'__'+scopeKey:''}`.replace(/[^A-Za-z0-9_-]/g,'_');
}

export async function saveProgramPlan(data,user){
  if(!data?.equipmentId||!data?.controlType||!data?.modality)throw new Error('Plan metrológico incompleto.');
  const id=programDocId(data.equipmentId,data.controlType,data.modality,data.scopeKey||'');
  const payload={
    equipmentId:data.equipmentId,
    equipmentCode:data.equipmentCode||'',
    equipmentName:data.equipmentName||'',
    controlType:data.controlType,
    modality:data.modality,
    scopeKey:data.scopeKey||'',
    plannedDate:data.plannedDate||'',
    assignedTo:(data.assignedTo||'').trim(),
    provider:(data.provider||'').trim(),
    notes:(data.notes||'').trim(),
    priorityOverride:data.priorityOverride||'',
    maintenanceDetails:data.maintenanceDetails&&typeof data.maintenanceDetails==='object'?data.maintenanceDetails:null,
    source:'PROGRAMA_METROLOGICO',
    updatedAt:serverTimestamp(),
    updatedBy:user?.uid||'',
    updatedByEmail:user?.email||''
  };
  await setDoc(doc(db,'metrologyProgram',id),payload,{merge:true});
  await writeAudit({actorUid:user?.uid||'',action:'PROGRAM_PLAN',module:'PROGRAMA_METROLOGICO',entityId:id,before:null,after:payload});
  return id;
}
