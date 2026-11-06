import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,arealRadius,region,kretschmann,kruskalCoefficient,horizonCoefficient,timeReverse,kruskalBoost,runHorizonStudy} from '../src/horizonDuality.js';

const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,'expected '+a+' ≈ '+b);
test('Schwarzschild horizon is a regular Kruskal coordinate surface',()=>{
  close(arealRadius(0.25,0.25),2);
  close(arealRadius(0,0),2);
  close(kruskalCoefficient(2),16/Math.E);
  close(horizonCoefficient(),16/Math.E);
  close(kretschmann(2),0.75);
});
test('four Kruskal regions have distinct causal sectors',()=>{
  assert.match(region(0.2,0),/BLACK/);
  assert.match(region(-0.2,0),/WHITE/);
  assert.match(region(0,1),/RIGHT/);
  assert.match(region(0,-1),/LEFT/);
  assert.equal(region(1,1),'HORIZON');
});
test('black and white initial scalar projection agrees yet future radial changes differ',()=>{
  const r=runHorizonStudy();
  assert.equal(r.schema,SCHEMA);
  close(r.black.initialRadius,1.9701267551996184);
  close(r.black.initialRadius,r.white.initialRadius);
  close(r.black.initialCurvature,r.white.initialCurvature);
  close(r.black.initialCurvature,0.8208734771579491);
  close(r.black.deltaR,-0.0031133164483567);
  close(r.white.deltaR,+0.0029524114029412);
  assert.equal(r.projection.sameVisible,true);
  assert.equal(r.projection.oppositeEvolution,true);
  assert.match(r.limits,/No matter/);
});
test('boosts preserve r and K; time reversal exchanges the two interior regions',()=>{
  const p={T:0.2,X:0};
  const reversed=timeReverse(p);
  assert.equal(reversed.T,-0.2);
  assert.match(region(reversed.T,reversed.X),/WHITE/);
  const q=kruskalBoost(p,0.7);
  close(q.X*q.X-q.T*q.T,p.X*p.X-p.T*p.T);
  close(arealRadius(q.T,q.X),arealRadius(p.T,p.X));
  const r=runHorizonStudy({M:2,a:.4,step:.02,eta:1.1});
  close(r.black.initialRadius,r.controls.boostInvariantRadiusBlack);
  close(r.white.initialRadius,r.controls.boostInvariantRadiusWhite);
});
test('classical r=0 singularity is not smoothed over',()=>{
  assert.throws(()=>arealRadius(1,0),/singularity/);
  assert.throws(()=>arealRadius(2,0),/singularity/);
  assert.ok(kretschmann(0.01)>1e12);
});
test('fail closed on invalid or nonsensical study settings',()=>{
  for(const p of [{a:0},{a:1},{a:.01,step:.02},{a:.99,step:.02},{M:0},{eta:10}])
    assert.throws(()=>runHorizonStudy(p));
});
test('sign matrix is rank deficient, unlike 2D Lorentzian metric',()=>{
  const A=[[1,-1],[-1,1]];
  const det=A[0][0]*A[1][1]-A[0][1]*A[1][0];
  assert.equal(det,0);
  assert.equal((-1)*(1)-0, -1);
});
test('fixed-X visibility is insufficient outside the restricted study',()=>{
  const r=runHorizonStudy({M:1.5,a:.3,step:.005});
  assert.equal(r.projection.hidden.includes('fixed-X'),true);
  assert.equal(r.black.deltaR<0&&r.white.deltaR>0,true);
});
