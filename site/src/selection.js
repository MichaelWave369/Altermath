/**
 * Rung 9. Budget-limited selection of authorized, synthetic junctions.
 *
 * TRAIN: marginal full-graph ablations from Rung 8 over one seed split.
 * TEST: unseen holdout seeds with the same states across every method.
 * This is an offline, fixed-subset heuristic, not online adaptation.
 */
import {buildTopology,createWorld,coherence,disturb,stepWorld} from './model.js';
import {junctionCatalogue,runAblation} from './ablation.js';

export const SELECTION_SCHEMA='Altermath.JunctionSelection.v1';
export const HOLDOUT_GAP=10000;
const catalog=junctionCatalogue();
const validNum=(n,a,b)=>typeof n==='number' && Number.isFinite(n) && n>=a && n<=b;
const mean=arr=>arr.reduce((s,n)=>s+n,0)/arr.length;
const sortedIds=catalog.map(x=>x.id).sort();
const edgeAllowed=new Set(sortedIds);
const intRange=(n,a,b)=>Number.isSafeInteger(n) && n>=a && n<=b;
const idSet=ids=>{
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||
    ids.some(x=>typeof x!=='string'||!edgeAllowed.has(x)))throw new TypeError('Invalid junction selection');
  return new Set(ids);
};

