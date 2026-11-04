/**
 * R15 synthetic discovery/holdout evaluation for Bio-Lattice.
 *
 * This is a disjoint pseudo-random seed split over mathematical toy models,
 * never a biological experiment, physical calibration or consciousness test.
 * Selection only receives training seeds; holdout is evaluated once at the
 * frozen selected setting. Nothing here changes authority or hardware.
 */
import {simulateBioLattice} from './bioLattice.js';
import {simulateMarkovTransport,runBioLatticeStudy,SWEEP_GRID} from './bioLatticeStudy.js';

export const BIO_HOLDOUT_SCHEMA='altermath.bio-lattice.holdout.v1';
export const HOLDOUT_OFFSET=10003;
export const BOOTSTRAP_RESAMPLES=256;
export const HOLDOUT_DEFAULTS=Object.freeze({
  rings:18,protofilaments:13,coupling:0.38,disorder:0.15,loss:0.008,steps:32
});
const METRICS=['hopping','amplitude','markov'];
const TOLERANCE=1e-10;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const sign=value=>value>TOLERANCE?1:value< -TOLERANCE?-1:0;
const countSigns=values=>({
  positive:values.filter(value=>sign(value)>0).length,
  negative:values.filter(value=>sign(value)<0).length,
  ties:values.filter(value=>sign(value)===0).length
});

function validate({base,sweepKey,startSeed,trainingSeeds,holdoutSeeds}){
  if(!Object.hasOwn(SWEEP_GRID,sweepKey))throw new RangeError('Unknown sweep dimension');
  if(![3,6,9].includes(trainingSeeds)||![3,6,9].includes(holdoutSeeds))
    throw new RangeError('Training and holdout counts must be 3, 6, or 9');
  if(!Number.isSafeInteger(startSeed)||startSeed<0||
     startSeed>2147483647-HOLDOUT_OFFSET-holdoutSeeds)
    throw new RangeError('Starting seed is not within the disjoint split range');
  if(!base||typeof base!=='object'||Array.isArray(base))
    throw new RangeError('Base parameters must be an object');
  const allowed=Object.keys(HOLDOUT_DEFAULTS);
  if(Object.keys(base).some(key=>!allowed.includes(key)))
    throw new RangeError('Unexpected base parameter');
  const frozen={...HOLDOUT_DEFAULTS,...base};
  // The actual step count must be checked before any simulator loop, even
  // if the source reference implementation changes later.
  if(!Number.isInteger(frozen.steps)||frozen.steps<0||frozen.steps>120)
    throw new RangeError('steps must be an integer from 0 through 120');
  simulateBioLattice({...frozen,mode:'hopping',seed:startSeed});
  return frozen;
}
function modelRuns(config,seed){
  const args={...config,seed};
  const runs={
    hopping:simulateBioLattice({...args,mode:'hopping'}).metrics,
    amplitude:simulateBioLattice({...args,mode:'amplitude'}).metrics,
    markov:simulateMarkovTransport(args).metrics
  };
  return {seed,runs,
    amplitudeMinusMarkov:runs.amplitude.axialSpreadSites-runs.markov.axialSpreadSites,
    hoppingMinusMarkov:runs.hopping.axialSpreadSites-runs.markov.axialSpreadSites};
}
function percentileRange(values,seed){
  let state=(seed>>>0)||1;
  const draw=()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)/4294967296;
  };
  const replicates=[];
  for(let b=0;b<BOOTSTRAP_RESAMPLES;b++){
    let total=0;
    for(let i=0;i<values.length;i++)total+=values[Math.floor(draw()*values.length)];
    replicates.push(total/values.length);
  }
  replicates.sort((a,b)=>a-b);
  return [replicates[Math.floor(0.025*(replicates.length-1))],
    replicates[Math.ceil(0.975*(replicates.length-1))]];
}
function nullControl(base,seedValues,name,change){
  const settings={...base,...change};
  const records=seedValues.map(seed=>modelRuns(settings,seed));
  const maxAbsoluteSpread=Math.max(...records.flatMap(row=>
    METRICS.map(mode=>Math.abs(row.runs[mode].axialSpreadSites))));
  return {
    name,settings:change,seeds:[...seedValues],maxAbsoluteSpread,
    passed:maxAbsoluteSpread<=TOLERANCE
  };
}

