import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POLYHEDRA,makePolyhedralGraph,graphEdges,validateGraph,
  totalState,nextState,exactKeyholeStudy,degreePreservingControl,runPolyhedralStudy,
} from '../src/polyhedralKeyhole.js';

test('dual face-adjacency graphs have correct Platonic counts and odd degrees',()=>{
  for(const spec of POLYHEDRA){
    const graph=makePolyhedralGraph(spec.id);
    assert.equal(graph.neighbors.length,spec.faces);
    assert.ok(validateGraph(graph));
    assert.equal(graphEdges(graph).length,spec.faces*spec.degree/2);
    for(const row of graph.neighbors)assert.equal(row.length,spec.degree);
    // Euler on each original solid, using regular p-gonal face counts.
    const polygonSides=spec.faces===12?5:3;
    const E=spec.faces*polygonSides/2;
    const V=E-spec.faces+2;
    assert.equal(V-E+spec.faces,2);
  }
});
test('complete exact census reproduces fixed 4/8/12 synthetic baseline',()=>{
  const expected={tetrahedron:0,octahedron:0.47437549538726076,dodecahedron:1.4487438178946757};
  for(const [id,bits] of Object.entries(expected)){
    const study=exactKeyholeStudy(makePolyhedralGraph(id));
    assert.equal(study.samples,2**study.pockets);
    assert.ok(Math.abs(study.conditionalEntropyBits-bits)<1e-11);
    assert.equal(study.distributions.reduce((sum,b)=>sum+b.count,0),study.samples);
    for(const b of study.distributions)
      assert.equal(b.outcomes.reduce((sum,row)=>sum+row.count,0),b.count);
    if(id==='tetrahedron')assert.equal(study.collision,null);
    else{
      const {collision}=study;
      assert.equal(totalState(collision.a.mask,study.pockets),collision.observed);
      assert.equal(totalState(collision.b.mask,study.pockets),collision.observed);
      assert.notEqual(collision.a.next,collision.b.next);
    }
  }
});
test('updating is deterministic and all-plus/all-minus configurations are fixed',()=>{
  for(const spec of POLYHEDRA){
    const graph=makePolyhedralGraph(spec.id),n=spec.faces;
    assert.equal(nextState(graph,0),0);
    assert.equal(nextState(graph,(1<<n)-1),(1<<n)-1);
    assert.equal(nextState(graph,3),nextState(graph,3));
    assert.throws(()=>nextState(graph,-1),/Invalid/);
    assert.throws(()=>nextState(graph,1<<n),/Invalid/);
  }
});
test('rewiring preserves n, degree, symmetry, connectivity and a fixed seed',()=>{
  for(const id of ['octahedron','dodecahedron']){
    const graph=makePolyhedralGraph(id);
    const control=degreePreservingControl(graph,369);
    assert.deepEqual(degreePreservingControl(graph,369),control);
    assert.ok(validateGraph(control));
    assert.equal(graphEdges(control).length,graphEdges(graph).length);
    assert.notDeepEqual(control.neighbors,graph.neighbors);
  }
  assert.deepEqual(degreePreservingControl(makePolyhedralGraph('tetrahedron'),369).neighbors,
    makePolyhedralGraph('tetrahedron').neighbors);
});
test('the entire study is reproducible, has bounded controls and explicit authority NONE',()=>{
  for(const id of ['tetrahedron','octahedron','dodecahedron']){
    const report=runPolyhedralStudy(id,369,4);
    assert.deepEqual(runPolyhedralStudy(id,369,4),report);
    assert.equal(report.protocol,'POLY-01');
    assert.equal(report.authority,'NONE');
    assert.equal(report.controls.length,4);
    for(const c of report.controls){
      assert.ok(Number.isFinite(c.bits));
      assert.ok(validateGraph(c.graph));
    }
    assert.ok(report.controlMeanBits>=report.controlRangeBits[0]);
    assert.ok(report.controlMeanBits<=report.controlRangeBits[1]);
  }
});
test('tampered or invalid geometry and experiment inputs fail closed',()=>{
  const base=makePolyhedralGraph('octahedron');
  const asymmetric={...base,neighbors:base.neighbors.map(row=>[...row])};
  asymmetric.neighbors[0][0]=0;
  assert.throws(()=>validateGraph(asymmetric),/Non-simple|Invalid degree/);
  assert.throws(()=>makePolyhedralGraph('icosahedron'),/Unknown polyhedron/);
  assert.throws(()=>degreePreservingControl(base,0),/Seed/);
  assert.throws(()=>runPolyhedralStudy('octahedron',369,0),/Control count/);
});
