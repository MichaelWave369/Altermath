/**
 * COSMO-03 / R31: matched-observation flat-vs-nested representation test.
 * Synthetic finite probabilistic inference, not physical cosmology.
 * Parent bit counts and equal raw-sensor budgets are the ONLY observations.
 * Both representations use the same analytic Bernoulli/hypergeometric oracle.
 * "Nested" structure adds metadata and has NO privileged access to child outcomes.
 */
export const COSMO03_AUTHORITY = 'SIMULATED / authority NONE';
export const COSMO03_POLICIES = Object.freeze(['fixed', 'random', 'targeted']);
export const COSMO03_BUDGETS = Object.freeze([0, 1, 2]);
export const COSMO03_SEEDS = Object.freeze([369, 636, 963]);
export const COSMO03_RESERVED_PAIRS = Object.freeze(['0:0', '1:2', '2:1', '3:3']);
export const COSMO03_LABELS = Object.freeze(
  Array.from({length:4},(_,a)=>Array.from({length:4},(_,b)=>a+':'+b)).flat()
);

function validInteger(n,low,high,name){
  if(!Number.isInteger(n)||n<low||n>high)throw new RangeError('invalid '+name);
  return n;
}
const count = bits => bits.reduce((n,b)=>n+b,0);
function decode(mask){
  validInteger(mask,0,255,'mask');
  return Array.from({length:8},(_,i)=>(mask>>>i)&1);
}
function pairIndices(a,b){
  validInteger(a,0,3,'donor A');
  validInteger(b,0,3,'donor B');
  return [a,4+b];
}
function checkedPermutation(permutation){
  if(permutation===undefined||permutation===null)return [0,1,2,3,4,5,6,7];
  if(!Array.isArray(permutation)||permutation.length!==8 ||
     new Set(permutation).size!==8 ||
     permutation.some((p,i)=>!Number.isInteger(p)||p<0||p>7||
       (i<4 && p>=4)||(i>=4 && p<4)))throw new TypeError('permutation must preserve parent groups');
  return permutation.slice();
}
function applyPermutation(bits,permutation){
  const result=Array(8);
  for(let i=0;i<8;i++)result[permutation[i]]=bits[i];
  return result;
}
function rngShuffle(values,seed){
  let state=seed>>>0;
  const arr=values.slice();
  for(let i=arr.length-1;i>0;i--){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=state%(i+1);
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
export function cosmo03Permutation(seed){
  validInteger(seed,0,4294967295,'permutation seed');
  const pa=rngShuffle([0,1,2,3],seed);
  const pb=rngShuffle([4,5,6,7],seed^0x9e3779b9);
  return checkedPermutation([...pa,...pb]);
}
export function cosmo03Sensors(policy,budget,a,b,seed=369){
  if(!COSMO03_POLICIES.includes(policy))throw new TypeError('unknown sensor policy');
  if(!COSMO03_BUDGETS.includes(budget))throw new RangeError('unknown sensing budget');
  pairIndices(a,b);
  validInteger(seed,0,4294967295,'random seed');
  if(policy==='fixed')return [3,4].slice(0,budget);
  if(policy==='targeted')return [a,4+b].slice(0,budget);
  return rngShuffle([0,1,2,3,4,5,6,7],
    (seed^Math.imul(a+1,369)^Math.imul(b+1,963))>>>0).slice(0,budget);
}
function flatModel(bits,donorIndices){
  return {mask:bits.reduce((n,b,i)=>n+(b<<i),0),donorIndices:donorIndices.slice()};
}
function nestedModel(bits,donorIndices){
  return {
    parents:[{id:'A',signals:bits.slice(0,4)},{id:'B',signals:bits.slice(4,8)}],
    child:{id:'C@1',parentIds:['A','B'],
      donorIds:['A'+donorIndices[0],'B'+(donorIndices[1]-4)]}
  };
}
function flatView(flat,sensors){
  const bits=decode(flat.mask);
  return {parentTotals:[count(bits.slice(0,4)),count(bits.slice(4))],
    sensed:sensors.map(index=>({index,signal:bits[index]}))};
}
function nestedView(nested,sensors){
  const read=index=>nested.parents[index<4?0:1].signals[index%4];
  return {parentTotals:nested.parents.map(p=>count(p.signals)),
    sensed:sensors.map(index=>({index,signal:read(index)}))};
}
function flatLabel(flat){
  const bits=decode(flat.mask);
  return bits[flat.donorIndices[0]]+bits[flat.donorIndices[1]];
}
function nestedLabel(nested){
  const [a,b]=nested.child.donorIds;
  return nested.parents[0].signals[Number(a.slice(1))]+
    nested.parents[1].signals[Number(b.slice(1))];
}
/** Exact conditional donor probability with a uniform 8-bit input prior.
 * A donor is either observed, or conditionally exchangeable with unobserved
 * tokens of the same four-token parent.
 */
export function cosmo03Posterior(view,donorIndices){
  if(!view||!Array.isArray(view.parentTotals)||view.parentTotals.length!==2||
    !Array.isArray(view.sensed))throw new TypeError('invalid observer view');
  if(!Array.isArray(donorIndices)||donorIndices.length!==2 ||
     !Number.isInteger(donorIndices[0])||donorIndices[0]<0||donorIndices[0]>3||
     !Number.isInteger(donorIndices[1])||donorIndices[1]<4||donorIndices[1]>7){
    throw new TypeError('invalid donor geometry');
  }
  const seen=new Set();
  for(const s of view.sensed){
    if(!Number.isInteger(s.index)||s.index<0||s.index>7||
       (s.signal!==0&&s.signal!==1)||seen.has(s.index))throw new TypeError('invalid sensed bit');
    seen.add(s.index);
  }
  const p=donorIndices.map((index)=>{
    const group=Math.floor(index/4);
    const groupSeen=view.sensed.filter(v=>Math.floor(v.index/4)===group);
    const sum=view.parentTotals[group];
    if(!Number.isInteger(sum)||sum<0||sum>4)throw new TypeError('invalid coarse total');
    const remaining=sum-groupSeen.reduce((acc,v)=>acc+v.signal,0);
    if(remaining<0||remaining>4-groupSeen.length)throw new TypeError('inconsistent observation');
    const direct=groupSeen.find(v=>v.index===index);
    return direct?direct.signal:remaining/(4-groupSeen.length);
  });
  const q=[(1-p[0])*(1-p[1]),p[0]*(1-p[1])+(1-p[0])*p[1],p[0]*p[1]];
  if(q.some(x=>!Number.isFinite(x)||x<0||x>1))throw new Error('invalid posterior');
  return q;
}
function classification(q){
  let winner=0;
  for(let i=1;i<q.length;i++)if(q[i]>q[winner]+1e-14)winner=i;
  return winner;
}
function shannon(q){return q.reduce((h,p)=>p>0?h-p*Math.log2(p):h,0);}
function summarize(rows){
  let correct=0,entropy=0,logLoss=0,mae=0;
  for(const x of rows){
    correct+=Number(x.pred===x.target);
    entropy+=shannon(x.posterior);
    logLoss+= -Math.log2(x.posterior[x.target]);
    mae+=Math.abs(x.pred-x.target);
  }
  return {accuracy:correct/rows.length,entropyBits:entropy/rows.length,
    logLossBits:logLoss/rows.length,mae:mae/rows.length};
}
/**
 * Exhaustive evaluation of one fixed donor geometry and sensor budget.
 * No learned model, training labels or reserved-test tuning. The target signal
 * and all posterior probabilities are computed from fixed declared rules.
 * Permutation is a physical-index relabel within each original parent.
 */
export function cosmo03Score({
  a=3,b=0,budget=2,policy='fixed',seed=369,permutation=null
}={}){
  const originalDonors=pairIndices(a,b);
  const originalSensors=cosmo03Sensors(policy,budget,a,b,seed);
  const perm=checkedPermutation(permutation);
  const donors=originalDonors.map(i=>perm[i]);
  const sensors=originalSensors.map(i=>perm[i]);
  const flatRows=[],nestedRows=[];
  let mismatches=0;
  let mismatchWitness=null;
  for(let mask=0;mask<256;mask++){
    const permuted=applyPermutation(decode(mask),perm);
    const flat=flatModel(permuted,donors);
    const nested=nestedModel(permuted,donors);
    const f=cosmo03Posterior(flatView(flat,sensors),donors);
    const n=cosmo03Posterior(nestedView(nested,sensors),donors);
    const fy=flatLabel(flat),ny=nestedLabel(nested);
    const fp=classification(f),np=classification(n);
    if(fy!==ny||fp!==np||f.some((v,i)=>Math.abs(v-n[i])>1e-12)){
      mismatches++;
      if(!mismatchWitness)mismatchWitness={mask,flat:f,nested:n,flatLabel:fy,nestedLabel:ny};
    }
    flatRows.push({posterior:f,pred:fp,target:fy});
    nestedRows.push({posterior:n,pred:np,target:ny});
  }
  return {
    authority:COSMO03_AUTHORITY,donorPair:[a,b],
    split:COSMO03_RESERVED_PAIRS.includes(a+':'+b)?'reserved':'development',
    policy,budget,seed,observerCostBits:sensors.length,sensors,permutation:perm,
    states:256,flat:summarize(flatRows),nested:summarize(nestedRows),
    mismatchCount:mismatches,mismatchWitness
  };
}
export function cosmo03Example(mask=165,a=3,b=0){
  const donors=pairIndices(a,b),bits=decode(mask);
  const flat=flatModel(bits,donors),nested=nestedModel(bits,donors);
  const flatBytes=new TextEncoder().encode(JSON.stringify(flat)).length;
  const nestedBytes=new TextEncoder().encode(JSON.stringify(nested)).length;
  return {flat,nested,flatJsonBytes:flatBytes,nestedJsonBytes:nestedBytes,
    differenceBytes:nestedBytes-flatBytes,
    caveat:'Illustrative serialized JSON payload only, not RAM/VRAM or inference complexity'};
}
export function cosmo03Report({seed=369}={}){
  validInteger(seed,0,4294967295,'random seed');
  const results=[];
  for(const label of COSMO03_LABELS){
    const [a,b]=label.split(':').map(Number);
    for(const budget of COSMO03_BUDGETS){
      for(const policy of COSMO03_POLICIES){
        results.push(cosmo03Score({a,b,budget,policy,seed}));
      }
    }
  }
  const violations=results.filter(r=>r.mismatchCount||
    Math.abs(r.flat.accuracy-r.nested.accuracy)>1e-12 ||
    Math.abs(r.flat.entropyBits-r.nested.entropyBits)>1e-12);
  const reserved=results.filter(r=>r.split==='reserved');
  return {
    authority:COSMO03_AUTHORITY,
    population:'16 donor geometries x 3 sensor budgets x 3 predeclared policies x 256 masks',
    seed,initialTokens:8,modeledChildTokens:2,conditions:results.length,
    stateEvaluationsPerRepresentation:results.length*256,
    reservedGeometryCount:COSMO03_RESERVED_PAIRS.length,
    reservedConditions:reserved.length,
    parityViolations:violations.length,
    source:'analytic posterior with uniform finite prior; NO trained candidate and NO new physical theory',
    exampleJsonStorage:cosmo03Example(),
    results
  };
}
