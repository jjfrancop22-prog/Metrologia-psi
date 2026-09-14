import { doc, onSnapshot, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfigured } from './firebase.js';

const DEFAULTS={
  locations:['Laboratorio Fisicoquímico','Laboratorio Microbiología','Operaciones y Muestreo','Gases y Ruidos','Calidad','Administración'],
  responsibles:['Ing. Jipson Franco','Ing. Katherine Flores','Ing. José Núñez','Ing. José Vásquez'],
  operatingTemperatures:['15–30 °C','10–25 °C','2–8 °C','20–25 °C'],
  operatingHumidities:['≤ 80 %','≤ 70 %','30–80 % HR','40–60 % HR'],
  metrologyMagnitudes:['Temperatura','Masa','Volumen','pH','Conductividad'],
  metrologyUnits:['°C','g','kg','mL','L','pH','µS/cm','mS/cm'],
  metrologyRanges:['2–8','10–25','15–30','0–100','0–200'],
  metrologyResolutions:['0,1 °C','0,01 g','0,1 g','0,01 pH'],
  metrologyEmp:['±0,5 °C','±1,0 °C','±0,1 g','±0,05 pH'],
  metrologyUncertainties:['0,2 °C','0,05 g','0,02 pH'],
  metrologyPoints:['2, 5 y 8 °C','0, 50 y 100','4, 7 y 10 pH'],
  metrologyCriteria:['Cumple EMP','Dentro de tolerancia','Conforme según certificado vigente'],
  manufacturers:[],
  brands:[],
  suppliers:[],
  technicalContacts:[],
  technicalServices:[],
  verificationAnalysts:['NIDIA SANCHEZ','JIPSON FRANCO','KATHERINE FLORES','LIZBETH PRIETO','MARIA ELENA ZAMBRANO','JOE FRANCO'],
  maintenanceAnalysts:['NIDIA SANCHEZ','JIPSON FRANCO','KATHERINE FLORES','LIZBETH PRIETO','MARIA ELENA ZAMBRANO','JOE FRANCO'],
  metrologyPatterns:[]
};

export function observeCatalogs(cb,onError=console.error){
  if(!firebaseConfigured){cb(structuredClone(DEFAULTS));return ()=>{};}
  const state={}; Object.keys(DEFAULTS).forEach(k=>state[k]=[]);
  const unsubs=Object.keys(DEFAULTS).map(key=>onSnapshot(doc(db,'catalogs',key),async snap=>{
    if(!snap.exists()){
      try{await setDoc(doc(db,'catalogs',key),{items:DEFAULTS[key],updatedAt:serverTimestamp(),source:'V0.2.5 seed'},{merge:true});}
      catch(err){onError(err); state[key]=[...DEFAULTS[key]]; cb({...state});}
      return;
    }
    const items=Array.isArray(snap.data()?.items)?snap.data().items:[];
    state[key]=[...new Set([...DEFAULTS[key],...items].map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    cb({...state});
  },onError));
  return ()=>unsubs.forEach(fn=>fn());
}

export async function addCatalogItem(key,value,user){
  if(!firebaseConfigured)throw new Error('Firebase no está configurado.');
  if(!DEFAULTS[key])throw new Error('Catálogo no válido.');
  const clean=String(value||'').trim();
  if(!clean)throw new Error('El valor está vacío.');
  await setDoc(doc(db,'catalogs',key),{
    items:arrayUnion(clean),updatedAt:serverTimestamp(),updatedBy:user?.uid||'',updatedByEmail:user?.email||''
  },{merge:true});
}
