import {
  addDoc, collection, doc, getDoc, getDocFromServer, serverTimestamp, updateDoc, runTransaction
} from 'firebase/firestore';
import { db } from './firebase.js';
import { writeAudit } from './audit.js';
import { hashEquipmentSnapshot, equipmentDocumentSnapshot } from './documentFingerprint.js';
import { publishPublicEquipmentStatus } from './publicEquipment.js';

const clean = v => typeof v === 'string' ? v.trim() : (v ?? '');

export function normalizeEquipment(payload){
  const nowSource = 'INVENTARIO_MAESTRO';
  return {
    code: clean(payload.code)?.toUpperCase(),
    name: clean(payload.name),
    status: payload.status || 'ACTIVO',
    location: clean(payload.location),
    responsible: clean(payload.responsible),
    criticality: payload.criticality || 'MEDIA',
    impactsResults: payload.impactsResults === true,
    intendedUse: clean(payload.intendedUse),
    useRestrictions: clean(payload.useRestrictions),

    technical: {
      manufacturer: clean(payload.technical?.manufacturer),
      brand: clean(payload.technical?.brand),
      model: clean(payload.technical?.model),
      serialNumber: clean(payload.technical?.serialNumber),
      acquisitionDate: payload.technical?.acquisitionDate || '',
      commissioningDate: payload.technical?.commissioningDate || '',
      powerSupply: clean(payload.technical?.powerSupply),
      operatingTemperature: clean(payload.technical?.operatingTemperature),
      operatingHumidity: clean(payload.technical?.operatingHumidity),
      supplier: clean(payload.technical?.supplier),
      technicalContact: clean(payload.technical?.technicalContact),
      technicalService: clean(payload.technical?.technicalService),
      warrantyUntil: payload.technical?.warrantyUntil || '',
      usefulLife: clean(payload.technical?.usefulLife),
      acquisitionValue: clean(payload.technical?.acquisitionValue),
      methodPrinciple: clean(payload.technical?.methodPrinciple),
      customFields: (payload.technical?.customFields || []).map((x,i)=>({
        id: clean(x.id) || `tech-${i+1}`,
        category: clean(x.category) || 'OTROS',
        name: clean(x.name),
        value: clean(x.value),
        unit: clean(x.unit)
      })).filter(x=>x.name)
    },

    metrologicalControlRequired: payload.metrologicalControlRequired !== false,
    qrUrl: clean(payload.qrUrl),
    identificationLabel: {
      qrGenerated: payload.identificationLabel?.qrGenerated === true || !!clean(payload.qrUrl),
      qrTarget: clean(payload.identificationLabel?.qrTarget),
      generatedAt: payload.identificationLabel?.generatedAt || null,
      generatedBy: clean(payload.identificationLabel?.generatedBy),
      installed: payload.identificationLabel?.installed === true,
      installedAt: payload.identificationLabel?.installedAt || null,
      installedBy: clean(payload.identificationLabel?.installedBy),
      revision: Number(payload.identificationLabel?.revision || 1) || 1
    },

    metrologicalCharacteristics: (payload.metrologicalCharacteristics || [])
      .map((x,i)=>({
        id: x.id || `mc-${Date.now()}-${i}`,
        magnitude: clean(x.magnitude), unit: clean(x.unit),
        workingRange: clean(x.workingRange), resolution: clean(x.resolution),
        accuracySpecification: clean(x.accuracySpecification), empCriterion: clean(x.empCriterion || x.accuracyEmp), accuracyEmp: clean(x.empCriterion || x.accuracyEmp), declaredUncertainty: clean(x.declaredUncertainty),
        controlPoints: clean(x.controlPoints), acceptanceCriterion: clean(x.acceptanceCriterion)
      }))
      .filter(x => x.magnitude || x.workingRange || x.resolution),

    plans: {
      calibration: {
        required: !!payload.plans?.calibration?.required,
        modality: payload.plans?.calibration?.modality || 'INTERNA',
        internal: {
          frequencyMonths: Number(payload.plans?.calibration?.internal?.frequencyMonths) || 0,
          responsible: clean(payload.plans?.calibration?.internal?.responsible),
          methods: (payload.plans?.calibration?.internal?.methods || []).map((m,i)=>({
            id: clean(m.id) || `cal-method-${i+1}`,
            name: clean(m.name),
            frequencyMonths: Number(m.frequencyMonths) || 0,
            responsible: clean(m.responsible),
            profile: clean(m.profile) || 'PENDIENTE'
          })).filter(m=>m.name)
        },
        external: {
          frequencyMonths: Number(payload.plans?.calibration?.external?.frequencyMonths) || 0,
          provider: clean(payload.plans?.calibration?.external?.provider),
          points: (payload.plans?.calibration?.external?.points || []).map((pt,i)=>({
            id: clean(pt.id) || `ext-point-${i+1}`,
            label: clean(pt.label) || ((pt.setpoint !== '' && pt.setpoint != null) ? `${clean(pt.setpoint)} ${clean(pt.unit) || '°C'}`.trim() : ''),
            setpoint: clean(pt.setpoint),
            unit: clean(pt.unit) || '°C',
            emp: clean(pt.emp),
            frequencyMonths: Number(pt.frequencyMonths) || 0,
            provider: clean(pt.provider)
          })).filter(pt=>pt.label || pt.setpoint !== '')
        }
      },
      verification: {
        required: !!payload.plans?.verification?.required,
        modality: payload.plans?.verification?.modality || 'INTERNA',
        strategy: clean(payload.plans?.verification?.strategy),
        pointsCount: Number(payload.plans?.verification?.pointsCount) || 0,
        selectionCriterion: clean(payload.plans?.verification?.selectionCriterion),
        fixedPoint: clean(payload.plans?.verification?.fixedPoint),
        definedPoints: clean(payload.plans?.verification?.definedPoints),
        profile: clean(payload.plans?.verification?.profile) || 'AUTO',
        acceptanceCriterion: clean(payload.plans?.verification?.acceptanceCriterion),
        accreditationLimit: clean(payload.plans?.verification?.accreditationLimit),
        uvParameter: clean(payload.plans?.verification?.uvParameter),
        internal: {
          frequencyMonths: Number(payload.plans?.verification?.internal?.frequencyMonths) || 0,
          responsible: clean(payload.plans?.verification?.internal?.responsible)
        },
        external: {
          frequencyMonths: Number(payload.plans?.verification?.external?.frequencyMonths) || 0,
          provider: clean(payload.plans?.verification?.external?.provider)
        }
      },
      maintenance: {
        preventiveRequired: !!payload.plans?.maintenance?.preventiveRequired,
        preventiveModality: payload.plans?.maintenance?.preventiveModality || 'INTERNO',
        internal: {
          frequencyMonths: Number(payload.plans?.maintenance?.internal?.frequencyMonths) || 0,
          responsible: clean(payload.plans?.maintenance?.internal?.responsible)
        },
        external: {
          frequencyMonths: Number(payload.plans?.maintenance?.external?.frequencyMonths) || 0,
          provider: clean(payload.plans?.maintenance?.external?.provider)
        },
        correctiveAllowed: payload.plans?.maintenance?.correctiveAllowed !== false,
        correctiveCriterion: clean(payload.plans?.maintenance?.correctiveCriterion)
      }
    },

    // Campos de solo lectura para este módulo. Serán actualizados por los módulos ejecutores.
    currentControl: payload.currentControl || {
      calibration: { lastDate:'', nextDate:'', result:'SIN REGISTRO', sourceRecordId:'' },
      verification: { lastDate:'', nextDate:'', result:'SIN REGISTRO', sourceRecordId:'' },
      maintenance: { lastDate:'', nextDate:'', result:'SIN REGISTRO', sourceRecordId:'' },
      maintenanceInternal: { lastDate:'', nextDate:'', result:'SIN REGISTRO', sourceRecordId:'', source:'MANTENIMIENTO_INTERNO' },
      maintenanceExternal: { lastDate:'', nextDate:'', result:'SIN REGISTRO', sourceRecordId:'', source:'CONTROL_EXTERNO' }
    },

    approval: {
      documentCode: clean(payload.approval?.documentCode) || 'PG0404-06',
      state: payload.approval?.state || 'BORRADOR',
      notes: clean(payload.approval?.notes),
      approvedBy: payload.approval?.approvedBy || '',
      approvedAt: payload.approval?.approvedAt || null
    },
    source: nowSource,
    schemaVersion: 2,
    activeRecord: payload.activeRecord !== false
  };
}

