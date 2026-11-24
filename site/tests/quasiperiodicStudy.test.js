import test from 'node:test';
import assert from 'node:assert/strict';
import {rawWord,shuffleWord,study,SEEDS,bootstrap,FAMILIES,LENGTHS} from '../src/quasiperiodicStudy.js';
import {trial} from '../src/quasiperiodic.js';
test('raw word recursion and exact multiset shuffle',()=>{
 assert.equal(rawWord('fibonacci',13),'ABAABABAABAAB');
 assert.equal(rawWord('thue-morse',8),'ABBABAAB');
 for(const family of FAMILIES)for(const n of LENGTHS){const word=rawWord(family,n),s=shuffleWord(word,369);assert.equal(word.length,n);assert.equal([...s].sort().join(''),[...word].sort().join(''));assert.equal(s,shuffleWord(word,369));}
 assert.equal(new Set([...SEEDS.exploratory,...SEEDS.holdout]).size,9);
});
test('zero noise control, independent modes and backward compatible default',()=>{
 const word=rawWord('fibonacci',34),a=trial(word,2,.04,369);
 assert.deepEqual(a,trial(word,2,.04,369,'combined'));
 assert.deepEqual(trial(word,2,.04,369,'none'),trial(word,2,0,369,'combined'));
 assert.notDeepEqual(a,trial(word,2,.04,369,'static'));
 assert.notDeepEqual(a,trial(word,2,.04,369,'jitter'));
 assert.throws(()=>trial(word,2,.04,369,'bad'));
});
test('paired evidence, split isolation, controls and signed metrics',()=>{
 const cfg={qubits:2,noise:.04,lengths:[34],families:['fibonacci'],modes:['none','static','jitter','combined']};
 const a=study(cfg);assert.deepEqual(a,study(cfg));assert.equal(a.rows.length,8);
 for(const row of a.rows){assert.deepEqual(row.pairs.map(p=>p.seed),SEEDS[row.split]);
  for(const p of row.pairs){assert.equal(p.controls.length,3);assert.equal(p.delta.quantum,p.raw.quantum-p.controlMean.quantum);assert.ok(p.raw.maxNormError<1e-10);
   for(const c of p.controls){assert.equal([...c.word].sort().join(''),[...row.word].sort().join(''));assert.ok(c.metrics.maxNormError<1e-10);}
   if(row.mode==='none')assert.ok(Math.abs(p.delta.quantum)<1e-10);
  }
  assert.equal(row.stats.quantum.wins+row.stats.quantum.losses+row.stats.quantum.ties,row.pairs.length);
 }
 const rows=a.rows.filter(r=>r.split==='holdout');assert.deepEqual(rows[0].pairs.map(p=>p.controls.map(c=>c.word)),rows[3].pairs.map(p=>p.controls.map(c=>c.word)));
 assert.throws(()=>study({lengths:[999]}));assert.deepEqual(bootstrap([0,0,0],369),{mean:0,low:0,high:0,wins:0,losses:0,ties:3});
});
