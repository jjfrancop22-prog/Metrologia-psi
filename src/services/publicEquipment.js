import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const clean=v=>typeof v==='string'?v.trim():(v??'');
const date=v=>String(v||'').slice(0,10);

export function publicEquipmentSnapshot(id,e={}){
  const c=e.currentControl||{};
  const cal=c.calibration||c.calibrationInternal||c.calibrationExternal||{};
  const ver=c.verification||{};
  const maint=c.maintenance||{};
  return {
    equipmentId:String(id||''),
    code:clean(e.code).toUpperCase(),
    name:clean(e.name),
    status:clean(e.status)||'ACTIVO',
    brand:clean(e.technical?.brand),
    model:clean(e.technical?.model),
    calibration:{result:clean(cal.result||cal.status)||'SIN REGISTRO',lastDate:date(cal.lastDate||cal.date||cal.completedAt),nextDate:date(cal.nextDate||cal.dueDate)},
    verification:{result:clean(ver.result||ver.status)||'SIN REGISTRO',lastDate:date(ver.lastDate),nextDate:date(ver.nextDate)},
    maintenance:{result:clean(maint.result||maint.status)||'SIN REGISTRO',lastDate:date(maint.lastDate),nextDate:date(maint.nextDate)},
    labelInstalled:e.identificationLabel?.installed===true,
    publicSchemaVersion:1,
    updatedAt:serverTimestamp()
  };
}
export async function publishPublicEquipmentStatus(id,e={}){
  const code=clean(e.code).toUpperCase();
  if(!id||!code) return;
  await setDoc(doc(db,'publicEquipmentStatus',code),publicEquipmentSnapshot(id,e),{merge:true});
}
export async function getPublicEquipmentStatus(key){
  if(!key) return null;
  const snap=await getDoc(doc(db,'publicEquipmentStatus',String(key).toUpperCase()));
  return snap.exists()?{id:snap.id,...snap.data()}:null;
}