export function runBioLatticeHoldout({
  base=HOLDOUT_DEFAULTS,sweepKey='disorder',startSeed=369,
  trainingSeeds=3,holdoutSeeds=3
}={}){
  const frozen=validate({base,sweepKey,startSeed,trainingSeeds,holdoutSeeds});
  const trainSeedValues=Array.from({length:trainingSeeds},(_,i)=>startSeed+i);
  const holdSeedValues=Array.from({length:holdoutSeeds},(_,i)=>startSeed+HOLDOUT_OFFSET+i);
  // Selection uses only train seeds. The train-only R14 result contains no
  // holdout configuration and cannot access the disjoint holdout seed values.
  const discovery=runBioLatticeStudy({
    base:frozen,sweepKey,startSeed,seedCount:trainingSeeds
  });
  const candidates=discovery.rows.map(row=>({
    sweepValue:row.sweepValue,meanDelta:row.amplitudeMinusMarkovMean,
    range:[...row.amplitudeMinusMarkovRange],signs:{...row.pairedSeedSigns},
    bySeed:row.perSeed.map(entry=>({
      seed:entry.seed,amplitudeMinusMarkov:entry.amplitudeMinusMarkov,
      axialSpread:{
        hopping:entry.hopping.axialSpreadSites,
        amplitude:entry.amplitude.axialSpreadSites,
        markov:entry.markov.axialSpreadSites
      }
    }))
  }));
  // Prespecified highest absolute mean gap. Ties favor the first grid value.
  // No tuning by holdout performance, bootstrap interval or null controls.
  let selectedIndex=0;
  for(let i=1;i<candidates.length;i++){
    if(Math.abs(candidates[i].meanDelta)>
       Math.abs(candidates[selectedIndex].meanDelta)+1e-12)selectedIndex=i;
  }
  const selected=candidates[selectedIndex];
  const holdoutSetting={...frozen,[sweepKey]:selected.sweepValue};
  const held=holdSeedValues.map(seed=>modelRuns(holdoutSetting,seed));
  const deltas=held.map(x=>x.amplitudeMinusMarkov);
  const holdoutMean=mean(deltas);
  const trainSign=sign(selected.meanDelta),holdoutSign=sign(holdoutMean);
  const status=trainSign===0?'NO_TRAIN_DIRECTION':
    holdoutSign===0?'HOLDOUT_TIE':
    trainSign===holdoutSign?'DIRECTION_RETAINED':'DIRECTION_REVERSED';
  const expectedSurvival=(1-holdoutSetting.loss)**holdoutSetting.steps;
  const survivalMaxError=Math.max(...held.flatMap(sample=>METRICS.map(mode=>
    Math.abs(sample.runs[mode].survival-expectedSurvival))));
  const controlList=[
    nullControl(frozen,holdSeedValues,'zero_coupling',{coupling:0}),
    nullControl(frozen,holdSeedValues,'zero_steps',{steps:0})
  ];
  return {
    schema:BIO_HOLDOUT_SCHEMA,
    evidenceClass:'synthetic_disjoint_seed_replay_only',
    input:{
      base:{...frozen},sweepKey,grid:[...SWEEP_GRID[sweepKey]],
      startSeed,trainingSeeds,holdoutSeeds,holdoutOffset:HOLDOUT_OFFSET,
      selectionRule:'train_only_max_absolute_mean_amplitude_minus_markov_tie_lowest_index',
      bootstrapResamples:BOOTSTRAP_RESAMPLES
    },
    training:{
      seeds:trainSeedValues,candidates,selectedIndex,
      selectedValue:selected.sweepValue,selectedMeanDelta:selected.meanDelta
    },
    holdout:{
      seeds:holdSeedValues,selectedConfiguration:holdoutSetting,
      perSeed:held.map(entry=>({
        seed:entry.seed,amplitudeMinusMarkov:entry.amplitudeMinusMarkov,
        hoppingMinusMarkov:entry.hoppingMinusMarkov,
        axialSpread:Object.fromEntries(METRICS.map(mode=>
          [mode,entry.runs[mode].axialSpreadSites])),
        survival:Object.fromEntries(METRICS.map(mode=>
          [mode,entry.runs[mode].survival]))
      })),
      meanDelta:holdoutMean,
      minDelta:Math.min(...deltas),
      maxDelta:Math.max(...deltas),
      pairedSeedSigns:countSigns(deltas),
      bootstrapMeanPercentileRange:percentileRange(deltas,
        (startSeed ^ 0x9e3779b9 ^ selectedIndex)>>>0),
      directionalStatus:status
    },
    controls:controlList,
    diagnostics:{
      disjointSeeds:trainSeedValues.every(seed=>!holdSeedValues.includes(seed)),
      uniqueSeeds:new Set([...trainSeedValues,...holdSeedValues]).size,
      survivalMaxError,
      nullControlsPassed:controlList.every(control=>control.passed),
      heldoutGridEvaluations:1,
      holdoutCaseCount:held.length
    },
    limitations:[
      'Holdout seeds are disjoint pseudo-random initial disorder fields, not independent biological samples.',
      'Only one training-selected grid point is evaluated on holdout; no heldout grid search.',
      'The bootstrap interval resamples synthetic seed differences only. It is not a biological or population confidence interval.',
      'Same-direction holdout does not establish quantum coherence, physical transport advantage, experimental validation, or consciousness.',
      'Numerical models share arbitrary dimensionless couplings, update assumptions and a seeded disorder field.',
      'Null controls are model invariants, not experimental negative controls.',
      'No hardware, real optical links, kernels, motors, sensors or network authority are exercised.'
    ]
  };
}
