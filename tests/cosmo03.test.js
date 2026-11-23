import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COSMO03_AUTHORITY,COSMO03_POLICIES,COSMO03_BUDGETS,COSMO03_SEEDS,
  COSMO03_LABELS,COSMO03_RESERVED_PAIRS,cosmo03Score,cosmo03Sensors,
  cosmo03Permutation,cosmo03Posterior,cosmo03Example,cosmo03Report
} from '../src/cosmo03.js';

const EPS=1e-11;
const close=(x,y)=>assert.ok(Math.abs(x-y)<EPS,'Expected '+x+' to equal '+y);
const donor=(mask,index)=>(mask>>>index)&1;
const total=(mask,offset)=>Array.from({length:4},(_,i)=>donor(mask,offset+i)).reduce((a,b)=>a+b,0);

test('registered 16 geometries, four reserved and 12 development, all valid',()=>{
  assert.equal(COSMO03_LABELS.length,16);
  assert.equal(new Set(COSMO03_LABELS).size,16);
  assert.equal(COSMO03_RESERVED_PAIRS.length,4);
  for(const key of COSMO03_RESERVED_PAIRS)assert.ok(COSMO03_LABELS.includes(key));
});

test('sensor policy obeys exactly equal budgets, valid unique positions and deterministic seeds',()=>{
  for(const label of COSMO03_LABELS){
    const [a,b]=label.split(':').map(Number);
    for(const budget of COSMO03_BUDGETS)for(const policy of COSMO03_POLICIES)for(const seed of COSMO03_SEEDS){
      const x=cosmo03Sensors(policy,budget,a,b,seed);
      assert.equal(x.length,budget);
      assert.equal(new Set(x).size,budget);
      assert.ok(x.every(i=>Number.isInteger(i)&&i>=0&&i<8));
      assert.deepEqual(x,cosmo03Sensors(policy,budget,a,b,seed));
      if(policy==='targeted')assert.deepEqual(x,[a,4+b].slice(0,budget));
      if(policy==='fixed')assert.deepEqual(x,[3,4].slice(0,budget));
    }
  }
});

test('flat/nested exact parity on all 16 x 3 x 3 x 256 cases',()=>{
  const report=cosmo03Report({seed:369});
  assert.equal(report.authority,COSMO03_AUTHORITY);
  assert.equal(report.conditions,144);
  assert.equal(report.stateEvaluationsPerRepresentation,36864);
  assert.equal(report.reservedConditions,36);
  assert.equal(report.parityViolations,0);
  for(const r of report.results){
    assert.equal(r.states,256);
    assert.equal(r.observerCostBits,r.budget);
    assert.equal(r.mismatchCount,0);
    assert.deepEqual(r.flat,r.nested);
    close(r.flat.entropyBits,r.flat.logLossBits);
    assert.ok(r.flat.accuracy>=0&&r.flat.accuracy<=1);
    assert.ok(r.flat.entropyBits>=-EPS&&r.flat.mae>=0);
    if(r.budget===2&&r.policy==='targeted'){
      assert.equal(r.flat.accuracy,1);
      close(r.flat.entropyBits,0);
      close(r.flat.logLossBits,0);
    }
  }
  assert.deepEqual(report,cosmo03Report({seed:369}));
});

test('no extra sensor yields policy-independent results, and targeted sensor cannot hurt the oracle',()=>{
  const report=cosmo03Report({seed:636});
  for(const label of COSMO03_LABELS){
    const [a,b]=label.split(':').map(Number);
    const subset=report.results.filter(r=>r.donorPair.join(':')===label);
    const zero=subset.filter(r=>r.budget===0);
    for(const r of zero.slice(1)){
      close(r.flat.accuracy,zero[0].flat.accuracy);
      close(r.flat.entropyBits,zero[0].flat.entropyBits);
    }
    for(const budget of [1,2]){
      const t=subset.find(r=>r.budget===budget&&r.policy==='targeted');
      for(const policy of ['fixed','random']){
        const control=subset.find(r=>r.budget===budget&&r.policy===policy);
        assert.ok(t.flat.entropyBits<=control.flat.entropyBits+EPS,
          'targeted should not have higher Bayes conditional entropy');
      }
    }
  }
});