export async function createEquipment(payload, user){
  if(!user?.uid) throw new Error('La sesión de Firebase no está disponible. Vuelva a iniciar sesión.');
  const data = normalizeEquipment(payload);
  const ref = await addDoc(collection(db,'equipment'), {
    ...data,
    createdAt: serverTimestamp(), createdBy: user.uid,
    updatedAt: serverTimestamp(), updatedBy: user.uid
  });
  const savedSnap = await getDocFromServer(ref);
  if(!savedSnap.exists()) throw new Error('Firebase no confirmó la creación del equipo.');
  const savedRecord={id:ref.id,...savedSnap.data()};
  await publishPublicEquipmentStatus(ref.id,savedRecord);
  try{
    await writeAudit({actorUid:user.uid, action:'CREATE', module:'INVENTARIO_MAESTRO', entityId:ref.id, before:null, after:data});
  }catch(err){ console.warn('Equipo creado; auditoría pendiente/no disponible:',err); }
  return {id:ref.id,savedRecord};
}

function changedSections(before={}, after={}){
  const a=equipmentDocumentSnapshot(before), b=equipmentDocumentSnapshot(after);
  const sections=[];
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!same({code:a.code,name:a.name,status:a.status,location:a.location,responsible:a.responsible,criticality:a.criticality,impactsResults:a.impactsResults,intendedUse:a.intendedUse,useRestrictions:a.useRestrictions},{code:b.code,name:b.name,status:b.status,location:b.location,responsible:b.responsible,criticality:b.criticality,impactsResults:b.impactsResults,intendedUse:b.intendedUse,useRestrictions:b.useRestrictions})) sections.push('Identificación');
  if(!same(a.technical,b.technical)) sections.push('Técnica');
  if(!same(a.metrologicalCharacteristics,b.metrologicalCharacteristics)||a.metrologicalControlRequired!==b.metrologicalControlRequired) sections.push('Metrología');
  if(!same(a.plans?.calibration,b.plans?.calibration)) sections.push('Calibración');
  if(!same(a.plans?.verification,b.plans?.verification)) sections.push('Verificación');
  if(!same(a.plans?.maintenance,b.plans?.maintenance)) sections.push('Mantenimiento');
  if(!same(a.approval,b.approval)) sections.push('Aprobación');
  return sections;
}

