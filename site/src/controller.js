/**
 * Rung 10 — bounded online junction controller.
 *
 * Decisions read only present oscillator phases and a local synthetic permission
 * gate. Never confers execution authority; no connection to live PhiKernel.
 * Adaptive and rotating policies start from the same Rung 9 selected set.
 */
import {buildTopology,createWorld,disturb,coherence,stepWorld} from './model.js';
import {runAblation,junctionCatalogue} from './ablation.js';
import {chooseJunctions,HOLDOUT_GAP} from './selection.js';

export const CONTROLLER_SCHEMA='Altermath.AdaptiveJunctions.v1';
const graph=buildTopology();
const junctions=junctionCatalogue();
const allIds=junctions.map(j=>j.id).sort();
const allAllowed=new Set(allIds);
const byId=new Map(graph.links.filter(e=>e.cross).map(e=>[e.id,e]));
const scoreMean=values=>values.reduce((s,v)=>s+v,0)/values.length;
const allowedInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const deterministicShuffle=(input,seed)=>{
  let state=seed>>>0; const out=[...input];
  for(let i=out.length-1;i>0;i--){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const at=Math.floor(state/4294967296*(i+1));
    [out[i],out[at]]=[out[at],out[i]];
  }
  return out;
};

export function validateController(input={}){
  const p={startSeed:369,trainingSeeds:3,holdoutSeeds:3,budget:6,
    warmup:60,horizon:180,gain:1.9,selectionEvery:12,minDwell:12,
    maxSwaps:2,revocationStart:60,revocationEnd:110,switchCost:0.002,...input};
  if(!allowedInt(p.startSeed,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)||
    !allowedInt(p.trainingSeeds,1,9)||!allowedInt(p.holdoutSeeds,1,9)||
    !allowedInt(p.budget,0,12)||!allowedInt(p.warmup,0,2000)||
    !allowedInt(p.horizon,30,1000)||!allowedInt(p.selectionEvery,1,100)||
    !allowedInt(p.minDwell,0,300)||!allowedInt(p.maxSwaps,0,12)||
    !allowedInt(p.revocationStart,1,p.horizon-2)||
    !allowedInt(p.revocationEnd,p.revocationStart+1,p.horizon-1)||
    !Number.isFinite(p.gain)||p.gain<0||p.gain>5||
    !Number.isFinite(p.switchCost)||p.switchCost<0||p.switchCost>0.1||
    !Number.isSafeInteger(p.startSeed+p.trainingSeeds-1)||
    !Number.isSafeInteger(p.startSeed+HOLDOUT_GAP+p.holdoutSeeds-1))
    throw new RangeError('Invalid controller configuration');
  return p;
}

/** Simulated Horos policy. All other 9 junctions remain eligible throughout. */
export function authorizedJunctions(tick,p){
  const revoked=tick>=p.revocationStart&&tick<p.revocationEnd;
  const blocked=revoked?new Set([allIds[0],allIds[4],allIds[8]]):new Set();
  return allIds.filter(id=>!blocked.has(id));
}

function phaseScore(world,id){
  const edge=byId.get(id);
  return Math.abs(Math.sin(world.phases[edge.b]-world.phases[edge.a]));
}

/**
 * Reconfigure using current state only. The re-evaluation is limited to
 * maxSwaps voluntary replacements per epoch; locked edges honor minDwell.
 * Denied edges are pruned regardless of dwell, and cannot be re-added.
 */
