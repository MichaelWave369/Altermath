/**
 * Rung 8: counterfactual junction ablation on a deterministic 3/6/9 graph.
 *
 * Each trial forks the EXACT SAME already-evolved, already-disturbed state.
 * The only intervention is deleting one cross-layer edge (or all such edges).
 * This identifies within-model effects at the chosen time and horizon, not
 * physical causation, consciousness, or an advantage over all possible graphs.
 */
import {buildTopology,createWorld,stepWorld,disturb,coherence} from './model.js';

export const ABLATION_SCHEMA='Altermath.JunctionAblation.v1';
const network=buildTopology();
const crossEdges=Object.freeze(network.links.filter(e=>e.cross).map(e=>Object.freeze({...e})));
const mean=values=>values.reduce((sum,x)=>sum+x,0)/values.length;
const finite=(value,min,max)=>typeof value==='number' && Number.isFinite(value) && value>=min && value<=max;
const edgeLabel=(edge)=>network.nodes[edge.a].name+' / '+network.nodes[edge.b].name;

export function junctionCatalogue(){
  return crossEdges.map(edge=>({id:edge.id,a:edge.a,b:edge.b,
    label:edgeLabel(edge),fromGroup:network.nodes[edge.a].group,
    toGroup:network.nodes[edge.b].group}));
}

function parameters(input={}) {
  const p={startSeed:369,seedCount:9,warmup:60,horizon:140,gain:1.9,...input};
  if(!Number.isSafeInteger(p.startSeed)||!Number.isInteger(p.seedCount)||p.seedCount<1||p.seedCount>36||
     !Number.isSafeInteger(p.startSeed+p.seedCount-1)||
     !Number.isInteger(p.warmup)||p.warmup<0||p.warmup>2000||
     !Number.isInteger(p.horizon)||p.horizon<1||p.horizon>2000||
     !finite(p.gain,0,5))throw new RangeError('Invalid ablation parameters');
  return p;
}

function candidate(base, removedEdges, horizon) {
  const removed=new Set(removedEdges);
  let world={...base,links:base.links.filter(edge=>!removed.has(edge.id)),gate:true};
  let total=0,last=0;
  const history=[];
  for(let tick=1;tick<=horizon;tick++){
    world=stepWorld(world);
    last=coherence(world.phases);
    total+=last;
    if(tick===1 || tick%10===0 || tick===horizon)
      history.push({tick,coherence:Number(last.toFixed(9))});
  }
  return {meanCoherence:total/horizon,finalCoherence:last,
    activeEdges:world.links.length,
    activeJunctions:world.links.filter(edge=>edge.cross).length,
    trace:history};
}

/**
 * Simulates a paired intervention for one seed. Identical phases,
 * frequencies, gain, and disturbance are shared by all forks.
 * No RNG is consumed after the fork.
 */
export function ablationTrial(seed=369,options={}) {
  const p=parameters({...options,startSeed:seed,seedCount:1});
  let world=createWorld(seed);
  world={...world,gain:p.gain};
  for(let tick=0;tick<p.warmup;tick++) world=stepWorld(world);
  const preFault=coherence(world.phases);
  const shared=disturb(world,6);
  const postFault=coherence(shared.phases);
  const baseline=candidate(shared,[],p.horizon);
  const alternatives=[
    ...crossEdges.map(edge=>({id:edge.id,label:edgeLabel(edge),
      category:'single-junction',removed:[edge.id]})),
    {id:'all-off',label:'All junctions disabled',
      category:'full-isolation',removed:crossEdges.map(edge=>edge.id)}
  ];
  const outcomes=alternatives.map(item=>{
    const result=candidate(shared,item.removed,p.horizon);
    return {id:item.id,label:item.label,category:item.category,
      removedCount:item.removed.length,
      activeEdges:result.activeEdges,activeJunctions:result.activeJunctions,
      meanCoherence:result.meanCoherence,finalCoherence:result.finalCoherence,
      deltaMean:result.meanCoherence-baseline.meanCoherence,
      deltaFinal:result.finalCoherence-baseline.finalCoherence,
      trace:result.trace};
  });
  return {seed,warmup:p.warmup,horizon:p.horizon,gain:p.gain,
    preFault,postFault,
    baseline,outputs:outcomes,
    sharedState:shared.phases.slice(),sharedFrequencies:shared.frequencies.slice()};
}

function summarise(outcomes){
  const deltas=outcomes.map(v=>v.deltaMean);
  const final=outcomes.map(v=>v.deltaFinal);
  return {
    meanDelta:mean(deltas),minDelta:Math.min(...deltas),maxDelta:Math.max(...deltas),
    meanFinalDelta:mean(final),
    improved:deltas.filter(d=>d>1e-12).length,
    degraded:deltas.filter(d=>d< -1e-12).length,
    ties:deltas.filter(d=>Math.abs(d)<=1e-12).length
  };
}

export function runAblation(input={}){
  const p=parameters(input);
  const trials=Array.from({length:p.seedCount},(_,i)=>
    ablationTrial(p.startSeed+i,p));
  const catalogue=junctionCatalogue();
  const rows=[
    ...catalogue.map(edge=>({...edge,category:'single-junction'})),
    {id:'all-off',label:'All junctions disabled',category:'full-isolation'}
  ].map(edge=>{
    const data=trials.map(t=>t.outputs.find(o=>o.id===edge.id));
    if(data.some(x=>!x))throw new Error('Missing paired outcome');
    return {...edge,removedCount:data[0].removedCount,
      activeJunctions:data[0].activeJunctions,...summarise(data),
      exampleTrace:data[0].trace,exampleDelta:data[0].deltaMean};
  });
  const ranked=rows.filter(x=>x.category==='single-junction')
    .sort((a,b)=>Math.abs(b.meanDelta)-Math.abs(a.meanDelta)||a.id.localeCompare(b.id));
  const isolated=rows.find(x=>x.id==='all-off');
  return {
    schema:ABLATION_SCHEMA,
    parameters:p,
    design:'Within-seed paired counterfactual. Branch at one state, perturb ring 6, then remove exactly one junction.',
    baseline:{activeJunctions:crossEdges.length,activeEdges:network.links.length,
      meanCoherence:mean(trials.map(t=>t.baseline.meanCoherence)),
      meanFinalCoherence:mean(trials.map(t=>t.baseline.finalCoherence)),
      exampleTrace:trials[0].baseline.trace},
    ranked,
    isolated,
    trials:trials.map(t=>({seed:t.seed,preFault:t.preFault,postFault:t.postFault,
      baseline:t.baseline,outputs:t.outputs})),
    limitations:[
      'The intervention is deterministic edge deletion in one toy oscillator system, not a physical experiment.',
      'Removing a junction changes edge counts and node degrees. Each comparison pairs identical pre-intervention states, but is not degree matched after removal.',
      'Positive or negative differences depend on the chosen seed sweep, gain, horizon, and intervention time.',
      'Paired differences are descriptive. Min and max are observed trial ranges, not confidence intervals.',
      'The all-off scenario removes twelve edges and must not be compared as a matched single-edge intervention.'
    ]
  };
}
