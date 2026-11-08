/**
 * POLY-04 / R27: held-out synthetic Keyhole forecasting with a controlled
 * observation budget. This is NOT a neural model or production router.
 *
 * For a fixed graph/rule and independent held-out state masks, every model
 * observes the aggregate M plus exactly k individually sensed pocket bits.
 * A validation-only search chooses k sensor locations. No test outcomes
 * influence model fitting or sensor selection.
 */
import {POLY03_FAMILIES,makePoly03Graph} from './polyhedralEnsemble.js';
import {RULES,stepPocketState} from './polyhedralRobustness.js';

export const FORECAST_SEEDS=Object.freeze([369,636,963]);
export const FORECAST_BUDGETS=Object.freeze([0,1,2]);
const N=8;
const ALL=(1<<N)-1;

function rng(seed){
  let value=seed>>>0||1;
  return ()=>{
    value^=value<<13;value^=value>>>17;value^=value<<5;
    return (value>>>0)/4294967296;
  };
}
function shuffled(array,seed){
  const out=[...array],random=rng(seed);
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
function popcount(value){let n=0;while(value){value&=value-1;n++;}return n;}
function validateSeed(seed){
  if(!Number.isSafeInteger(seed)||seed<1||seed>1000000)throw new RangeError('Seed must be 1..1000000');
}
function validateBudget(budget){
  if(!FORECAST_BUDGETS.includes(budget))throw new RangeError('Sensor budget must be 0, 1 or 2');
}
function validateSensors(sensors){
  if(!Array.isArray(sensors)||sensors.length>2||
     new Set(sensors).size!==sensors.length||
     sensors.some(x=>!Number.isInteger(x)||x<0||x>=N))
    throw new RangeError('Sensors must contain at most two distinct pocket indices');
}
function features(mask,sensors){
  validateSensors(sensors);
  return sensors.map(index=>(mask>>>index)&1).join('');
}
function mode(counts){
  if(!counts||counts.size===0)return 0;
  return [...counts].sort((a,b)=>b[1]-a[1]||
    Math.abs(a[0])-Math.abs(b[0])||a[0]-b[0])[0][0];
}
function addRecord(table,key,outcome){
  if(!table.has(key))table.set(key,new Map());
  const counts=table.get(key);
  counts.set(outcome,(counts.get(outcome)||0)+1);
}
function label(sample){
  return sample.nextAggregate;
}
/** An exact 128/64/64 complement-paired train/validation/test partition.
 * A state and its bitwise complement always appear in the same partition.
 */
export function makeForecastSplit(graph,{rule='majority',seed=369}={}){
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unknown update rule');
  validateSeed(seed);
  if(!graph||!Array.isArray(graph.neighbors)||graph.neighbors.length!==N)
    throw new Error('Expected an eight-pocket graph');
  const pairs=shuffled(Array.from({length:128},(_,mask)=>[mask,mask^ALL]),seed);
  const create=pairGroup=>pairGroup.flatMap(([first,second])=>[first,second].map(mask=>{
    const next=stepPocketState(graph,mask,rule);
    return {
      mask,observed:2*popcount(mask)-N,
      nextAggregate:2*popcount(next)-N,
    };
  }));
  return {
    protocol:'POLY-04',seed,rule,
    train:create(pairs.slice(0,64)),
    validation:create(pairs.slice(64,96)),
    holdout:create(pairs.slice(96)),
  };
}
/** Fits discrete empirical-mode predictors with hierarchical fallback.
 * For missing (aggregate, sensor) keys, fall back to the aggregate-only
 * training model, then to the global training mode. No test labels are read.
 */
export function fitForecast(train,sensors=[]){
  validateSensors(sensors);
  if(!Array.isArray(train)||train.length<1)throw new RangeError('Nonempty training set required');
  const aggregate=new Map(),conditional=new Map(),all=new Map();
  for(const sample of train){
    if(!Number.isInteger(sample.mask)||sample.mask<0||sample.mask>ALL||
       !Number.isInteger(sample.observed)||!Number.isInteger(sample.nextAggregate))
      throw new Error('Malformed training sample');
    addRecord(aggregate,String(sample.observed),label(sample));
    addRecord(conditional,sample.observed+'|'+features(sample.mask,sensors),label(sample));
    addRecord(all,'all',label(sample));
  }
  const globalMode=mode(all.get('all'));
  return {
    sensors:[...sensors],
    predict(sample){
      const featureKey=sample.observed+'|'+features(sample.mask,sensors);
      return mode(conditional.get(featureKey)||
        aggregate.get(String(sample.observed))||
        new Map([[globalMode,1]]));
    },
  };
}
export function scoreForecast(model,examples){
  if(!Array.isArray(examples)||examples.length===0)throw new RangeError('Empty scoring set');
  let exact=0,absoluteError=0;
  for(const sample of examples){
    const predicted=model.predict(sample);
    if(predicted===sample.nextAggregate)exact++;
    absoluteError+=Math.abs(predicted-sample.nextAggregate);
  }
  return {
    total:examples.length,
    exact,accuracy:exact/examples.length,
    mae:absoluteError/examples.length,
  };
}
export function candidateSensors(budget){
  validateBudget(budget);
  if(budget===0)return [[]];
  if(budget===1)return Array.from({length:N},(_,i)=>[i]);
  const candidates=[];
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)candidates.push([i,j]);
  return candidates;
}
/** No outcome from the holdout partition is visible to this function. */
export function selectForecastSensors(train,validation,budget){
  const candidates=candidateSensors(budget);
  let winner=null;
  for(const sensors of candidates){
    const check=scoreForecast(fitForecast(train,sensors),validation);
    if(!winner||check.accuracy>winner.validation.accuracy+1e-12||
      (Math.abs(check.accuracy-winner.validation.accuracy)<1e-12&&
       check.mae<winner.validation.mae-1e-12)){
      winner={sensors:[...sensors],validation:check};
    }
  }
  // In a tie use the first lexicographically ordered candidate.
  return winner;
}
/** Consistent random sensor control selected from a known seed without
 * consulting validation or holdout labels.
 */