test('independent exact frequency table matches analytical conditional posterior',()=>{
  for(const [a,b,budget,sensors] of [
    [3,0,0,[]],[1,2,1,[1]],[2,1,2,[2,5]],
    [0,3,2,[0,4]],[3,3,2,[3,7]],[0,0,2,[3,5]]
  ]){
    const groups=new Map();
    for(let mask=0;mask<256;mask++){
      const counts=[total(mask,0),total(mask,4)];
      const sensed=sensors.map(index=>({index,signal:donor(mask,index)}));
      const key=JSON.stringify([counts,sensed.map(s=>s.signal)]);
      if(!groups.has(key))groups.set(key,{view:{parentTotals:counts,sensed},outcomes:[0,0,0]});
      groups.get(key).outcomes[donor(mask,a)+donor(mask,4+b)]++;
    }
    for(const row of groups.values()){
      const expected=cosmo03Posterior(row.view,[a,4+b]);
      const n=row.outcomes.reduce((s,v)=>s+v,0);
      close(expected.reduce((s,v)=>s+v,0),1);
      for(let y=0;y<3;y++)close(expected[y],row.outcomes[y]/n);
    }
  }
});

test('same state and sensor geometry relabeled within parents preserves scores',()=>{
  for(const label of COSMO03_RESERVED_PAIRS){
    const [a,b]=label.split(':').map(Number);
    for(const budget of COSMO03_BUDGETS)for(const policy of COSMO03_POLICIES){
      const original=cosmo03Score({a,b,budget,policy,seed:369});
      for(const seed of COSMO03_SEEDS){
        const perm=cosmo03Permutation(seed);
        assert.equal(new Set(perm).size,8);
        assert.ok(perm.slice(0,4).every(i=>i<4));
        assert.ok(perm.slice(4).every(i=>i>=4));
        const relocated=cosmo03Score({a,b,budget,policy,seed:369,permutation:perm});
        for(const field of ['accuracy','entropyBits','logLossBits','mae']){
          close(relocated.flat[field],original.flat[field]);
          close(relocated.nested[field],original.nested[field]);
        }
        assert.equal(relocated.mismatchCount,0);
      }
    }
  }
});

test('nested serialization retains eight source bits but adds lineage metadata',()=>{
  const x=cosmo03Example(165,3,0);
  assert.equal(x.flat.mask,165);
  assert.deepEqual(x.nested.child.parentIds,['A','B']);
  assert.deepEqual(x.nested.child.donorIds,['A3','B0']);
  assert.equal(x.nested.parents.reduce((n,p)=>n+p.signals.length,0),8);
  assert.equal(x.flat.donorIndices.length,2);
  assert.ok(x.nestedJsonBytes>x.flatJsonBytes);
  assert.equal(x.differenceBytes,x.nestedJsonBytes-x.flatJsonBytes);
});

test('synthetic model rejects invalid donor indices, budgets, policies, masks and relabeling',()=>{
  assert.throws(()=>cosmo03Score({a:-1}),RangeError);
  assert.throws(()=>cosmo03Score({b:4}),RangeError);
  assert.throws(()=>cosmo03Score({budget:3}),RangeError);
  assert.throws(()=>cosmo03Score({policy:'magic'}),TypeError);
  assert.throws(()=>cosmo03Example(-1),RangeError);
  assert.throws(()=>cosmo03Score({permutation:[0,1,2,3,4,5,6,6]}),TypeError);
  assert.throws(()=>cosmo03Score({permutation:[4,1,2,3,0,5,6,7]}),TypeError);
  assert.throws(()=>cosmo03Permutation(-1),RangeError);
  assert.throws(()=>cosmo03Report({seed:-1}),RangeError);
  assert.throws(()=>cosmo03Posterior({parentTotals:[4,0],sensed:[{index:0,signal:0}]},[0,4]),TypeError);
  assert.throws(()=>cosmo03Posterior({parentTotals:[2,2],sensed:[{index:0,signal:1},{index:0,signal:1}]},[0,4]),TypeError);
});
