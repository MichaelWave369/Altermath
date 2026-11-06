import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,SCORE,renderScore,melodySignature,signatureError,gearMetrics,runMelodyStudy} from '../src/scoreMelody.js';

const almost=(a,b,eps=1e-10)=>assert.ok(Math.abs(a-b)<eps, 'expected '+a+' ≈ '+b);
test('R23 original motif is explicit, nonempty and reproducible',()=>{
  assert.equal(SCORE.length,8);
  assert.deepEqual(renderScore(),renderScore());
  assert.equal(runMelodyStudy().schema,SCHEMA);
  assert.match(runMelodyStudy().limitations,/no evidence for reincarnation/);
});
test('musical intervals and relative rhythms survive key and tempo changes',()=>{
  const original=renderScore();
  for(const [transpose,tempo] of [[0,1],[7,1.25],[-12,0.5],[11,2]]){
    const variant=renderScore({transpose,tempo});
    almost(signatureError(original,variant),0);
    const result=runMelodyStudy({transpose,tempo});
    assert.equal(result.keyhole.invariantPreserved,true);
    assert.equal(result.keyhole.transferred,true);
    assert.deepEqual(melodySignature(original).intervals,melodySignature(variant).intervals);
  }
});
test('one changed pitch breaks the signature and blocks the keyhole',()=>{
  for(const mutation of [-2,-1,1,3]){
    const result=runMelodyStudy({mutation});
    assert.equal(result.keyhole.invariantPreserved,false);
    assert.equal(result.keyhole.transferred,false);
    assert.ok(result.keyhole.signatureError>0);
    assert.match(result.keyhole.reasons.join(' '),/invariant changed/);
  }
});
test('uniformly rotated gears stay mutually coherent but fail alignment',()=>{
  const aligned=gearMetrics({phaseOffset:0});
  const reversed=gearMetrics({phaseOffset:180});
  almost(aligned.coherence,1);
  almost(aligned.alignment,1);
  almost(reversed.coherence,1);
  almost(reversed.alignment,0);
  const result=runMelodyStudy({phaseOffset:180});
  assert.equal(result.keyhole.transferred,false);
  assert.equal(result.keyhole.invariantPreserved,true);
  assert.match(result.keyhole.reasons.join(' '),/alignment/);
});
test('jitter is deterministic for a seed and alignment is not defined as coherence',()=>{
  const a=gearMetrics({seed:369,phaseJitter:50,phaseOffset:20});
  const b=gearMetrics({seed:369,phaseJitter:50,phaseOffset:20});
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,gearMetrics({seed:963,phaseJitter:50,phaseOffset:20}));
  assert.ok(a.alignment>=0&&a.alignment<=1);
  assert.ok(a.coherence>=0&&a.coherence<=1+1e-12);
});
test('boundary policy can prohibit a structurally compatible pattern',()=>{
  const result=runMelodyStudy({gate:false});
  assert.equal(result.keyhole.invariantPreserved,true);
  assert.equal(result.keyhole.aligned,true);
  assert.equal(result.keyhole.transferred,false);
  assert.deepEqual(result.keyhole.reasons,['Boundary policy closed']);
});
test('negative controls fail for the intended independent reasons',()=>{
  const corrupted=runMelodyStudy({mutation:1});
  const mistimed=runMelodyStudy({phaseOffset:180});
  const unauthorized=runMelodyStudy({gate:false});
  assert.equal(corrupted.keyhole.aligned,true);
  assert.equal(mistimed.keyhole.invariantPreserved,true);
  assert.equal(unauthorized.keyhole.aligned,true);
  assert.equal([corrupted,mistimed,unauthorized].every(r=>!r.keyhole.transferred),true);
});
test('invalid numbers, missing notes, and unauthorized types fail closed',()=>{
  for(const options of [{tempo:0},{tempo:Infinity},{transpose:25},{mutation:13},
    {phaseOffset:-1},{phaseJitter:100},{threshold:2},{seed:1.2},{gate:'yes'}]){
    assert.throws(()=>runMelodyStudy(options));
  }
  assert.throws(()=>melodySignature([]));
  assert.throws(()=>melodySignature([{semitone:1,beats:0},{semitone:2,beats:1}]));
  assert.throws(()=>signatureError(renderScore(),renderScore().slice(1)));
});