export function chooseOnline(world,current,enabledAt,epoch,p,method,seed){
  const allowed=new Set(authorizedJunctions(epoch,p));
  const retained=new Set([...current].filter(id=>allowed.has(id)));
  const selectedAt=new Map([...enabledAt].filter(([id])=>retained.has(id)));
  let forcedDrops=current.size-retained.size;
  const ranked=[...allowed].sort((a,b)=>{
    if(method==='adaptive')return phaseScore(world,b)-phaseScore(world,a)||a.localeCompare(b);
    const shuffle=deterministicShuffle([...allowed].sort(),seed+Math.imul(epoch+1,15427));
    return shuffle.indexOf(a)-shuffle.indexOf(b);
  });
  let additions=0,swaps=0;
  // Fill any empty slots, within the same bounded reconfiguration budget.
  for(const id of ranked){
    if(retained.size>=p.budget||additions>=p.maxSwaps)break;
    if(!retained.has(id)){
      retained.add(id); selectedAt.set(id,epoch);additions++;
    }
  }
  if(retained.size===p.budget && additions<p.maxSwaps){
    // Compare the target priority with the currently worst replaceable link.
    const rank=new Map(ranked.map((id,i)=>[id,i]));
    for(const id of ranked){
      if(additions>=p.maxSwaps)break;
      if(retained.has(id))continue;
      const replaceable=[...retained].filter(old=>
        epoch-(selectedAt.get(old)??0)>=p.minDwell)
        .sort((a,b)=>rank.get(b)-rank.get(a)||a.localeCompare(b));
      const worst=replaceable[0];
      if(worst===undefined||rank.get(worst)<=rank.get(id))continue;
      retained.delete(worst);selectedAt.delete(worst);
      retained.add(id);selectedAt.set(id,epoch);
      additions++;swaps++;
    }
  }
  return {selected:retained,enabledAt:selectedAt,forcedDrops,additions,swaps};
}

export function runControllerTrial(seed,method,initial,pInput={}){
  const p=validateController({...pInput,startSeed:seed,trainingSeeds:1,holdoutSeeds:1});
  const modes=['adaptive','rotating','frozen','shuffled','full','off'];
  if(!modes.includes(method))throw new RangeError('Unknown controller');
  if(!Array.isArray(initial)||new Set(initial).size!==initial.length||
     initial.some(x=>!allAllowed.has(x)))throw new TypeError('Invalid initial set');
  let world={...createWorld(seed),gain:p.gain};
  for(let t=0;t<p.warmup;t++)world=stepWorld(world);
  const preFault=coherence(world.phases);
  world=disturb(world,6);
  const postFault=coherence(world.phases);
  const desired=method==='full'?allIds:
    method==='off'?[]:method==='shuffled'?
      deterministicShuffle(allIds,seed+9109).slice(0,p.budget):initial;
  let current=new Set(desired), enabledAt=new Map([...current].map(id=>[id,0]));
  let additions=0,voluntarySwaps=0,forcedDrops=0;
  let sum=0,last=0,activeTotal=0,maxActive=0,policyViolations=0;
  const trace=[],events=[];
  for(let tick=0;tick<p.horizon;tick++){
    const policy=new Set(authorizedJunctions(tick,p));
    if(['adaptive','rotating'].includes(method)){
      for(const id of [...current]){
        if(!policy.has(id)){
          current.delete(id);enabledAt.delete(id);forcedDrops++;
          events.push({tick,type:'REVOKED',junction:id});
        }
      }
      if(tick>0&&tick%p.selectionEvery===0){
        const next=chooseOnline(world,current,enabledAt,tick,p,method,seed);
        current=next.selected;enabledAt=next.enabledAt;
        forcedDrops+=next.forcedDrops;
        additions+=next.additions;voluntarySwaps+=next.swaps;
        if(next.additions>0)events.push({tick,type:'RECONFIGURED',count:next.additions});
      }
    }
    // Frozen and full methods retain intent but are hard-gated by policy
    // at every tick, restoring links only once the policy permits them.
    const active=new Set([...current].filter(id=>policy.has(id)));
    if(active.size>p.budget&& !['full'].includes(method))
      throw new Error('Budget overflow');
    if([...active].some(id=>!policy.has(id)))policyViolations++;
    activeTotal+=active.size;maxActive=Math.max(maxActive,active.size);
    const links=graph.links.filter(e=>!e.cross||active.has(e.id));
    world=stepWorld({...world,links,gate:true});
    last=coherence(world.phases);sum+=last;
    if(tick===0||tick+1===p.horizon||(tick+1)%10===0)
      trace.push({tick:tick+1,order:Number(last.toFixed(9)),active:active.size});
  }
  const meanOrder=sum/p.horizon;
  return {seed,method,preFault,postFault,meanOrder,finalOrder:last,
    netScore:meanOrder-p.switchCost*additions,
    activations:additions,swaps:voluntarySwaps,forcedDrops,
    averageActive:activeTotal/p.horizon,maxActive,policyViolations,trace,events};
}