export async function updateEquipment(id, payload, user){
  const ref = doc(db,'equipment',id);
  let result = null;

  await runTransaction(db, async (tx)=>{
    const oldSnap = await tx.get(ref);
    if(!oldSnap.exists()) throw new Error('Equipo no encontrado.');
    const before = oldSnap.data();

    const data = normalizeEquipment({
      ...before,
      ...payload,
      technical:{...(before?.technical||{}),...(payload.technical||{})},
      plans:{
        calibration:{...(before?.plans?.calibration||{}),...(payload.plans?.calibration||{}),internal:{...(before?.plans?.calibration?.internal||{}),...(payload.plans?.calibration?.internal||{})},external:{...(before?.plans?.calibration?.external||{}),...(payload.plans?.calibration?.external||{})}},
        verification:{...(before?.plans?.verification||{}),...(payload.plans?.verification||{}),internal:{...(before?.plans?.verification?.internal||{}),...(payload.plans?.verification?.internal||{})},external:{...(before?.plans?.verification?.external||{}),...(payload.plans?.verification?.external||{})}},
        maintenance:{...(before?.plans?.maintenance||{}),...(payload.plans?.maintenance||{}),internal:{...(before?.plans?.maintenance?.internal||{}),...(payload.plans?.maintenance?.internal||{})},external:{...(before?.plans?.maintenance?.external||{}),...(payload.plans?.maintenance?.external||{})}}
      },
      approval:{...(before?.approval||{}),...(payload.approval||{})},
      currentControl: payload.currentControl || before?.currentControl
    });

    const beforeHash = await hashEquipmentSnapshot(before||{});
    const afterHash = await hashEquipmentSnapshot(data);
    const sections = changedSections(before,data);
    const contentChanged = afterHash !== beforeHash;

    const oldStatus=before?.documentStatus||{};
    const signedRev=oldStatus.latestSignedRevision||'';
    const signedHash=oldStatus.latestSignedSnapshotHash||oldStatus.currentSnapshotHash||beforeHash||'';
    const lastNum=parseInt(String(signedRev||'0').replace(/\D/g,''),10)||0;
    const existingWorking=(oldStatus.signatureState==='PENDIENTE_NUEVA_FIRMA')?(oldStatus.workingRevision||oldStatus.pendingRevision||''):'';
    const nextWorking=existingWorking || String(lastNum+1).padStart(2,'0');
    const requiresNewSignature=!!signedRev && !!signedHash && afterHash!==signedHash;

    const documentStatus = signedRev ? {
      ...oldStatus,
      latestSignedRevision:signedRev,
      latestSignedSnapshotHash:signedHash,
      currentSnapshotHash:afterHash,
      workingRevision:requiresNewSignature ? nextWorking : signedRev,
      pendingRevision:requiresNewSignature ? nextWorking : '',
      workingState:requiresNewSignature ? 'BORRADOR_PENDIENTE_FIRMA' : 'VIGENTE_FIRMADA',
      signatureState:requiresNewSignature ? 'PENDIENTE_NUEVA_FIRMA' : 'VIGENTE',
      pendingChangeSections:requiresNewSignature ? Array.from(new Set([...(oldStatus.pendingChangeSections||[]),...sections])) : [],
      ...(requiresNewSignature ? {changedAfterSignatureAt:serverTimestamp()} : {})
    } : {
      ...oldStatus,
      currentSnapshotHash:afterHash,
      workingRevision:oldStatus.workingRevision||'01',
      workingState:'BORRADOR_SIN_FIRMA',
      signatureState:'SIN_FIRMA'
    };

    tx.update(ref,{...data,documentStatus,updatedAt:serverTimestamp(),updatedBy:user.uid});
    result={before,data,documentStatus,beforeHash,afterHash,sections,contentChanged,requiresNewSignature,nextWorking};
  });

  if(!result) throw new Error('No se pudo completar la transacción de guardado.');

  try{
    await writeAudit({actorUid:user.uid, action:'UPDATE', module:'INVENTARIO_MAESTRO', entityId:id, before:result.before, after:{...result.data,documentStatus:result.documentStatus}});
  }catch(err){ console.warn('Equipo guardado; auditoría pendiente/no disponible:',err); }

  const savedSnap = await getDocFromServer(ref);
  if(!savedSnap.exists()) throw new Error('Firebase no confirmó el registro después de guardar.');
  const savedRecord={id,...savedSnap.data()};
  await publishPublicEquipmentStatus(id,savedRecord);
  const confirmedHash=await hashEquipmentSnapshot(savedRecord);
  if(confirmedHash!==result.afterHash) throw new Error('El servidor devolvió datos diferentes a los enviados. Reintente.');

  return {saved:true,contentChanged:result.contentChanged,requiresNewSignature:result.requiresNewSignature,pendingRevision:result.requiresNewSignature?result.nextWorking:'',workingRevision:result.documentStatus.workingRevision,changedSections:result.sections,afterHash:result.afterHash,savedRecord};
}

