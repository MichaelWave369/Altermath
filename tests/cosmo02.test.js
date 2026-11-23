import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COSMO02_AUTHORITY,COSMO02_OPERATIONS,cosmo02Initial,cosmo02Audit,
  cosmo02Transition,cosmo02Advance,cosmo02Merge,cosmo02Census
} from '../src/cosmo02.js';

const approved={operatorApproved:true,creationEnabled:true};
const owned=world=>world.domains.flatMap(d=>d.tokens.map(t=>t.id));
const states=world=>world.domains.flatMap(d=>d.tokens.map(t=>t.signal));
const find=(w,id)=>w.domains.find(d=>d.id===id);

test('all 256 input states conserve eight distinct tokens and signal counts through four actions',()=>{
  for(let mask=0;mask<256;mask++){
    for(const mode of COSMO02_OPERATIONS){
      const w=cosmo02Transition(mask,mode,approved);
      const audit=cosmo02Audit(w);
      assert.equal(w.authority,COSMO02_AUTHORITY);
      assert.deepEqual(audit.errors,[]);
      assert.equal(audit.totalTokens,8);
      assert.equal(audit.ones,cosmo02Initial(mask).initialOnes);
      assert.equal(new Set(owned(w)).size,8);
      assert.equal(w.domains.length,mode==='birth'?3:2);
      assert.equal(Boolean(find(w,'C@1')),mode==='birth');
    }
  }
});

test('birth is opt-in and must pass all three independent gates',()=>{
  for(let mask=0;mask<256;mask++){
    for(const raw of [
      {},{creationEnabled:true},{operatorApproved:true},
      {...approved,permit:false},{...approved,contact:false},
      {...approved,compatible:false}
    ]){
      const w=cosmo02Transition(mask,'birth',raw);
      assert.equal(w.domains.length,2);
      assert.equal(w.ancestry.length,0);
      assert.ok(w.actionStatus.startsWith('refused:'));
      assert.deepEqual(owned(w),owned(cosmo02Initial(mask)));
      assert.ok(cosmo02Audit(w).ok);
    }
    for(const gate of ['permit','contact','compatible']){
      const w=cosmo02Transition(mask,'transfer',{[gate]:false});
      assert.equal(w.actionStatus.startsWith('refused:'),true);
      assert.deepEqual(owned(w),owned(cosmo02Initial(mask)));
    }
  }
});

test('birth is relocation, not duplication; ancestry is explicit and bounded',()=>{
  const w=cosmo02Transition(165,'birth',approved);
  assert.deepEqual(find(w,'A').tokens.map(t=>t.id),['A0','A1','A2']);
  assert.deepEqual(find(w,'B').tokens.map(t=>t.id),['B1','B2','B3']);
  assert.deepEqual(find(w,'C@1').tokens.map(t=>t.id),['A3','B0']);
  assert.deepEqual(find(w,'C@1').parentIds,['A','B']);
  assert.equal(w.ancestry.length,1);
  assert.equal(w.ancestry[0].status,'active');
  assert.equal(w.events[0].type,'birth');
  assert.equal(w.events[0].note,'two pre-existing tokens rehomed');
  assert.equal(cosmo02Audit(w).ok,true);
});

test('transfer changes owners without a new child; transform remains local',()=>{
  const transfer=cosmo02Transition(8,'transfer');
  assert.equal(find(transfer,'A').tokens[3].id,'B0');
  assert.equal(find(transfer,'B').tokens[0].id,'A3');
  assert.equal(transfer.ancestry.length,0);
  assert.equal(find(transfer,'C@1'),undefined);
  const transform=cosmo02Transition(8,'transform');
  assert.ok(find(transform,'A').tokens.every(t=>t.origin==='A'));
  assert.ok(find(transform,'B').tokens.every(t=>t.origin==='B'));
  assert.ok(cosmo02Audit(transform).ok);
});

test('child local evolution and gated merge preserve all ancestry and budgets',()=>{
  for(let mask=0;mask<256;mask++){
    const born=cosmo02Transition(mask,'birth',approved);
    const advanced=cosmo02Advance(born,3);
    assert.ok(cosmo02Audit(advanced).ok);
    assert.equal(advanced.tick,3);
    assert.equal(advanced.ancestry[0].status,'active');
    const merged=cosmo02Merge(advanced,{operatorApproved:true});
    assert.ok(cosmo02Audit(merged).ok);
    assert.equal(merged.domains.length,2);
    assert.equal(merged.ancestry[0].status,'retired');
    assert.equal(merged.ancestry[0].retiredAt,3);
    assert.equal(merged.events.at(-1).type,'merge');
    assert.deepEqual([...owned(merged)].sort(),[...owned(cosmo02Initial(mask))].sort());
    assert.deepEqual([...states(merged)].sort(),[...states(cosmo02Initial(mask))].sort());
  }
});

