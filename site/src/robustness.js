/**
 * Rung 11: locked-selection robustness matrix for the adaptive junction model.
 *
 * A single Rung 8 train split selects a fixed starting set before any stress
 * profile is evaluated. All controls share each holdout seed's initial state.
 * Switching fees are rescored analytically without rerunning trajectories,
 * preventing fee choices from contaminating the test scenarios.
 */
import {runAblation} from './ablation.js';
import {chooseJunctions,HOLDOUT_GAP} from './selection.js';
import {runControllerTrial,validateController} from './controller.js';

export const ROBUSTNESS_SCHEMA='Altermath.JunctionRobustness.v1';
export const STRESS_PROFILES=Object.freeze([
  Object.freeze({id:'reference',label:'Reference',gain:1.9,revocationStart:60,revocationEnd:110,change:'baseline'}),
  Object.freeze({id:'weaker',label:'Weaker coupling',gain:0.9,revocationStart:60,revocationEnd:110,change:'gain only'}),
  Object.freeze({id:'stronger',label:'Stronger coupling',gain:2.7,revocationStart:60,revocationEnd:110,change:'gain only'}),
  Object.freeze({id:'early',label:'Earlier revocation',gain:1.9,revocationStart:25,revocationEnd:75,change:'schedule only'}),
  Object.freeze({id:'late',label:'Later revocation',gain:1.9,revocationStart:105,revocationEnd:155,change:'schedule only'})
]);
export const SWITCH_FEES=Object.freeze([0,0.002,0.01]);
export const METHODS=Object.freeze([
  Object.freeze({id:'adaptive',label:'Adaptive phase-score'}),
  Object.freeze({id:'frozen',label:'Frozen trained'}),
  Object.freeze({id:'rotating',label:'Rotating priority'}),
  Object.freeze({id:'shuffled',label:'Static shuffled'})
]);
const average=arr=>arr.reduce((sum,x)=>sum+x,0)/arr.length;
const ensureInt=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const signCount=values=>({
  positive:values.filter(x=>x>1e-12).length,
  negative:values.filter(x=>x < -1e-12).length,
  tied:values.filter(x=>Math.abs(x)<=1e-12).length
});
function settings(input) {
  const p={startSeed:369,trainingSeeds:3,holdoutSeeds:3,budget:6,
    warmup:60,horizon:180,selectionEvery:12,minDwell:12,maxSwaps:2,...input};
  if(!ensureInt(p.startSeed,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER) ||
    !ensureInt(p.trainingSeeds,1,9) || !ensureInt(p.holdoutSeeds,1,9) ||
    !ensureInt(p.budget,0,12) || !ensureInt(p.warmup,0,2000) ||
    !ensureInt(p.horizon,160,300) || !ensureInt(p.selectionEvery,1,100) ||
    !ensureInt(p.minDwell,0,300) || !ensureInt(p.maxSwaps,0,12) ||
    !Number.isSafeInteger(p.startSeed+p.trainingSeeds-1) ||
    !Number.isSafeInteger(p.startSeed+HOLDOUT_GAP+p.holdoutSeeds-1) ||
    p.startSeed+p.trainingSeeds-1>=p.startSeed+HOLDOUT_GAP)
    throw new RangeError('Invalid robustness settings');
  return p;
}
function scoredDifference(a,b,fee) {
  return a.meanOrder-b.meanOrder-fee*(a.activations-b.activations);
}
function comparison(a,b,fee) {
  const bySeed=a.trials.map((trial,i)=>{
    const other=b.trials[i];
    if(trial.seed!==other.seed)throw new Error('Unpaired seed detected');
    return {seed:trial.seed,delta:scoredDifference(trial,other,fee)};
  });
  const d=bySeed.map(x=>x.delta);
  return {
    meanDelta:average(d),minDelta:Math.min(...d),maxDelta:Math.max(...d),
    ...signCount(d),bySeed
  };
}
export function runRobustness(input={}) {
  const p=settings(input);
  const training=runAblation({startSeed:p.startSeed,seedCount:p.trainingSeeds,
    warmup:p.warmup,horizon:140,gain:1.9});
  const selected=chooseJunctions(training,p.budget);
  const holdouts=Array.from({length:p.holdoutSeeds},(_,i)=>p.startSeed+HOLDOUT_GAP+i);
  const scenarios=STRESS_PROFILES.map(profile=>{
    const config={...p,...profile,switchCost:0};
    // Verify the exact same initial selected junctions in every profile.
    const methods=METHODS.map(method=>{
      const trials=holdouts.map(seed=>runControllerTrial(seed,method.id,selected,config));
      if(trials.some(t=>t.policyViolations!==0 ||
        t.maxActive>p.budget || t.averageActive>p.budget+1e-12))
        throw new Error('Permission or budget invariant violated');
      return {id:method.id,label:method.label,
        meanOrder:average(trials.map(x=>x.meanOrder)),
        meanActivations:average(trials.map(x=>x.activations)),
        meanActive:average(trials.map(x=>x.averageActive)),
        maxActive:Math.max(...trials.map(x=>x.maxActive)),
        policyViolations:trials.reduce((n,x)=>n+x.policyViolations,0),
        exampleTrace:trials[0].trace,
        trials:trials.map(t=>({
          seed:t.seed,preFault:t.preFault,postFault:t.postFault,
          meanOrder:t.meanOrder,finalOrder:t.finalOrder,
          activations:t.activations,forcedDrops:t.forcedDrops,
          averageActive:t.averageActive,policyViolations:t.policyViolations
        }))};
    });
    // Paired initializations are an experimental invariant, not a displayed guess.
    for(let i=0;i<holdouts.length;i++){
      if(new Set(methods.map(m=>m.trials[i].preFault)).size!==1 ||
         new Set(methods.map(m=>m.trials[i].postFault)).size!==1)
        throw new Error('Control arms started from different states');
    }
    const lookup=id=>methods.find(m=>m.id===id);
    const costs=SWITCH_FEES.map(fee=>({
      fee,
      adaptiveVsFrozen:comparison(lookup('adaptive'),lookup('frozen'),fee),
      adaptiveVsRotating:comparison(lookup('adaptive'),lookup('rotating'),fee),
      adaptiveVsShuffled:comparison(lookup('adaptive'),lookup('shuffled'),fee)
    }));
    return {id:profile.id,label:profile.label,change:profile.change,
      gain:profile.gain,revocationStart:profile.revocationStart,
      revocationEnd:profile.revocationEnd,
      methods,costs};
  });
  const rollup=SWITCH_FEES.map(fee=>{
    const rows=scenarios.map(s=>s.costs.find(x=>x.fee===fee).adaptiveVsFrozen);
    return {fee,meanAcrossProfiles:average(rows.map(x=>x.meanDelta)),
      profilesPositive:rows.filter(x=>x.meanDelta>1e-12).length,
      profilesNegative:rows.filter(x=>x.meanDelta < -1e-12).length,
      profilesTied:rows.filter(x=>Math.abs(x.meanDelta)<=1e-12).length,
      worstProfile:scenarios[rows.findIndex(x=>x.meanDelta===Math.min(...rows.map(y=>y.meanDelta)))].id};
  });
  return {
    schema:ROBUSTNESS_SCHEMA,
    setup:{...p,holdoutSeeds:holdouts,trainingSeeds:Array.from(
      {length:p.trainingSeeds},(_,i)=>p.startSeed+i)},
    selection:{fixedStartingJunctions:selected,trainedAtGain:1.9},
    switchFees:[...SWITCH_FEES],
    scenarios,rollup,
    limitations:[
      'One graph, one fixed set of five preregistered synthetic stresses, and a single train/holdout split.',
      'This matrix does not tune on holdout seeds or modify trained junctions between profiles.',
      'Each stress profile changes exactly one factor relative to reference: gain or revocation schedule.',
      'Budget controls cap active cross-links, not the exact average number active per method.',
      'Switch fees are artificial coherence-score penalties, not physical power, dollars, or network latency.',
      'Outcomes are simulated oscillator behavior, not measurements of consciousness or new physics.'
    ]
  };
}
