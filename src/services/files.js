import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.js';

export async function uploadEquipmentQr(equipmentId,file){
  if(!file) return null;
  if(!file.type.startsWith('image/')) throw new Error('El QR debe ser una imagen.');
  if(file.size>5*1024*1024) throw new Error('La imagen QR no puede superar 5 MB.');
  const ext=(file.name.split('.').pop()||'png').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const r=ref(storage,`equipment/${equipmentId}/qr/qr.${ext}`);
  await uploadBytes(r,file,{contentType:file.type});
  return await getDownloadURL(r);
}