function randomSensors(seed,budget){
  const choices=candidateSensors(budget);
  return choices[Math.floor(rng(seed+917)()*choices.length)];
}
function scoreWith(train,holdout,sensors){
  return scoreForecast(fitForecast(train,sensors),holdout);
}
/** One synthetic held-out evaluation per five declared graph representatives. */
export function runForecastStudy({
  rule='majority',seed=369,budget=1,
}={}){
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unknown update rule');
  validateSeed(seed);validateBudget(budget);
  const rows=POLY03_FAMILIES.map(family=>{
    const graph=makePoly03Graph(family.id);
    const split=makeForecastSplit(graph,{rule,seed});
    const baseline=scoreWith(split.train,split.holdout,[]);
    const fixed=scoreWith(split.train,split.holdout,candidateSensors(budget)[0]);
    const randomChoice=randomSensors(seed+family.labeledCount,budget);
    const random=scoreWith(split.train,split.holdout,randomChoice);
    const selected=selectForecastSensors(split.train,split.validation,budget);
    const tuned=scoreWith(split.train,split.holdout,selected.sensors);
    return {
      graphId:family.id,graphName:family.name,signature:family.signature,
      graphFingerprint:graph.neighbors.map((row,i)=>i+':'+row.join(',')).join('|'),
      partition:{train:split.train.length,validation:split.validation.length,holdout:split.holdout.length},
      budget,baseline,fixed,random,tuned,
      fixedSensors:candidateSensors(budget)[0],
      randomSensors:randomChoice,
      selectedSensors:selected.sensors,
      selectionValidation:selected.validation,
      deltaAgainstAggregate:tuned.accuracy-baseline.accuracy,
      deltaAgainstFixed:tuned.accuracy-fixed.accuracy,
    };
  });
  const average=(key)=>rows.reduce((sum,row)=>sum+row[key].accuracy,0)/rows.length;
  const means={
    aggregate:average('baseline'),fixed:average('fixed'),
    random:average('random'),tuned:average('tuned'),
  };
  return {
    protocol:'POLY-04',version:1,authority:'NONE',status:'SYNTHETIC HELDOUT',
    rule,seed,budget,means,rows,
    controls:'Three-way complement-paired split. Sensor index selected using training and validation only; final scores on untouched masks.',
    limitations:[
      'All data derive from an explicitly known deterministic toy graph update law, not an independently observed application.',
      'Aggregate M is always available; sensor budget k counts extra observed raw pocket bits, not total memory or sensing hardware cost.',
      'Using a graph to create outcome labels is not evidence that an optimized learned agent uses graph structure.',
      'Selected sensors may overfit validation; predeclared multiple seeds and negative outcomes must be reported.',
      'Evaluation covers five named graph representatives, not the full ensemble of labeled or unlabeled cubic graphs.',
      'The test-time labels are never used for fitting or choosing sensors. Report worse or equal test scores without suppression.',
      'No privacy, capability, or production-routing authority is granted.',
    ],
  };
}
export function runForecastSweep({rule='majority',budget=1}={}){
  const results=FORECAST_SEEDS.map(seed=>runForecastStudy({rule,seed,budget}));
  const allRows=results.flatMap(r=>r.rows.map(row=>({seed:r.seed,...row})));
  const avg=name=>allRows.reduce((sum,row)=>sum+row[name].accuracy,0)/allRows.length;
  return {
    protocol:'POLY-04',version:1,
    rule,budget,seeds:[...FORECAST_SEEDS],
    heldoutCases:allRows.length*64,
    conditionCount:allRows.length,
    means:{aggregate:avg('baseline'),fixed:avg('fixed'),random:avg('random'),tuned:avg('tuned')},
    results,
  };
}
