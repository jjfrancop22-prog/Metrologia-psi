import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

const clean=v=>typeof v==='string'?v.trim():(v??'');
const date=v=>{
  if(!v) return '';
  if(typeof v==='string') return v.slice(0,10);
  if(v?.toDate instanceof Function) return v.toDate().toISOString().slice(0,10);
  if(v instanceof Date) return v.toISOString().slice(0,10);
  return String(v||'').slice(0,10);
};
const meaningful=x=>!!(x&&typeof x==='object'&&[
  x.lastDate,x.nextDate,x.date,x.completedAt,x.dueDate,x.result,x.status,
  x.certificateNumber,x.sourceRecordId
].some(v=>v!==undefined&&v!==null&&String(v).trim()!==''&&String(v).toUpperCase()!=='SIN REGISTRO'));
const score=x=>{
  if(!x||typeof x!=='object') return -1;
  let n=0;
  if(x.lastDate||x.date||x.completedAt)n+=4;
  if(x.nextDate||x.dueDate)n+=4;
  if(x.result&&String(x.result).toUpperCase()!=='SIN REGISTRO')n+=3;
  if(x.status&&String(x.status).toUpperCase()!=='SIN REGISTRO')n+=2;
  if(x.certificateNumber||x.sourceRecordId)n+=1;
  return n;
};
const best=(...xs)=>xs.filter(x=>x&&typeof x==='object').sort((a,b)=>score(b)-score(a))[0]||{};
const control=(...xs)=>{
  const x=best(...xs);
  return {
    result:clean(x.result||x.status)||(meaningful(x)?'REGISTRADO':'SIN REGISTRO'),
    lastDate:date(x.lastDate||x.date||x.completedAt),
    nextDate:date(x.nextDate||x.dueDate)
  };
};

export function publicEquipmentSnapshot(id,e={}){
  const c=e.currentControl||{};
  // IMPORTANTE: no priorizar el control genérico si está vacío. Los módulos ejecutores
  // pueden guardar el estado real en Internal/External y dejar el genérico en SIN REGISTRO.
  const calibration=control(c.calibration,c.calibrationInternal,c.calibrationExternal);
  const verification=control(c.verification,c.verificationInternal,c.verificationExternal);
  const maintenance=control(c.maintenance,c.maintenanceInternal,c.maintenanceExternal);
  return {
    equipmentId:String(id||''),
    code:clean(e.code).toUpperCase(),
    name:clean(e.name),
    status:clean(e.status)||'ACTIVO',
    brand:clean(e.technical?.brand),
    model:clean(e.technical?.model),
    calibration,verification,maintenance,
    calibrationMethods:(e.publicCalibrationMethods||[]).map(x=>({name:clean(x.name),frequencyMonths:Number(x.frequencyMonths)||0,responsible:clean(x.responsible),profile:clean(x.profile),lastDate:date(x.lastDate),nextDate:date(x.nextDate),result:clean(x.result)||'SIN REGISTRO',status:clean(x.status)||'SIN REGISTRO'})).filter(x=>x.name),
    correction:(()=>{const cc=e.correctionControl||{},app=String(cc.applicability||'POR_EVALUAR');if(app==='NO_APLICA')return {applicability:app,label:'NO APLICA'};if(app!=='APLICA')return {applicability:app,label:'POR EVALUAR'};const calDate=calibration.lastDate||'',review=String(cc.reviewedAt||'').slice(0,10),needsReview=!!(calDate&&(!review||calDate>review));return {applicability:app,label:needsReview?'REVISAR · NUEVA CALIBRACIÓN':'APLICA · CONSULTAR VALORES',type:clean(cc.type),applicationMethod:clean(cc.applicationMethod),source:clean(cc.source),values:(cc.values||[]).map(x=>({point:clean(x.point),referenceValue:clean(x.referenceValue),correction:clean(x.correction),unit:clean(x.unit)}))};})(),
    labelInstalled:e.identificationLabel?.installed===true,
    publicSchemaVersion:4,
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