export async function changeEquipmentStatus(id, status, reason, user){
  const ref = doc(db,'equipment',id);
  const snap = await getDoc(ref);
  if(!snap.exists()) throw new Error('Equipo no encontrado.');
  const before=snap.data();
  await updateDoc(ref,{status,statusReason:clean(reason),updatedAt:serverTimestamp(),updatedBy:user.uid});
  await publishPublicEquipmentStatus(id,{...before,status,statusReason:clean(reason)});
  await writeAudit({actorUid:user.uid,action:'STATUS_CHANGE',module:'INVENTARIO_MAESTRO',entityId:id,before:{status:before.status,statusReason:before.statusReason||''},after:{status,statusReason:clean(reason)}});
}

export async function updateEquipmentDocumentStatus(id,status,user){
 const ref=doc(db,'equipment',id);
 await updateDoc(ref,{documentStatus:{...(status||{})},updatedAt:serverTimestamp(),updatedBy:user?.uid||''});
 await writeAudit({actorUid:user?.uid||'',action:'DOCUMENT_STATUS',module:'INVENTARIO_MAESTRO',entityId:id,before:null,after:status||{}});
}


export async function updateEquipmentCurrentControl(id,controlType,data,user,modality=''){
 const ref=doc(db,'equipment',id);
 const snap=await getDocFromServer(ref).catch(()=>getDoc(ref));
 if(!snap.exists()) throw new Error('Equipo no encontrado.');
 const before=snap.data();
 const base=controlType==='CALIBRATION'?'calibration':controlType==='VERIFICATION'?'verification':'maintenance';
 const suffix=String(modality||'').toUpperCase()==='INTERNAL'?'Internal':String(modality||'').toUpperCase()==='EXTERNAL'?'External':'';
 const key=base+suffix;
 const current={...(before.currentControl||{})};
 current[key]={...(current[key]||{}),...data};
 if(base==='calibration'&&String(modality||'').toUpperCase()==='EXTERNAL'&&data?.scopeKey){
   const pointMap={...(current.calibrationExternalPoints||{})};
   pointMap[data.scopeKey]={...(pointMap[data.scopeKey]||{}),...data};
   current.calibrationExternalPoints=pointMap;
 }
 // Compatibilidad: mantenemos el control genérico solo como último evento, sin usarlo para mezclar modalidades en las vistas nuevas.
 current[base]={...(current[base]||{}),...data};
 const candidate={...before,currentControl:current};
 const afterHash=await hashEquipmentSnapshot(candidate);
 const ds=before.documentStatus||{};
 let documentStatus=ds;
 if(ds.latestSignedRevision && ds.latestSignedSnapshotHash && afterHash!==ds.latestSignedSnapshotHash){
   const lastNum=parseInt(String(ds.latestSignedRevision||'0').replace(/\D/g,''),10)||0;
   const working=ds.workingRevision||ds.pendingRevision||String(lastNum+1).padStart(2,'0');
   documentStatus={...ds,currentSnapshotHash:afterHash,workingRevision:working,pendingRevision:working,workingState:'BORRADOR_PENDIENTE_FIRMA',signatureState:'PENDIENTE_NUEVA_FIRMA',pendingChangeSections:Array.from(new Set([...(ds.pendingChangeSections||[]),'Control metrológico vigente'])),changedAfterSignatureAt:serverTimestamp()};
 }
 await updateDoc(ref,{currentControl:current,documentStatus,updatedAt:serverTimestamp(),updatedBy:user?.uid||''});
 await publishPublicEquipmentStatus(id,{...before,currentControl:current});
 await writeAudit({actorUid:user?.uid||'',action:'CONTROL_EXECUTION',module:'CONTROL_METROLOGICO',entityId:id,before:before.currentControl?.[key]||null,after:current[key]});
}