function config(input={}) {
  const p={startSeed:369,trainingSeeds:3,holdoutSeeds:3,budget:6,
    warmup:60,horizon:140,gain:1.9,...input};
  if(!Number.isSafeInteger(p.startSeed) ||
     !intRange(p.trainingSeeds,1,9)||!intRange(p.holdoutSeeds,1,9)||
     !intRange(p.budget,0,12)||!intRange(p.warmup,0,2000)||
     !intRange(p.horizon,1,2000)||!validNum(p.gain,0,5)||
     !Number.isSafeInteger(p.startSeed+p.trainingSeeds-1)||
     !Number.isSafeInteger(p.startSeed+HOLDOUT_GAP+p.holdoutSeeds-1))
    throw new RangeError('Invalid junction selection configuration');
  const trainLast=p.startSeed+p.trainingSeeds-1;
  const testStart=p.startSeed+HOLDOUT_GAP;
  if(trainLast>=testStart)throw new RangeError('Training and holdout seed ranges overlap');
  return p;
}
function shuffle(data,seed) {
  let state=seed>>>0;
  const arr=[...data];
  for(let i=arr.length-1;i>0;i--){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=Math.floor(state/4294967296*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
export function chooseJunctions(trainingReport,budget) {
  if(!intRange(budget,0,12) || !trainingReport || !Array.isArray(trainingReport.ranked))
    throw new TypeError('Invalid training evidence or junction budget');
  const rows=trainingReport.ranked;
  if(rows.length!==12||new Set(rows.map(x=>x.id)).size!==12||
     rows.some(x=>!edgeAllowed.has(x.id)||!Number.isFinite(x.meanDelta)))
    throw new TypeError('Training evidence does not cover exactly twelve authorized junctions');
  // Removing a helpful junction lowers coherence (negative delta).
  // Most negative mean delta is first: a simple marginal keep-rule.
  const priorities=[...rows].sort((a,b)=>a.meanDelta-b.meanDelta||a.id.localeCompare(b.id));
  return priorities.slice(0,budget).map(x=>x.id);
}

/** Each subset receives one identical post-disturbance world for this seed. */
export function evaluateSubset(seed,ids,opts={}) {
  const p=config({...opts,startSeed:seed,trainingSeeds:1,holdoutSeeds:1});
  const allow=idSet(ids);
  const graph=buildTopology();
  let world={...createWorld(seed),gain:p.gain};
  for(let t=0;t<p.warmup;t++)world=stepWorld(world);
  const preFault=coherence(world.phases);
  world=disturb(world,6);
  const postFault=coherence(world.phases);
  const allLinks=graph.links.filter(e=>!e.cross||allow.has(e.id));
  world={...world,links:allLinks,gate:true};
  let sum=0,final=0;
  const trace=[];
  for(let t=1;t<=p.horizon;t++){
    world=stepWorld(world);
    final=coherence(world.phases);
    sum+=final;
    if(t===1||t%10===0||t===p.horizon)
      trace.push({tick:t,order:Number(final.toFixed(9))});
  }
  return {seed,activeJunctions:allow.size,totalEdges:allLinks.length,
    preFault,postFault,meanOrder:sum/p.horizon,finalOrder:final,
    trace};
}

export function runSelection(input={}) {
  const p=config(input);
  const training=runAblation({startSeed:p.startSeed,seedCount:p.trainingSeeds,
    warmup:p.warmup,horizon:p.horizon,gain:p.gain});
  const selected=chooseJunctions(training,p.budget);
  // Both baselines have the identical number of active junctions as 'learned'.
  const first=sortedIds.slice(0,p.budget);
  const random=shuffle(sortedIds,p.startSeed+2026).slice(0,p.budget);
  const methods=[
    {id:'learned',label:'Marginal keep-rule',category:'budget-matched',ids:selected},
    {id:'fixed',label:'Fixed ID order',category:'budget-matched',ids:first},
    {id:'shuffled',label:'Seeded shuffle',category:'budget-matched',ids:random},
    {id:'full',label:'All junctions',category:'unmatched-full',ids:sortedIds},
    {id:'off',label:'No junctions',category:'unmatched-isolated',ids:[]}
  ];
  const holdoutStart=p.startSeed+HOLDOUT_GAP;
  const testSeeds=Array.from({length:p.holdoutSeeds},(_,i)=>holdoutStart+i);
  const outcomes=methods.map(method=>{
    const trials=testSeeds.map(seed=>evaluateSubset(seed,method.ids,p));
    return {...method,activeJunctions:method.ids.length,
      meanOrder:mean(trials.map(t=>t.meanOrder)),
      meanFinalOrder:mean(trials.map(t=>t.finalOrder)),
      minOrder:Math.min(...trials.map(t=>t.meanOrder)),
      maxOrder:Math.max(...trials.map(t=>t.meanOrder)),
      exampleTrace:trials[0].trace,
      trials:trials.map(({seed,preFault,postFault,meanOrder,finalOrder})=>({
        seed,preFault,postFault,meanOrder,finalOrder
      }))};
  });
  const learned=outcomes.find(x=>x.id==='learned');
  const shuffled=outcomes.find(x=>x.id==='shuffled');
  const pairedDeltas=learned.trials.map((t,i)=>t.meanOrder-shuffled.trials[i].meanOrder);
  return {
    schema:SELECTION_SCHEMA,parameters:{...p,holdoutStart},
    training:{seeds:training.trials.filter(t=>t.seed!==undefined)
      .map(t=>t.seed).filter((x,i,arr)=>arr.indexOf(x)===i).sort((a,b)=>a-b),
      priorities:[...training.ranked].sort((a,b)=>a.meanDelta-b.meanDelta||a.id.localeCompare(b.id))
        .map(x=>({id:x.id,label:x.label,removalDelta:x.meanDelta})),
      selected},
    outcomes,
    pairedComparison:{name:'learned-minus-shuffled',meanDelta:mean(pairedDeltas),
      minDelta:Math.min(...pairedDeltas),maxDelta:Math.max(...pairedDeltas),
      positive:pairedDeltas.filter(x=>x>1e-12).length,
      negative:pairedDeltas.filter(x=>x< -1e-12).length,
      ties:pairedDeltas.filter(x=>Math.abs(x)<=1e-12).length,
      bySeed:testSeeds.map((seed,i)=>({seed,delta:pairedDeltas[i]}))},
    limitations:[
      'Selection uses Rung 8 full-graph marginal effects and does not optimize all subsets.',
      'Train and holdout use different deterministic seeds. One seed split is not cross-validation.',
      'The three budget-matched methods have equal junction counts, but may differ in node degrees and network geometry.',
      'All-off and full-link references are unmatched in connection count except at budget endpoints.',
      'Scores measure synthetic oscillator synchronization, not physical energy, awareness, or spiritual laws.'
    ]
  };
}
