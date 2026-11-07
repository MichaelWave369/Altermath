/**
 * R25 / POLY-02: exact finite robustness checks for R24's polyhedral Keyhole.
 * Every state and every result is synthetic. No physical system is modeled.
 *
 * Important: graph "vertices" are *original solid faces*; the topology is
 * their dual face-adjacency graph.  The controls preserve count/degree and
 * connectivity, not isomorphism class or every geometric invariant.
 */
import {
  POLYHEDRA, makePolyhedralGraph, degreePreservingControl, graphEdges, validateGraph,
} from './polyhedralKeyhole.js';

export const RULES=Object.freeze([
  {id:'majority',label:'Neighbor majority',description:'All adjacent pockets vote; strict majority wins.'},
  {id:'parity',label:'Neighbor parity',description:'Product of neighboring signs. Odd degree preserves global sign reversal.'},
  {id:'inertia',label:'Majority with inertia',description:'Neighbors and self vote; tied votes retain the previous self-state.'},
  {id:'identity',label:'Identity (null control)',description:'No changes to pocket states. The observed future equals the present.'},
]);

export const PRIORS=Object.freeze([0.25,0.5,0.75]);

function validateParams({rule,prior,seed,controls}){
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unsupported update rule');
  if(!Number.isFinite(prior)||prior<=0||prior>=1)throw new RangeError('Prior must be strictly between 0 and 1');
  if(!Number.isSafeInteger(seed)||seed<1||seed>100000)throw new RangeError('Seed must be between 1 and 100000');
  if(!Number.isSafeInteger(controls)||controls<1||controls>16)throw new RangeError('Control count must be 1..16');
}
function popcount(mask){
  let bits=0;
  while(mask){mask&=mask-1;bits++;}
  return bits;
}
function bitSign(mask,index){return ((mask>>>index)&1)?1:-1;}
function advanceValidated(neighbors,mask,rule){
  const n=neighbors.length;
  if(rule==='identity')return mask;
  let output=0;
  for(let i=0;i<n;i++){
    let vote=0,parity=1;
    for(const neighbor of neighbors[i]){
      const value=bitSign(mask,neighbor);
      vote+=value;parity*=value;
    }
    const self=bitSign(mask,i);
    let next;
    if(rule==='majority')next=vote>0?1:-1;
    else if(rule==='parity')next=parity;
    else if(rule==='inertia'){
      const joint=vote+self;
      next=joint>0?1:joint<0?-1:self;
    }else throw new RangeError('Unsupported update rule');
    if(next===1)output|=1<<i;
  }
  return output;
}
export function stepPocketState(graph,mask,rule='majority'){
  validateGraph(graph);
  if(!Number.isSafeInteger(mask)||mask<0||mask>=2**graph.neighbors.length)
    throw new RangeError('Invalid pocket mask');
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unsupported update rule');
  return advanceValidated(graph.neighbors,mask,rule);
}

/**
 * H(Y|M) with M = current sum and Y = next sum.
 * The probability of full state X is p^(#positive) (1-p)^(#negative).
 * This enumerates all 2^n configurations; no Monte Carlo approximation.
 */