export function runController(input={}){
  const p=validateController(input);
  const training=runAblation({startSeed:p.startSeed,seedCount:p.trainingSeeds,
    warmup:p.warmup,horizon:140,gain:p.gain});
  const chosen=chooseJunctions(training,p.budget);
  const seeds=Array.from({length:p.holdoutSeeds},(_,i)=>p.startSeed+HOLDOUT_GAP+i);
  const modes=[
    {id:'adaptive',label:'Adaptive phase-score',category:'budgeted'},
    {id:'frozen',label:'Frozen trained selection',category:'budgeted'},
    {id:'rotating',label:'Rotating priority',category:'budgeted'},
    {id:'shuffled',label:'Static shuffled',category:'budgeted'},
    {id:'full',label:'All twelve links',category:'unmatched'},
    {id:'off',label:'No cross-links',category:'unmatched'}
  ];
  const outcomes=modes.map(method=>{
    const trials=seeds.map(seed=>runControllerTrial(seed,method.id,chosen,p));
    return {...method,meanOrder:scoreMean(trials.map(t=>t.meanOrder)),
      meanNetScore:scoreMean(trials.map(t=>t.netScore)),
      averageActive:scoreMean(trials.map(t=>t.averageActive)),
      meanActivations:scoreMean(trials.map(t=>t.activations)),
      maxActive:Math.max(...trials.map(t=>t.maxActive)),
      policyViolations:trials.reduce((sum,t)=>sum+t.policyViolations,0),
      sampleTrace:trials[0].trace,
      trials:trials.map(({seed,preFault,postFault,meanOrder,netScore,
        activations,swaps,forcedDrops,averageActive,maxActive,policyViolations})=>({
          seed,preFault,postFault,meanOrder,netScore,activations,swaps,
          forcedDrops,averageActive,maxActive,policyViolations
        }))};
  });
  const dynamic=outcomes.find(x=>x.id==='adaptive');
  const fixed=outcomes.find(x=>x.id==='frozen');
  const delta=seeds.map((seed,i)=>({
    seed,coherence:dynamic.trials[i].meanOrder-fixed.trials[i].meanOrder,
    net:dynamic.trials[i].netScore-fixed.trials[i].netScore
  }));
  return {
    schema:CONTROLLER_SCHEMA,
    parameters:{...p,holdoutSeeds:seeds},
    training:{seeds:Array.from({length:p.trainingSeeds},(_,i)=>p.startSeed+i),
      selected:chosen},
    syntheticPolicy:{blockedIds:[allIds[0],allIds[4],allIds[8]],
      revokedFrom:p.revocationStart,restoredAt:p.revocationEnd},
    outcomes,
    pairedAdaptiveVsFrozen:{
      meanCoherenceDelta:scoreMean(delta.map(x=>x.coherence)),
      meanNetDelta:scoreMean(delta.map(x=>x.net)),
      positive:delta.filter(x=>x.net>1e-12).length,
      negative:delta.filter(x=>x.net< -1e-12).length,
      tied:delta.filter(x=>Math.abs(x.net)<=1e-12).length,
      bySeed:delta
    },
    limitations:[
      'Adaptive controller is a present-state phase-gradient heuristic, not an optimal policy or actual machine intelligence.',
      'All permissions are synthetic. This module cannot grant access or interact with live PhiKernel.',
      'Dynamic policies may change node degrees and active-link counts under an equal maximum budget.',
      'The switching fee is an illustrative per-activation cost in coherence units, not physical energy or network dollars.',
      'Train and holdout are disjoint seeded states within one toy oscillator model, not field evidence.',
      'A higher coherence score does not prove a consciousness or dimensional claim.'
    ]
  };
}
