import test from 'node:test';
import assert from 'node:assert/strict';
import {disorder,compare} from '../src/aqdSourceCircuit.js';
test('published bound and legacy reproduce exact factor five on same draws',()=>{
 const a=disorder(6,369),b=disorder(6,369,1,'legacyE2');
 for(const axis of 'XZ'){assert.deepEqual(a[axis].K,b[axis].K);for(let q=0;q<6;q++)for(let k=0;k<3;k++){assert.ok(a[axis].B[q][k]<=Math.PI/(5*Math.sqrt(3)));assert.ok(Math.abs(5*a[axis].B[q][k]-b[axis].B[q][k])<1e-12);}}
});
test('exact basis and independent NumPy known-answer endpoints',()=>{
 const r=compare({n:6,seed:369,basis:'exact'});
 assert.equal(r.samples,64);assert.equal(r.exactBasis,true);
 assert.ok(Math.abs(r.rows[0].byAxis.X.at(-1).alignedEdge-.7779098660293067)<1e-10);
 assert.ok(Math.abs(r.rows[0].byAxis.Z.at(-1).alignedEdge-.6933914942357782)<1e-10);
 const s=compare({n:4,basis:'sampled',samples:8,depth:2});assert.equal(s.samples,8);assert.equal(s.exactBasis,false);
 assert.throws(()=>compare({n:10,basis:'exact'}));
});
