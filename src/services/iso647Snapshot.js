import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase.js';

export async function publishIso647CalibrationSnapshot(rows,user){
  if(!db||!user) return;
  const batch=writeBatch(db);
  const metaRef=doc(db,'iso647CalibrationSnapshot','__meta__');
  batch.set(metaRef,{
    schemaVersion:1,source:'ERP_METROLOGICO_PROGRAMA_CALIBRACION',
    generatedAt:serverTimestamp(),generatedBy:user.uid||'',generatedByEmail:user.email||'',
    count:Array.isArray(rows)?rows.length:0
  },{merge:true});
  for(const r of (rows||[])){
    const id=String(r.id||'').replace(/[^A-Za-z0-9_-]/g,'_');
    if(!id)continue;
    batch.set(doc(db,'iso647CalibrationSnapshot',id),{
      ...r,source:'ERP_METROLOGICO_PROGRAMA_CALIBRACION',snapshotUpdatedAt:serverTimestamp()
    },{merge:true});
  }
  await batch.commit();
}