export function exactWeightedKeyhole(graph,{rule='majority',prior=0.5}={}){
  validateGraph(graph);
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unsupported update rule');
  if(!Number.isFinite(prior)||prior<=0||prior>=1)throw new RangeError('Prior must be strictly between 0 and 1');
  const n=graph.neighbors.length;
  const buckets=new Map(),samples=2**n;
  let totalProbability=0;
  for(let mask=0;mask<samples;mask++){
    const ones=popcount(mask);
    const p=prior**ones*(1-prior)**(n-ones);
    totalProbability+=p;
    const observed=2*ones-n;
    const futureMask=advanceValidated(graph.neighbors,mask,rule);
    const future=2*popcount(futureMask)-n;
    if(!buckets.has(observed))buckets.set(observed,{weight:0,next:new Map(),count:0});
    const bucket=buckets.get(observed);
    bucket.weight+=p;
    bucket.count++;
    bucket.next.set(future,(bucket.next.get(future)||0)+p);
  }
  let bits=0;
  const distribution=[...buckets.entries()].sort((a,b)=>a[0]-b[0]).map(([observed,b])=>{
    const outcomes=[...b.next.entries()].sort((a,c)=>a[0]-c[0]).map(([next,weight])=>{
      const conditional=weight/b.weight;
      bits-=weight*Math.log2(conditional);
      return {next,weight,conditional};
    });
    return {observed,weight:b.weight,count:b.count,outcomes};
  });
  return {
    rule,prior,pockets:n,samples,probabilityMass:totalProbability,
    conditionalEntropyBits:Math.max(0,bits),distribution,
  };
}
function graphFingerprint(graph){
  return graphEdges(graph).map(([a,b])=>a+':'+b).join('|');
}
function stats(xs){
  if(!xs.length)throw new RangeError('Empty comparison');
  const mean=xs.reduce((a,b)=>a+b,0)/xs.length;
  return {mean,min:Math.min(...xs),max:Math.max(...xs)};
}
/** Controlled at constant node count, degree, connectivity, rule, prior and state support. */
export function runPoly02({
  id='octahedron',rule='majority',prior=0.5,seed=369,controls=8,
}={}){
  validateParams({rule,prior,seed,controls});
  const spec=POLYHEDRA.find(x=>x.id===id);
  if(!spec)throw new RangeError('Unsupported polyhedron');
  const graph=makePolyhedralGraph(id),baseline=exactWeightedKeyhole(graph,{rule,prior});
  const sourceFingerprint=graphFingerprint(graph);
  const alternatives=Array.from({length:controls},(_,index)=>{
    const controlSeed=seed+index*101;
    const rewired=degreePreservingControl(graph,controlSeed);
    const entropy=exactWeightedKeyhole(rewired,{rule,prior});
    return {
      seed:controlSeed,
      graphFingerprint:graphFingerprint(rewired),
      changedLabelledEdges:graphFingerprint(rewired)!==sourceFingerprint,
      entropyBits:entropy.conditionalEntropyBits,
      graph:rewired,
    };
  });
  const values=alternatives.map(x=>x.entropyBits);
  const controlStats=stats(values);
  const distinctLabelledControls=new Set(alternatives.map(x=>x.graphFingerprint)).size;
  return {
    protocol:'POLY-02',version:1,
    evidence:'EXACT FINITE SYNTHETIC',authority:'NONE',
    id,rule,prior,seed,controlCount:controls,
    graph,baseline,alternatives,controlStats,
    deltaBits:baseline.conditionalEntropyBits-controlStats.mean,
    distinctLabelledControls,
    unchangedControls:alternatives.filter(x=>!x.changedLabelledEdges).length,
    limitations:[
      'Matched graph size and degree do not ensure matching motif counts, graph distances or isomorphism class.',
      'Different original polyhedra have different node counts, so cross-size trends are descriptive only.',
      'The uniform or independent Bernoulli prior and update laws are modeled assumptions, not empirical facts.',
      'Controls are fixed-seed examples, not an exhaustive or statistically representative graph ensemble.',
      'K4 has no non-isomorphic simple connected 3-regular alternative with four vertices.',
      'Entropy measures prediction information lost by the aggregate Keyhole, not quality or intelligence.',
    ],
  };
}
/** A compact fixed factorial grid. Each cell gets the same eight control seeds. */
export function poly02Sweep({id='octahedron',seed=369,controls=8}={}){
  return {
    protocol:'POLY-02',id,seed,controls,
    rows:RULES.flatMap(rule=>PRIORS.map(prior=>{
      const study=runPoly02({id,rule:rule.id,prior,seed,controls});
      return {
        rule:rule.id,prior,canonicalBits:study.baseline.conditionalEntropyBits,
        matchedControlMeanBits:study.controlStats.mean,
        deltaBits:study.deltaBits,
      };
    })),
  };
}
