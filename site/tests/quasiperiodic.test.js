import test from 'node:test';
import assert from 'node:assert/strict';
import {schedules,run,trial} from '../src/quasiperiodic.js';
test('six schedules preserve equal exact pulse budgets, expose edits and reproduce',()=>{
 const a=schedules(369); assert.equal(a.length,6);assert.deepEqual(a,schedules(369));
 for(const s of a){assert.equal(s.word.length,120);assert.equal([...s.word].filter(c=>c==='A').length,75);assert.equal([...s.word].filter(c=>c==='B').length,45);assert.equal([...s.raw].filter((c,i)=>c!==s.word[i]).length,s.edits);}
 assert.equal(a.find(s=>s.name==='periodic').edits,0);
 assert.equal(a.find(s=>s.name==='fibonacci').raw.slice(0,13),'ABAABABAABAAB');
 assert.notEqual(a.find(s=>s.name==='random').word,schedules(636).find(s=>s.name==='random').word);
});
test('zero error fidelity, unit norm, bounded probabilities and edge distances',()=>{
 for(const noise of [0,.08])for(const s of schedules(369)){
   const trace=trial(s.word,3,noise,1234);
   for(const p of trace){assert.ok(p.normError<1e-10);for(const k of ['quantum','classical','edge','edgeClean','bulk'])assert.ok(p[k]>=0&&p[k]<=1);if(noise===0){assert.ok(Math.abs(p.quantum-1)<1e-10);assert.ok(Math.abs(p.classical-1)<1e-10);assert.ok(Math.abs(p.edge-p.edgeClean)<1e-10);}}
 }
});
test('paired simulation is deterministic, records signed differences, rejects invalid config',()=>{
 const opts={seed:963,qubits:2,trials:2,noise:.05};const a=run(opts);assert.deepEqual(a,run(opts));
 for(const r of a.rows){assert.equal(r.repeats.length,2);assert.equal(r.deltaQuantum,r.quantum-a.rows[0].quantum);assert.equal(r.deltaClassical,r.classical-a.rows[0].classical);}
 for(const x of [{qubits:11},{trials:0},{noise:NaN},{seed:-1}])assert.throws(()=>run(x));
});
