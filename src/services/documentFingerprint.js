// Huella semántica de la ficha maestra.
// Excluye metadatos operativos (updatedAt, auditoría, documentStatus) para que
// archivar/firmar un documento no invalide por sí mismo la ficha firmada.
const clean = v => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  return v;
};

function sortObject(value){
  if(Array.isArray(value)) return value.map(sortObject);
  if(value && typeof value === 'object'){
    return Object.keys(value).sort().reduce((o,k)=>{o[k]=sortObject(value[k]);return o;},{});
  }
  return value;
}

export function equipmentDocumentSnapshot(e={}){
  const t=e.technical||{}, p=e.plans||{}, a=e.approval||{}, cc=e.currentControl||{};
  return sortObject({
    code:clean(e.code), name:clean(e.name), status:clean(e.status), location:clean(e.location),
    responsible:clean(e.responsible), criticality:clean(e.criticality), impactsResults:!!e.impactsResults,
    intendedUse:clean(e.intendedUse), useRestrictions:clean(e.useRestrictions),
    technical:{
      manufacturer:clean(t.manufacturer),brand:clean(t.brand),model:clean(t.model),serialNumber:clean(t.serialNumber),
      acquisitionDate:clean(t.acquisitionDate),commissioningDate:clean(t.commissioningDate),powerSupply:clean(t.powerSupply),
      operatingTemperature:clean(t.operatingTemperature),operatingHumidity:clean(t.operatingHumidity),supplier:clean(t.supplier),
      technicalContact:clean(t.technicalContact),technicalService:clean(t.technicalService),warrantyUntil:clean(t.warrantyUntil),
      usefulLife:clean(t.usefulLife),acquisitionValue:clean(t.acquisitionValue),methodPrinciple:clean(t.methodPrinciple)
    },
    metrologicalControlRequired:e.metrologicalControlRequired!==false,
    metrologicalCharacteristics:(e.metrologicalCharacteristics||[]).map(x=>({
      magnitude:clean(x.magnitude),unit:clean(x.unit),workingRange:clean(x.workingRange),resolution:clean(x.resolution),
      accuracySpecification:clean(x.accuracySpecification),empCriterion:clean(x.empCriterion||x.accuracyEmp),accuracyEmp:clean(x.empCriterion||x.accuracyEmp),declaredUncertainty:clean(x.declaredUncertainty),controlPoints:clean(x.controlPoints),
      acceptanceCriterion:clean(x.acceptanceCriterion)
    })),
    plans:{
      calibration:p.calibration||{},verification:p.verification||{},maintenance:p.maintenance||{}
    },
    currentControl:{
      calibration:cc.calibration||{},verification:cc.verification||{},maintenance:cc.maintenance||{}
    },
    approval:{documentCode:clean(a.documentCode)||'PG0404-06',state:clean(a.state),notes:clean(a.notes),approvedBy:clean(a.approvedBy)},
    qrUrl:clean(e.qrUrl)
  });
}

export function canonicalSnapshotJson(e){
  return JSON.stringify(equipmentDocumentSnapshot(e));
}

export async function hashEquipmentSnapshot(e){
  const bytes=new TextEncoder().encode(canonicalSnapshotJson(e));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
