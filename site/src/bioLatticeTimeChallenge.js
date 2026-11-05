/**
 * R18: train-only selection of a numerical observation time followed by
 * an untouched synthetic holdout evaluation at that one frozen time.
 * This is not experimental physical calibration or an external preregistration.
 */
import {simulateBioLattice} from './bioLattice.js';
import {simulateMarkovTransport} from './bioLatticeStudy.js';

export const TIME_CHALLENGE_SCHEMA='altermath.bio-lattice.time-challenge.v1';
export const CHALLENGE_TIME_GRID=Object.freeze([0,4,8,16,32,48,64]);
export const CHALLENGE_HOLDOUT_OFFSET=20011;
export const CHALLENGE_METRICS=Object.freeze(['axialSpreadSites','effectiveSites']);
export const CHALLENGE_BASELINES=Object.freeze(['markov','hopping']);
export const CHALLENGE_THRESHOLD=0.2;
const EPS=1e-10;
const AVG=xs=>xs.reduce((sum,x)=>sum+x,0)/xs.length;
const sig=x=>x>EPS?1:x< -EPS?-1:0;
const signs=xs=>({
  positive:xs.filter(x=>sig(x)>0).length,
  negative:xs.filter(x=>sig(x)<0).length,
  ties:xs.filter(x=>sig(x)===0).length
});
const defaults=Object.freeze({
  rings:18,protofilaments:13,coupling:.38,disorder:.15,loss:.008,steps:32
});
function validate({base,startSeed,trainingSeeds,holdoutSeeds,metric,baseline}){
  if(!base||typeof base!=='object'||Array.isArray(base))
    throw new RangeError('Expected base model configuration');
  const allowed=Object.keys(defaults);
  if(Object.keys(base).some(key=>!allowed.includes(key)))
    throw new RangeError('Unknown model configuration field');
  const config={...defaults,...base};
  // This rung chooses its own observation time. The R13 steps slider has
  // no effect on the frozen time grid and cannot bypass validation.
  if(!Number.isInteger(config.steps)||config.steps<0||config.steps>120)
    throw new RangeError('Unbounded or fractional steps');
  simulateBioLattice({...config,mode:'hopping',steps:0,seed:369});
  if(!Number.isSafeInteger(startSeed)||startSeed<0||
     startSeed>2147483647-CHALLENGE_HOLDOUT_OFFSET-holdoutSeeds)
    throw new RangeError('Seed range exceeds the disjoint holdout range');
  if(![3,6,9].includes(trainingSeeds)||![3,6,9].includes(holdoutSeeds))
    throw new RangeError('Seed counts must be 3, 6, or 9');
  if(!CHALLENGE_METRICS.includes(metric))
    throw new RangeError('Unrecognized numerical metric');
  if(!CHALLENGE_BASELINES.includes(baseline))
    throw new RangeError('Unrecognized comparison baseline');
  return config;
}
function simulateThree(base,seed,steps){
  const params={...base,seed,steps};
  return {
    hopping:simulateBioLattice({...params,mode:'hopping'}).metrics,
    amplitude:simulateBioLattice({...params,mode:'amplitude'}).metrics,
    markov:simulateMarkovTransport(params).metrics
  };
}
function observation(run,metric,baseline){
  const a=run.amplitude[metric],b=run[baseline][metric];
  return {
    amplitude:a,baseline:b,difference:a-b,
    hopping:run.hopping[metric],markov:run.markov[metric],
    otherBaseline:baseline==='markov'?'hopping':'markov',
    otherDifference:a-run[baseline==='markov'?'hopping':'markov'][metric],
    survival:{
      amplitude:run.amplitude.survival,
      hopping:run.hopping.survival,
      markov:run.markov.survival
    }
  };
}
function nullCheck(base,seeds,metric,baseline,name,changes,steps){
  const values=seeds.map(seed=>observation(
    simulateThree({...base,...changes},seed,steps),metric,baseline).difference);
  return {
    id:name,setting:changes,steps,seeds:[...seeds],
    maxAbsoluteGap:Math.max(...values.map(Math.abs)),
    passed:values.every(v=>Math.abs(v)<EPS)
  };
}
export function runTimeChallenge({
  base=defaults,startSeed=369,trainingSeeds=3,holdoutSeeds=3,
  metric='axialSpreadSites',baseline='markov'
}={}){
  const frozen=validate({base,startSeed,trainingSeeds,holdoutSeeds,metric,baseline});
  const train=Array.from({length:trainingSeeds},(_,i)=>startSeed+i);
  const hold=Array.from({length:holdoutSeeds},(_,i)=>
    startSeed+CHALLENGE_HOLDOUT_OFFSET+i);
  // Critical split discipline: no held-out model calls occur before
  // selectedIndex and selectedTime are frozen by the training block.
  const trainingTimeSeries=CHALLENGE_TIME_GRID.map(steps=>{
    const perSeed=train.map(seed=>{
      const run=simulateThree(frozen,seed,steps);
      const value=observation(run,metric,baseline);
      return {seed,steps,...value};
    });
    return {
      steps,meanDifference:AVG(perSeed.map(x=>x.difference)),
      meanAmplitude:AVG(perSeed.map(x=>x.amplitude)),
      meanBaseline:AVG(perSeed.map(x=>x.baseline)),
      meanHopping:AVG(perSeed.map(x=>x.hopping)),
      meanMarkov:AVG(perSeed.map(x=>x.markov)),
      signs:signs(perSeed.map(x=>x.difference)),perSeed
    };
  });
  let selectedIndex=1; // 0 ticks is a required null, never a candidate
  for(let i=2;i<trainingTimeSeries.length;i++){
    if(Math.abs(trainingTimeSeries[i].meanDifference)>
        Math.abs(trainingTimeSeries[selectedIndex].meanDifference)+EPS)
      selectedIndex=i;
  }
  const selected=trainingTimeSeries[selectedIndex];
  const held=hold.map(seed=>{
    const run=simulateThree(frozen,seed,selected.steps);
    return {seed,steps:selected.steps,...observation(run,metric,baseline)};
  });
  const differences=held.map(x=>x.difference);
  const heldoutMean=AVG(differences);
  const direction=sig(selected.meanDifference),heldoutDirection=sig(heldoutMean);
  const status=direction===0?'NO_TRAIN_DIRECTION':
    heldoutDirection===0?'HOLDOUT_TIE':
    direction===heldoutDirection?'DIRECTION_RETAINED':'DIRECTION_REVERSED';
  const survivalExpected=(1-frozen.loss)**selected.steps;
  const survivalError=Math.max(...held.flatMap(r=>
    Object.values(r.survival).map(x=>Math.abs(x-survivalExpected))));
  const controls=[
    nullCheck(frozen,hold,metric,baseline,'zero_coupling',{coupling:0},selected.steps),
    nullCheck(frozen,hold,metric,baseline,'zero_elapsed_ticks',{},0)
  ];
  return {
    schema:TIME_CHALLENGE_SCHEMA,
    evidenceClass:'synthetic_train_holdout_time_selection_only',
    protocol:{
      base:{...frozen},metric,baseline,startSeed,
      trainSeeds:[...train],holdoutSeeds:[...hold],
      holdoutOffset:CHALLENGE_HOLDOUT_OFFSET,
      observationGrid:[...CHALLENGE_TIME_GRID],
      trainingSelectionRule:'max_absolute_paired_training_mean_gap_nonzero_tick_first_index_ties',
      fixedDescriptiveGapThreshold:CHALLENGE_THRESHOLD,
      parameterFit:'none',
      externalPreregistration:false
    },
    training:{
      series:trainingTimeSeries,selectedIndex,selectedTime:selected.steps,
      selectedMeanDifference:selected.meanDifference
    },
    holdout:{
      evaluatedTime:selected.steps,perSeed:held,
      meanDifference:heldoutMean,
      minDifference:Math.min(...differences),
      maxDifference:Math.max(...differences),
      signs:signs(differences),
      directionalStatus:status,
      thresholdMet:Math.abs(heldoutMean)>=CHALLENGE_THRESHOLD,
      descriptiveDecision:
        status==='DIRECTION_RETAINED'&&Math.abs(heldoutMean)>=CHALLENGE_THRESHOLD?
        'SYNTHETIC_DIRECTION_AND_THRESHOLD_RETAINED':
        'SYNTHETIC_PREDECLARED_CRITERION_NOT_MET',
      evaluatedTimepointCount:1
    },
    controls,
    diagnostics:{
      uniqueSeeds:new Set([...train,...hold]).size,
      seedsDisjoint:train.every(seed=>!hold.includes(seed)),
      nullControlsPassed:controls.every(x=>x.passed),
      maxSurvivalError:survivalError,
      holdoutGridSwept:false
    },
    limitations:[
      'All outcomes are from numerical toy models and dimensionless time ticks, not measured microtubules.',
      'This is a fixed protocol embedded in software, not independently registered or timestamped as a scientific study.',
      'Seeded simulations share assumptions, so matching holdout signs are not independent physical replication.',
      'Selecting the largest training gap introduces winner selection; heldout testing checks it without re-selection.',
      'The fixed 0.2 threshold is a descriptive synthetic site/effective-site magnitude, not a detectability or assay threshold.',
      'Axial spread and effective sites are not the same as experimental fluorescence, transfer spectra or lifetime.',
      'No hardware, network or model deployment authority; no quantum-coherence or consciousness conclusion.'
    ]
  };
}
