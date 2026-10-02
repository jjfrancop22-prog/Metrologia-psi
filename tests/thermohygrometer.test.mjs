import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseThermohygrometerCertificate as parse,evaluateThermohygrometerInterval as evaluate,thKey,thEmp} from '../src/services/thermohygrometer.js';
const prev=parse(JSON.parse(fs.readFileSync(new URL('./th-previous.json',import.meta.url)))),cur=parse(JSON.parse(fs.readFileSync(new URL('./th-current.json',import.meta.url))));

assert.equal(prev.date,'2025-09-10');assert.equal(cur.date,'2026-05-28');assert.equal(cur.identification,'TEST-194');assert.equal(cur.rows.length,4);assert.equal(prev.rows.length,4);assert.equal(cur.warnings.length,0);
assert.deepEqual(cur.rows.map(r=>r.error),[-1.03,-1.02,4.17,-2.2]);assert.deepEqual(cur.rows.map(r=>r.uncertainty),[.68,.67,.99,1.1]);
const history=prev.rows.map(r=>({...r,date:prev.date,certificateNumber:prev.certificateNumber}));
const rows=cur.rows.map(r=>({...r,emp:r.unit==='°C'?2:6}));
const ev=evaluate(rows,cur.date,history,12,24);
assert.deepEqual(ev.evaluated.map(r=>Number(r.delta.toFixed(3))),[0,.03,.63,4]);assert.equal(ev.evaluated[3].days,260);assert.equal(ev.recommendationMonths,3);assert.equal(ev.conformityDecision,'NO CONFORME');
assert.equal(evaluate(cur.rows,cur.date,history).conformityDecision,'NO CONFORME');
const fail=evaluate(rows.map(r=>({...r,emp:r.unit==='°C'?1:5,correction:-r.error,applyCorrection:true})),cur.date,history);assert.equal(fail.conformityDecision,'NO CONFORME');
assert.equal(evaluate(rows,cur.date,[],12,24).recommendationMonths,12);
assert.equal(evaluate(rows,cur.date,history.map((r,i)=>({...r,error:rows[i].error})),12,24).recommendationMonths,12);
assert.equal(evaluate(rows,cur.date,history.map(r=>({...r,point:'99'})),12,24).evaluated.filter(r=>r.previous).length,0);
assert.equal(thKey({magnitude:'Temperatura',unit:'°F',point:10}),'');
assert.equal(thEmp({metrologicalCharacteristics:[{magnitude:'Temperatura',unit:'°C',empCriterion:'±1 °C'}]},rows[0]),1);
// Correction-only header, same source values negated: normalize to signed error.
const corrected=JSON.parse(fs.readFileSync(new URL('./th-current.json',import.meta.url)));
for(const page of corrected.itemPages)for(const g of page)for(const it of g.items){if(it.s==='Error de Medición (e)'||it.s==='Measurement Error (e)')it.s='Corrección';else if(Math.abs(it.x+(it.w||0)/2-320)<20&&/^[-+]?\d+[,.]\d+$/.test(it.s))it.s=String(-Number(it.s.replace(',','.')))}
assert.deepEqual(parse(corrected).rows.map(r=>r.error),cur.rows.map(r=>r.error));
console.log('PASS: real PDFs, 4 deltas, guard, zero, missing EMP, no history, no cross point, correction sign.');

assert.equal(evaluate([{...rows[0],error:0,uncertainty:0}],cur.date,[],12,24).conformityDecision,'CONFORME');
assert.equal(evaluate([{...rows[0],uncertainty:-1}],cur.date,[],12,24).conformityDecision,'NO CONFORME');
const expanded=JSON.parse(fs.readFileSync(new URL('./th-current.json',import.meta.url)));
const dataRow=expanded.itemPages[0].find(g=>g.items.some(i=>i.s==='35'));
const extra=JSON.parse(JSON.stringify(dataRow));extra.items.find(i=>i.s==='35').s='25';expanded.itemPages[0].splice(expanded.itemPages[0].indexOf(dataRow),0,extra);
assert.equal(parse(expanded).rows.length,5);
console.log('PASS: zero preserved, negative U rejected, more than two temperature points retained.');
