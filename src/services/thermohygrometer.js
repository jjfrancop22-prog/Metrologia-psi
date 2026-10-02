// Point-wise temperature / relative humidity certificate reading. No manufacturer defaults.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const thNumber=v=>v===null||v===undefined||String(v).trim()===''?null:(/^[+−-]?\d+(?:[.,]\d+)?$/.test(String(v).trim())?Number(String(v).trim().replace('−','-').replace(',','.')):null);
export function isThermohygrometerEquipment(e){return /termohigrom|termo higrom|thermohygrom|thermo hygrom|higrotermomet/.test(norm([e?.name,e?.type,e?.family,e?.technical?.template,e?.technical?.type].join(' ')));}
export function thMagnitude(r){const u=norm(r.unit).replace(/\s/g,'');if(['°c','c','celsius'].includes(u))return 'T';if(['%hr','%rh'].includes(u))return 'H';if(u)return '';const m=norm(r.magnitude);return /humedad|humidity/.test(m)?'H':/temperatura|temperature/.test(m)?'T':'';}
export function thKey(r){const mag=thMagnitude(r);const point=thNumber(String(r.point??'').replace(/\s*(?:°\s*C|%\s*(?:HR|RH))\s*$/i,''));return mag&&point!==null?`TH|${mag}|${point}`:'';}
export function thRow(mag,point='',index=0){const r={id:`th-${mag}-${point}-${index}`,magnitude:mag==='T'?'Temperatura':'Humedad relativa',unit:mag==='T'?'°C':'%HR',point:String(point),error:null,uncertainty:null,emp:null,correction:null,applyCorrection:false};return {...r,comparisonKey:thKey(r)};}
export function thEmp(e,row){return thMagnitude(row)==='T'?1:thMagnitude(row)==='H'?5:null;}
export function thDefaultRows(e){return ['T','H'].flatMap(m=>[0,1].map(i=>{const r=thRow(m,'',i);return {...r,emp:thEmp(e,r)}}));}
export function parseThermohygrometerCertificate(struct){
 const pages=struct?.pages||[],text=struct?.text||pages.flat().join('\n'),lines=text.split('\n'),rows=[],warnings=[];
 const metadata=label=>{const line=lines.find(l=>label.test(norm(l)));return line||''};
 const certificateNumber=(text.match(/\bCGC-[A-Z0-9-]+\b/i)||[])[0]||(metadata(/(?:certificado|certificate).*?(?:no\.|numero|n°)/).match(/(?:N[°º]|No\.|numero)\s*:?\s*([A-Z0-9][A-Z0-9/._-]+)/i)||[])[1]||'';
 const dateLine=metadata(/^\s*(?:fecha (?:de )?calibracion|calibration date)\s*:/),date=(dateLine.match(/\b20\d{2}-\d{2}-\d{2}\b/)||[])[0]||'';
 const identification=(metadata(/^\s*(?:identificacion|identification)\s*:/).split(':').slice(1).join(':').trim());
 let mag='',headers={},active=false;
 const numericTokens=line=>[...line.replace(/−/g,'-').matchAll(/[+-]?\d+(?:[.,]\d+)?/g)].map(m=>thNumber(m[0]));
 const groups=struct?.itemPages?.length?struct.itemPages:pages.map(ls=>ls.map(s=>({items:[{s}]})));
 groups.forEach((page,pi)=>page.forEach(g=>{
  const line=g.items.map(i=>i.s).join(' ').trim(),n=norm(line);
  const next=/resultados.*calibracion.*humedad|humidity calibration results/.test(n)?'H':/resultados.*calibracion.*temperatura|temperature calibration results/.test(n)?'T':'';
  if(next){if(next!==mag||!active)headers={};mag=next;active=true;return;}
  if(/^(el valor de|the (?:relative humidity|temperature) value|nota\b|note\b)/.test(n)){active=false;return;}
  if(!active||!mag)return;
  const labels={point:/valor de prueba|test value|punto de calibracion|nominal/,error:/error de medicion|measurement error|error de indicacion/,correction:/correccion|correction/,uncertainty:/incertidumbre|uncertainty/};
  for(const it of g.items){for(const [key,rx] of Object.entries(labels)){if(rx.test(norm(it.s))&&Number.isFinite(it.x))headers[key]={x:it.x+(it.w||0)/2};}}
  if(!/^[+−-]?\d/.test(line))return;
  const vals=numericTokens(line);if(vals.length<3)return;
  let point,error=null,correction=null,uncertainty;
  if(headers.point&&headers.uncertainty&&(headers.error||headers.correction)){
   const read=key=>{if(!headers[key])return null;const x=headers[key].x;const candidates=g.items.filter(it=>Number.isFinite(it.x)&&Math.abs(it.x+(it.w||0)/2-x)<22).map(it=>thNumber(it.s.replace(/\s*\([•·*]\)/g,''))).filter(v=>v!==null);return candidates.length===1?candidates[0]:null;};
   point=read('point');error=read('error');correction=read('correction');uncertainty=read('uncertainty');
  }else return; // Unknown headers/layout: manual review, never guess columns.
  if(point===null||uncertainty===null||uncertainty<0||(error===null&&correction===null)){warnings.push(`Página ${pi+1}: fila incompleta; revisar ${line}`);return;}
  const sourceValueType=error!==null?'ERROR':'CORRECTION';if(error===null)error=-correction;
  const r={...thRow(mag,point,rows.length),error,uncertainty,correction:correction??-error,sourceValueType,sourcePage:pi+1,sourceText:line};
  if(rows.some(x=>x.comparisonKey===r.comparisonKey)){warnings.push(`Punto duplicado ${point} ${r.unit}: revisar condiciones antes de comparar.`);return;}
  rows.push(r);
 }));
 if(!rows.some(r=>r.unit==='°C')||!rows.some(r=>r.unit==='%HR'))warnings.push('No se reconocieron ambas magnitudes. Complete los puntos faltantes antes de evaluar.');
 return {family:'TERMOHIGROMETRO',certificateNumber,date,identification,rows,warnings};
}
export function thIdentityMatches(a,b){const clean=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return !!clean(a)&&clean(a)===clean(b);}
export function evaluateThermohygrometerInterval(rows,date,history,currentInterval=12,maxInterval=12){
 const current=Math.max(1,Number(currentInterval)||12),ceiling=Math.max(current,Number(maxInterval)||current),safety=0.80;
 const evaluated=rows.map(r=>{
  const error=thNumber(r.error),emp=thMagnitude(r)==='T'?1:thMagnitude(r)==='H'?5:null,key=thKey(r),valid=!!key&&error!==null&&emp!==null;
  const previous=key?[...history].filter(h=>thKey(h)===key&&h.date<date&&thNumber(h.error)!==null).sort((a,b)=>b.date.localeCompare(a.date))[0]||null:null;
  const days=previous?(Date.parse(date+'T12:00:00Z')-Date.parse(previous.date+'T12:00:00Z'))/86400000:null;
  const months=Number.isFinite(days)&&days>0?days/30.4375:null,previousError=previous?thNumber(previous.error):null;
  const signedDelta=previous&&error!==null&&previousError!==null?error-previousError:null,delta=signedDelta!==null?Math.abs(signedDelta):null;
  const drift=months&&delta!==null?delta/months:null,annualDrift=drift!==null?drift*12:null;
  const margin=valid?emp-Math.abs(error):null,use=valid?Math.abs(error)/emp:null;
  const safeMonths=margin!==null&&margin<0?Infinity:(previous&&drift!==null&&drift>0&&margin!==null?Math.max(0,(margin/drift)*safety):(previous&&margin!==null?Infinity:null));
  const decision=!valid?'NO EVALUABLE':Math.abs(error)<=emp?'CONFORME':'REQUIERE CORRECCIÓN';
  let status=decision;
  if(decision==='CONFORME'&&previous){if(safeMonths!==null&&Number.isFinite(safeMonths)&&safeMonths<3)status='CRÍTICO';else if((safeMonths!==null&&Number.isFinite(safeMonths)&&safeMonths<current)||(use!==null&&use>=0.80))status='VIGILANCIA';else status='ESTABLE';}
  else if(decision==='CONFORME')status='SIN HISTÓRICO';
  return {...r,emp,uncertainty:null,previous,days,months,previousError,signedDelta,delta,drift,annualDrift,margin,use,safeMonths,status,decision};
 });
 const complete=evaluated.length>0&&evaluated.every(r=>r.decision!=='NO EVALUABLE'),needsCorrection=evaluated.some(r=>r.decision==='REQUIERE CORRECCIÓN');
 const conformityDecision=needsCorrection?'APTO CON CORRECCIÓN':complete?'CONFORME':'NO EVALUABLE';
 const byMagnitude=['T','H'].map(m=>{const pts=evaluated.filter(r=>thMagnitude(r)===m&&r.previous&&r.delta!==null);const worst=pts.length?[...pts].sort((a,b)=>b.delta-a.delta)[0]:null;return {code:m,magnitude:m==='T'?'Temperatura':'Humedad relativa',unit:m==='T'?'°C':'%HR',comparablePoints:pts.length,maxAbsDrift:worst?.delta??null,maxSignedDrift:worst?.signedDelta??null,worstPoint:worst?.point??'',annualizedAbsDrift:worst?.annualDrift??null};});
 const historical=evaluated.filter(r=>r.previous&&r.decision!=='NO EVALUABLE');
 let recommendation=current,reason='Sin histórico comparable: se mantiene provisionalmente el intervalo vigente.';
 if(historical.length){
  const finite=historical.map(r=>r.safeMonths).filter(Number.isFinite),worstSafe=finite.length?Math.min(...finite):Infinity;
  if(Number.isFinite(worstSafe)&&worstSafe<current){recommendation=Math.max(1,Math.floor(worstSafe));reason=`El peor punto proyecta ${worstSafe.toFixed(1)} meses seguros antes de alcanzar su EMP, aplicando margen preventivo del 80 %. Se sugieren ${recommendation} meses.`;}
  else if(ceiling>current){const target=Number.isFinite(worstSafe)?Math.max(current,Math.floor(worstSafe)):ceiling;recommendation=Math.min(ceiling,current+3,target);reason=recommendation>current?`La deriva histórica es estable y permite ampliar de forma escalonada a ${recommendation} meses.`:'La deriva es estable, pero el margen calculado no justifica ampliar el intervalo.';}
  else reason=`La deriva histórica es estable y los errores permanecen dentro del EMP. Se mantienen ${current} meses porque no existe un tope autorizado mayor.`;
 }
 recommendation=Math.max(1,Math.round(recommendation));
 const overall=evaluated.some(r=>r.status==='CRÍTICO')?'CRÍTICO':evaluated.some(r=>r.status==='VIGILANCIA')?'VIGILANCIA':complete?(needsCorrection?'ESTABLE CON CORRECCIÓN':historical.length?'ESTABLE':'SIN HISTÓRICO'):'NO EVALUABLE';
 return {family:'TERMOHIGROMETRO',currentInterval:current,maxInterval:ceiling,recommendationMonths:recommendation,safetyFactor:safety,overall,conformityDecision,reason,history,evaluated,byMagnitude};
}

