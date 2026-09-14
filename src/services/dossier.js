import {
 collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp,
 getDocs, where, setDoc, Bytes, writeBatch, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase.js';

export const EVIDENCE_RECOMMENDED_BYTES=300*1024;
export const EVIDENCE_MAX_BYTES=1024*1024;

export function evidenceFilePolicy(file){
 if(!file) return {ok:false,level:'ERROR',message:'Seleccione un archivo.'};
 const size=Number(file.size||0);
 const kb=Math.max(1,Math.round(size/1024));
 if(size>EVIDENCE_MAX_BYTES) return {ok:false,level:'ERROR',size,kb,message:`El archivo pesa ${kb} KB y supera el máximo de 1 MB para carga directa. Para no volver pesado el ERP, use un enlace de Google Drive/web o reduzca el PDF.`};
 if(size>EVIDENCE_RECOMMENDED_BYTES) return {ok:true,level:'WARN',size,kb,message:`Archivo de ${kb} KB. Se puede archivar, pero para mejor rendimiento se recomienda mantener las evidencias en 300 KB o menos.`};
 return {ok:true,level:'OK',size,kb,message:`Archivo liviano: ${kb} KB. Tamaño óptimo para el expediente.`};
}

export function observeDossier(callback,onError=console.error){
 const q=query(collection(db,'equipmentDocuments'),orderBy('createdAt','desc'));
 return onSnapshot(q,s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
}

const baseData=(data,user,extra={})=>({
 ...data,status:'VIGENTE',createdAt:serverTimestamp(),createdBy:user?.uid||'',createdByEmail:user?.email||'',...extra
});

async function saveBlobInFirestoreChunks(documentId,blob){
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const MAX_TOTAL=6*1024*1024;
 if(bytes.byteLength>MAX_TOTAL) throw new Error('El archivo supera 6 MB. Para documentos grandes use un enlace de Google Drive/web.');
 const CHUNK=700*1024;
 const batchSize=8;
 const chunks=[];
 for(let offset=0,index=0;offset<bytes.length;offset+=CHUNK,index++){
  chunks.push({index,data:Bytes.fromUint8Array(bytes.slice(offset,Math.min(offset+CHUNK,bytes.length)))});
 }
 for(let i=0;i<chunks.length;i+=batchSize){
  const batch=writeBatch(db);
  for(const c of chunks.slice(i,i+batchSize)){
   const r=doc(collection(db,'equipmentDocumentChunks'));
   batch.set(r,{documentId,index:c.index,data:c.data,createdAt:serverTimestamp()});
  }
  await batch.commit();
 }
 return {storageMode:'FIRESTORE_CHUNKS',chunkCount:chunks.length,fileSize:bytes.byteLength};
}

async function persistBinaryThenMetadata(data,file,user,sourceType='FILE'){
 const dref=doc(collection(db,'equipmentDocuments'));
 // V0.4.4: Firestore es el archivo documental primario. No depende de Firebase Storage/Blaze.
 const persisted=await saveBlobInFirestoreChunks(dref.id,file);
 await setDoc(dref,baseData(data,user,{
  sourceType,
  fileName:file.name,
  fileType:file.type||'application/octet-stream',
  fileSize:file.size,
  ...persisted,
  uploadedAt:serverTimestamp()
 }));
 return dref.id;
}

export async function addDossierDocument(data,file,user){
 if(!data.equipmentId)throw new Error('Seleccione un equipo.');
 const policy=evidenceFilePolicy(file);
 if(!policy.ok)throw new Error(policy.message);
 return persistBinaryThenMetadata({...data,uploadPolicy:{recommendedBytes:EVIDENCE_RECOMMENDED_BYTES,maxBytes:EVIDENCE_MAX_BYTES,sizeBytes:file.size,level:policy.level}},file,user,'FILE');
}

export async function addGeneratedDossierDocument(data,blob,fileName,user){
 if(!data.equipmentId)throw new Error('Equipo inválido.');
 if(!blob)throw new Error('Documento generado inválido.');
 const file=new File([blob],fileName||'documento_generado.pdf',{type:blob.type||'application/pdf'});
 return persistBinaryThenMetadata(data,file,user,'GENERATED');
}


export async function replaceGeneratedDossierDocument(documentId,data,blob,fileName,user){
 if(!documentId)throw new Error('Documento inválido.');
 if(!blob)throw new Error('Documento generado inválido.');
 const ref=doc(db,'equipmentDocuments',documentId);
 const qOld=query(collection(db,'equipmentDocumentChunks'),where('documentId','==',documentId));
 const old=await getDocs(qOld);
 for(let i=0;i<old.docs.length;i+=8){
  const batch=writeBatch(db); old.docs.slice(i,i+8).forEach(x=>batch.delete(x.ref)); await batch.commit();
 }
 const file=new File([blob],fileName||'documento_generado.pdf',{type:blob.type||'application/pdf'});
 const persisted=await saveBlobInFirestoreChunks(documentId,file);
 await setDoc(ref,{...data,status:'VIGENTE',sourceType:'GENERATED',fileName:file.name,fileType:file.type,fileSize:file.size,...persisted,updatedAt:serverTimestamp(),updatedBy:user?.uid||'',updatedByEmail:user?.email||''},{merge:true});
 return documentId;
}


export async function updateDossierDocument(documentId,data,user,file=null){
 if(!documentId)throw new Error('Documento externo inválido.');
 const ref=doc(db,'equipmentDocuments',documentId);
 let fileMeta={};
 if(file){
  const policy=evidenceFilePolicy(file);
  if(!policy.ok)throw new Error(policy.message);
  const qOld=query(collection(db,'equipmentDocumentChunks'),where('documentId','==',documentId));
  const old=await getDocs(qOld);
  for(let i=0;i<old.docs.length;i+=8){const batch=writeBatch(db);old.docs.slice(i,i+8).forEach(x=>batch.delete(x.ref));await batch.commit();}
  const persisted=await saveBlobInFirestoreChunks(documentId,file);
  fileMeta={sourceType:'FILE',fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size,...persisted,uploadedAt:serverTimestamp(),uploadPolicy:{recommendedBytes:EVIDENCE_RECOMMENDED_BYTES,maxBytes:EVIDENCE_MAX_BYTES,sizeBytes:file.size,level:policy.level}};
 }
 await setDoc(ref,{...data,...fileMeta,updatedAt:serverTimestamp(),updatedBy:user?.uid||'',updatedByEmail:user?.email||''},{merge:true});
 return documentId;
}

export async function addDossierLink(data,user){
 if(!data.equipmentId)throw new Error('Seleccione un equipo.');
 if(!/^https?:\/\//i.test(data.externalUrl||''))throw new Error('Enlace externo inválido.');
 const d=await addDoc(collection(db,'equipmentDocuments'),baseData(data,user,{sourceType:'LINK',storageMode:'EXTERNAL_LINK'}));
 return d.id;
}

export async function supersedeDocument(id,reason,user){
 await updateDoc(doc(db,'equipmentDocuments',id),{
  status:'HISTÓRICO',supersededReason:reason||'Nueva revisión',supersededAt:serverTimestamp(),supersededBy:user?.uid||''
 });
}

export async function archiveCategoryRevisions(equipmentId,category,exceptId,reason,user,scopeKey=''){
 const q=query(collection(db,'equipmentDocuments'),where('equipmentId','==',equipmentId));
 const snap=await getDocs(q);
 const batch=writeBatch(db); let changed=0;
 snap.docs.filter(x=>x.id!==exceptId&&x.data().category===category&&x.data().status==='VIGENTE'&&(!scopeKey||String(x.data().scopeKey||x.data().generatedData?.scopeKey||'')===String(scopeKey))).forEach(x=>{
  batch.update(x.ref,{status:'HISTÓRICO',supersededReason:reason||'Nueva revisión',supersededAt:serverTimestamp(),supersededBy:user?.uid||''});changed++;
 });
 if(changed) await batch.commit();
}

export async function repairDossierConsistency(items,user){
 if(!Array.isArray(items)||!items.length)return;
 const batch=writeBatch(db); let changed=0;
 const valid=d=>d.sourceType==='LINK'?!!d.externalUrl:(!!d.url||d.storageMode==='FIRESTORE_CHUNKS');
 for(const d of items){
  if((d.sourceType==='GENERATED'||d.sourceType==='FILE')&&!valid(d)&&d.status==='VIGENTE'){
   batch.update(doc(db,'equipmentDocuments',d.id),{
    status:'PENDIENTE_ARCHIVO',repairReason:'Registro sin archivo binario confirmado',repairedAt:serverTimestamp(),repairedBy:user?.uid||''
   }); changed++;
  }
 }
 const groups=new Map();
 for(const d of items.filter(d=>valid(d)&&d.status==='VIGENTE')){
  const key=`${d.equipmentId}::${d.category}::${d.scopeKey||d.generatedData?.scopeKey||''}`;
  if(!groups.has(key))groups.set(key,[]); groups.get(key).push(d);
 }
 const rank=d=>{
  const r=parseInt(String(d.revision||'0').replace(/\D/g,''),10)||0;
  const t=d.createdAt?.toMillis?.()||((d.createdAt?.seconds||0)*1000)||0;
  return r*1e13+t;
 };
 for(const arr of groups.values()){
  if(arr.length<2)continue;
  arr.sort((a,b)=>rank(b)-rank(a));
  for(const old of arr.slice(1)){
   batch.update(doc(db,'equipmentDocuments',old.id),{
    status:'HISTÓRICO',supersededReason:'Reconciliación automática: existe una revisión vigente posterior',supersededAt:serverTimestamp(),supersededBy:user?.uid||''
   }); changed++;
  }
 }
 if(changed) await batch.commit();
}

export async function getDossierBlob(documentRecord){
 if(documentRecord?.url){
  const r=await fetch(documentRecord.url); if(!r.ok)throw new Error('No se pudo descargar el archivo remoto.'); return await r.blob();
 }
 if(documentRecord?.storageMode!=='FIRESTORE_CHUNKS')throw new Error('Este registro no tiene un archivo archivado disponible.');
 const q=query(collection(db,'equipmentDocumentChunks'),where('documentId','==',documentRecord.id));
 const snap=await getDocs(q);
 const rows=snap.docs.map(d=>d.data()).sort((a,b)=>(a.index||0)-(b.index||0));
 if(!rows.length)throw new Error('No se encontraron los fragmentos del documento.');
 const parts=rows.map(x=>x.data.toUint8Array());
 const total=parts.reduce((n,x)=>n+x.length,0), out=new Uint8Array(total); let off=0;
 for(const p of parts){out.set(p,off);off+=p.length;}
 return new Blob([out],{type:documentRecord.fileType||'application/pdf'});
}