test('merge without approval refuses without mutating existing child',()=>{
  const w=cosmo02Transition(91,'birth',approved);
  const snapshot=JSON.stringify(w);
  const denied=cosmo02Merge(w);
  assert.equal(denied.actionStatus,'refused:operator_approval');
  assert.equal(denied.domains.length,3);
  assert.equal(JSON.stringify(w),snapshot);
  for(const gate of ['permit','contact','compatible']){
    const blocked=cosmo02Merge(w,{operatorApproved:true,[gate]:false});
    assert.ok(blocked.actionStatus.startsWith('refused:'));
    assert.equal(blocked.domains.length,3);
  }
});

test('independent structural audit detects duplicated, lost, and forged resources',()=>{
  const seed=cosmo02Transition(125,'birth',approved);
  const duplicate=structuredClone(seed);
  duplicate.domains[2].tokens[0].id='A0';
  assert.equal(cosmo02Audit(duplicate).ok,false);
  const lost=structuredClone(seed);
  lost.domains[2].tokens.pop();
  assert.equal(cosmo02Audit(lost).ok,false);
  const created=structuredClone(seed);
  created.domains[2].tokens.push({id:'Cnew',origin:'A',signal:1});
  assert.equal(cosmo02Audit(created).ok,false);
  const revalued=structuredClone(seed);
  revalued.domains[2].tokens[0].signal=9;
  assert.equal(cosmo02Audit(revalued).ok,false);
  const brokenLineage=structuredClone(seed);
  brokenLineage.domains[2].parentIds=['Z'];
  assert.equal(cosmo02Audit(brokenLineage).ok,false);
  assert.throws(()=>cosmo02Advance(lost,1),/invalid world/);
});

test('exact 256-state census is deterministic and preserves null and nonclaims',()=>{
  const report=cosmo02Census();
  assert.deepEqual(report,cosmo02Census());
  assert.equal(report.authority,COSMO02_AUTHORITY);
  assert.equal(report.modes.length,4);
  for(const mode of report.modes){
    assert.equal(mode.states,256);
    assert.equal(mode.conservationFailures,0);
    assert.equal(mode.refusals,0);
    assert.equal(mode.childCases,mode.mode==='birth'?256:0);
    if(mode.mode==='hold'){
      assert.equal(mode.changedTokenArrangement,0);
      assert.equal(mode.changedParentSignals,0);
    }
  }
  const obs=report.childObservation;
  assert.ok(obs.coarseEntropyBits>0);
  assert.ok(obs.oneDonorEntropyBits>0);
  assert.ok(Math.abs(obs.twoDonorEntropyBits)<1e-12);
  assert.ok(obs.coarseEntropyBits>obs.oneDonorEntropyBits);
  assert.ok(obs.witness);
  const a=cosmo02Transition(obs.witness.a.mask,'birth',approved);
  const b=cosmo02Transition(obs.witness.b.mask,'birth',approved);
  assert.notEqual(find(a,'C@1').tokens.reduce((sum,t)=>sum+t.signal,0),
    find(b,'C@1').tokens.reduce((sum,t)=>sum+t.signal,0));
});

test('invalid initial inputs and unsupported controls fail closed',()=>{
  for(const mask of [-1,256,1.25,NaN,'42',null]){
    assert.throws(()=>cosmo02Transition(mask,'hold'),RangeError);
  }
  for(const [mode,raw] of [['wormhole',{}],['birth',{operatorApproved:'yes'}],
    ['birth',{permit:1}],['birth',{creationEnabled:1}],['birth',{surprise:true}]]){
    assert.throws(()=>cosmo02Transition(1,mode,raw),TypeError);
  }
  assert.throws(()=>cosmo02Advance(cosmo02Initial(42),-1),RangeError);
  assert.throws(()=>cosmo02Advance(cosmo02Initial(42),17),RangeError);
  assert.throws(()=>cosmo02Merge(cosmo02Initial(42),{operatorApproved:1}),TypeError);
});
