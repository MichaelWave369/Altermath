/**
 * Rung 7: deterministic controlled comparisons of the 3/6/9 oscillator model.
 * All scenarios use identical initial phases and frequencies for a given seed.
 * Canonical and rewired have the same 18 nodes, 30 edges, 12 cross-layer edges,
 * and the same degree of every node. Isolated is an explicit unmatched reference.
 */
import {buildTopology,createWorld,coherence,disturb,setGate,stepWorld} from './model.js';

export const EXPERIMENT_SCHEMA='Altermath.ThreefoldBenchmark.v1';
export const SCENARIOS=Object.freeze([
  {id:'canonical',label:'Original junctions',category:'matched'},
  {id:'rewired-a',label:'Rewired A',category:'matched'},
  {id:'rewired-b',label:'Rewired B',category:'matched'},
  {id:'isolated',label:'Isolated boundary',category:'unmatched'}
]);

function shuffle(values,seed) {
  const result=[...values]; let state=seed>>>0;
  for(let i=result.length-1;i>0;i--){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=Math.floor(state/4294967296*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
const id=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
const degree=(links,nodeCount=18)=>{
  const d=Array(nodeCount).fill(0);
  for(const e of links){d[e.a]++;d[e.b]++;}
  return d;
};

export function scenarioTopology(seed=369,scenario='canonical') {
  if(!Number.isSafeInteger(seed))throw new TypeError('Seed must be a safe integer');
  if(!SCENARIOS.some(x=>x.id===scenario))throw new RangeError('Unknown topology');
  const topology=buildTopology();
  if(scenario==='canonical' || scenario==='isolated')return topology;
  const offset=scenario==='rewired-a'?1013:6113;
  const lower=topology.links.filter(e=>e.cross && e.a<3 && e.b>=3 && e.b<9);
  const upper=topology.links.filter(e=>e.cross && e.a>=3 && e.a<9 && e.b>=9);
  if(lower.length!==6 || upper.length!==6)throw new Error('Topology drift');
  const lowerTargets=shuffle(lower.map(e=>e.b),seed+offset);
  const upperTargets=shuffle(upper.map(e=>e.b),seed+offset*3);
  const links=topology.links.filter(e=>!e.cross).map(e=>({...e}));
  for(const [originals,targets] of [[lower,lowerTargets],[upper,upperTargets]]) {
    originals.forEach((e,i)=>links.push({a:e.a,b:targets[i],id:id(e.a,targets[i]),cross:true}));
  }
  if(new Set(links.map(e=>e.id)).size!==links.length)throw new Error('Unexpected duplicate edge');
  const originalDegrees=degree(topology.links),newDegrees=degree(links);
  if(originalDegrees.some((d,i)=>d!==newDegrees[i]))throw new Error('Degree mismatch');
  return {nodes:topology.nodes,links};
}

export function simulateTrial({
  seed=369,scenario='canonical',ticks=260,faultAt=80,repairAt=130,gain=1.9
}={}) {
  if(!Number.isSafeInteger(seed) || !Number.isInteger(ticks) || ticks<20 || ticks>5000 ||
     !Number.isInteger(faultAt) || faultAt<1 || !Number.isInteger(repairAt) ||
     repairAt<=faultAt || repairAt>=ticks || !Number.isFinite(gain) || gain<0 || gain>5)
    throw new RangeError('Invalid experiment parameters');
  const topology=scenarioTopology(seed,scenario);
  let world={...createWorld(seed),links:topology.links,gain,gate:scenario!=='isolated'};
  const initialOrder=coherence(world.phases);
  let preFaultOrder=null,postShockOrder=null,orderAtRepair=null,recoveryTicks=null;
  let sumAfterRepair=0,samplesAfterRepair=0, minAfterShock=1;
  const trace=[];
  for(let tick=0;tick<ticks;tick++){
    if(tick===faultAt) {
      preFaultOrder=coherence(world.phases);
      world=disturb(world,6);
      postShockOrder=coherence(world.phases);
      minAfterShock=Math.min(minAfterShock,postShockOrder);
      if(scenario!=='isolated')world=setGate(world,false);
    }
    if(tick===repairAt) {
      orderAtRepair=coherence(world.phases);
      if(scenario!=='isolated')world=setGate(world,true);
    }
    world=stepWorld(world);
    const current=coherence(world.phases);
    if(tick>=faultAt)minAfterShock=Math.min(minAfterShock,current);
    if(tick>=repairAt) {
      sumAfterRepair+=current;samplesAfterRepair++;
      const threshold=0.9*preFaultOrder;
      if(recoveryTicks===null && current>=threshold && scenario!=='isolated')
        recoveryTicks=tick+1-repairAt;
    }
    if((tick+1)%10===0 || tick+1===ticks)
      trace.push({tick:tick+1,order:Number(current.toFixed(8))});
  }
  return {
    seed,scenario,ticks,faultAt,repairAt,gain,
    nodes:world.nodes.length,edges:world.links.length,
    crossEdges:world.links.filter(e=>e.cross).length,
    initialOrder,preFaultOrder,postShockOrder,orderAtRepair,minAfterShock,
    finalOrder:coherence(world.phases),
    meanOrderAfterRepair:sumAfterRepair/samplesAfterRepair,
    recoveryTicks,cumulativeExchangeIndex:world.energy,trace
  };
}
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
export function runBenchmark({
  startSeed=369,seedCount=9,ticks=260,faultAt=80,repairAt=130,gain=1.9
}={}) {
  if(!Number.isSafeInteger(startSeed) || !Number.isInteger(seedCount) ||
    seedCount<1 || seedCount>36)throw new RangeError('Invalid seed sweep');
  // Use exactly the same seeded state and disturbance schedule across scenarios.
  const trials=SCENARIOS.flatMap(scenario=>Array.from({length:seedCount},(_,i)=>
    simulateTrial({seed:startSeed+i,scenario:scenario.id,ticks,faultAt,repairAt,gain})));
  const scenarios=SCENARIOS.map(s=>{
    const selected=trials.filter(t=>t.scenario===s.id);
    const recovered=selected.filter(t=>t.recoveryTicks!==null);
    return {id:s.id,label:s.label,category:s.category,
      nodes:selected[0].nodes,edges:selected[0].edges,
      activeCrossEdges:s.id==='isolated'?0:selected[0].crossEdges,
      meanFinalOrder:avg(selected.map(t=>t.finalOrder)),
      meanOrderAfterRepair:avg(selected.map(t=>t.meanOrderAfterRepair)),
      meanPreFaultOrder:avg(selected.map(t=>t.preFaultOrder)),
      recoveryCount:recovered.length,
      meanRecoveryTicks:avg(recovered.map(t=>t.recoveryTicks)),
      sampleTrace:selected[0].trace};
  });
  return {schema:EXPERIMENT_SCHEMA,parameters:{startSeed,seedCount,ticks,faultAt,repairAt,gain},
    limitations:[
      'This is a toy oscillator graph, not a physical or consciousness measurement.',
      'Original and rewired cases match node degrees and edge count; isolation changes active edge count.',
      'Recovery means first post-repair synchronization >=90% of pre-fault synchronization.',
      'Graphs can differ in path length and clustering; results do not establish universal superiority.'
    ],scenarios,trials};
}
