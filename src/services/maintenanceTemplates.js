import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

const col=()=>collection(db,'maintenanceTemplates');
const clean=v=>String(v??'').trim();
const normalize=t=>({
  name:clean(t.name),
  family:clean(t.family)||'GENERAL',
  keywords:Array.isArray(t.keywords)?t.keywords.map(clean).filter(Boolean):[],
  description:clean(t.description),
  documentCode:clean(t.documentCode)||'PSI-PG0416',
  documentVersion:clean(t.documentVersion)||'02',
  objectiveHint:clean(t.objectiveHint),
  active:t.active!==false,
  materials:Array.isArray(t.materials)?t.materials.map(x=>({material:clean(x.material),use:clean(x.use)})).filter(x=>x.material):[],
  activities:Array.isArray(t.activities)?t.activities.map((x,i)=>({id:clean(x.id)||`act_${i+1}`,task:clean(x.task),required:x.required!==false})).filter(x=>x.task):[],
  functionalChecks:Array.isArray(t.functionalChecks)?t.functionalChecks.map((x,i)=>({id:clean(x.id)||`fun_${i+1}`,check:clean(x.check),required:x.required!==false})).filter(x=>x.check):[],
  controlChecks:Array.isArray(t.controlChecks)?t.controlChecks.map((x,i)=>({id:clean(x.id)||`ctl_${i+1}`,parameter:clean(x.parameter),criterion:clean(x.criterion),required:x.required===true})).filter(x=>x.parameter):[],
  photoPolicy:{enabled:!!t.photoPolicy?.enabled,beforeMax:Number(t.photoPolicy?.beforeMax||2),afterMax:Number(t.photoPolicy?.afterMax||2)},
  // Compatibilidad con formatos V0.7.0
  items:Array.isArray(t.items)?t.items.map((x,i)=>({id:clean(x.id)||`item_${i+1}`,section:clean(x.section)||'Actividades realizadas',task:clean(x.task),required:x.required!==false})).filter(x=>x.task):[]
});

export function observeMaintenanceTemplates(cb,err){
 return onSnapshot(col(),s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),err);
}
export async function createMaintenanceTemplate(data,user){
 const n=normalize(data);
 if(!n.name||!(n.activities.length||n.items.length))throw new Error('El formato requiere nombre y al menos una actividad.');
 const r=await addDoc(col(),{...n,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),createdBy:user?.uid||'',createdByEmail:user?.email||''});
 return r.id;
}
export async function updateMaintenanceTemplate(id,data,user){
 const n=normalize(data);
 if(!n.name||!(n.activities.length||n.items.length))throw new Error('El formato requiere nombre y al menos una actividad.');
 await updateDoc(doc(db,'maintenanceTemplates',id),{...n,updatedAt:serverTimestamp(),updatedBy:user?.uid||'',updatedByEmail:user?.email||''});
}
