/**
 * POLY-05 / R28. Synthetic leave-one-graph-family-out transfer audit.
 * Train empirical predictors on 3 canonical graphs, select sensor indices
 * from an entirely separate validation graph, and test on the fifth graph.
 * Tests also relabel the held-out graph without consulting target labels.
 * Nothing here trains an LLM or makes a production routing decision.
 */
import {POLY03_FAMILIES,makePoly03Graph} from './polyhedralEnsemble.js';
import {RULES,stepPocketState} from './polyhedralRobustness.js';
import {candidateSensors,fitForecast,scoreForecast,selectForecastSensors} from './keyholeForecast.js';
import {validateGraph} from './polyhedralKeyhole.js';

export const TRANSFER_RELABEL_SEEDS=Object.freeze([369,636,963]);
export const TRANSFER_BUDGETS=Object.freeze([0,1,2]);
const N=8, MAX_MASK=255;

function popcount(n){
  let s=0;
  while(n){n&=n-1;s++;}
  return s;
}
function random(seed){
  let x=seed>>>0||1;
  return ()=>{
    x^=x<<13;x^=x>>>17;x^=x<<5;
    return (x>>>0)/4294967296;
  };
}
export function vertexPermutation(seed){
  if(!Number.isSafeInteger(seed)||seed<1||seed>1_000_000)throw new RangeError('Invalid permutation seed');
  const a=Array.from({length:N},(_,i)=>i),rng=random(seed);
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
export function relabelGraph(graph,permutation){
  validateGraph(graph);
  if(graph.neighbors.length!==N||!Array.isArray(permutation)||
    permutation.length!==N||
    new Set(permutation).size!==N||
    permutation.some(x=>!Number.isInteger(x)||x<0||x>=N))
    throw new Error('Expected a permutation of eight pocket indices');
  const coordinates=Array(N),neighbors=Array(N);
  for(let i=0;i<N;i++){
    const p=permutation[i];
    coordinates[p]=[...graph.coordinates[i]];
    neighbors[p]=graph.neighbors[i].map(j=>permutation[j]).sort((a,b)=>a-b);
  }
  const out={id:graph.id,label:graph.label,coordinates,neighbors};
  validateGraph(out);
  return out;
}
export function enumerateGraphForecastRows(graph,rule='majority'){
  validateGraph(graph);
  if(graph.neighbors.length!==N||!RULES.some(x=>x.id===rule))throw new Error('Expected eight-pocket graph and registered rule');
  return Array.from({length:256},(_,mask)=>{
    const next=stepPocketState(graph,mask,rule);
    return {
      mask,observed:2*popcount(mask)-N,nextAggregate:2*popcount(next)-N,
    };
  });
}
export function makeTransferFold(holdoutId,rule='majority'){
  const families=POLY03_FAMILIES;
  const holdoutIndex=families.findIndex(f=>f.id===holdoutId);
  if(holdoutIndex<0)throw new RangeError('Unknown holdout topology');
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unknown transition rule');
  const validationIndex=(holdoutIndex+1)%families.length;
  const trainFamilies=families.filter((_,i)=>i!==holdoutIndex&&i!==validationIndex);
  return {
    holdoutId,validationId:families[validationIndex].id,
    trainIds:trainFamilies.map(f=>f.id),
    train:trainFamilies.flatMap(f=>enumerateGraphForecastRows(makePoly03Graph(f.id),rule)),
    validation:enumerateGraphForecastRows(makePoly03Graph(families[validationIndex].id),rule),
    holdoutGraph:makePoly03Graph(holdoutId),
  };
}
function validateConfiguration({rule,budget,relabelSeeds}){
  if(!RULES.some(x=>x.id===rule))throw new RangeError('Unknown transition rule');
  if(!TRANSFER_BUDGETS.includes(budget))throw new RangeError('Budget must be 0, 1 or 2');
  if(!Array.isArray(relabelSeeds)||relabelSeeds.length<1||relabelSeeds.length>3||
    new Set(relabelSeeds).size!==relabelSeeds.length||
    relabelSeeds.some(s=>!Number.isSafeInteger(s)||s<1||s>1_000_000))
    throw new RangeError('Expected 1 to 3 unique relabeling seeds');
}
function randomSensors(seed,budget){
  const candidates=candidateSensors(budget);
  return candidates[Math.floor(random(seed+509)()*candidates.length)];
}
function metrics(train,holdout,sensors){
  return scoreForecast(fitForecast(train,sensors),holdout);
}
function mean(rows,key){
  return rows.reduce((sum,row)=>sum+row[key].accuracy,0)/rows.length;
}
export function runCrossTopologyTransfer({
  rule='majority',budget=1,relabelSeeds=TRANSFER_RELABEL_SEEDS,
}={}){
  validateConfiguration({rule,budget,relabelSeeds});
  const folds=POLY03_FAMILIES.map(family=>{
    const fold=makeTransferFold(family.id,rule);
    const selection=selectForecastSensors(fold.train,fold.validation,budget);
    const fixedSensors=candidateSensors(budget)[0];
    const selectedSensors=selection.sensors;
    const randomChoice=randomSensors(family.labeledCount,budget);
    const variants=[{label:'canonical',permutation:Array.from({length:N},(_,i)=>i)},
      ...relabelSeeds.map(seed=>({label:'relabel-'+seed,permutation:vertexPermutation(seed)}))];
    const results=variants.map(variant=>{
      const testGraph=relabelGraph(fold.holdoutGraph,variant.permutation);
      const holdout=enumerateGraphForecastRows(testGraph,rule);
      const aggregate=metrics(fold.train,holdout,[]);
      const fixed=metrics(fold.train,holdout,fixedSensors);
      const randomChoiceScore=metrics(fold.train,holdout,randomChoice);
      const selected=metrics(fold.train,holdout,selectedSensors);
      return {
        label:variant.label,permutation:[...variant.permutation],
        trainCount:fold.train.length,validationCount:fold.validation.length,
        testCount:holdout.length,
        aggregate,fixed,random:randomChoiceScore,selected,
        deltaVsFixed:selected.accuracy-fixed.accuracy,
        deltaVsAggregate:selected.accuracy-aggregate.accuracy,
      };
    });
    return {
      holdoutId:family.id,holdoutName:family.name,
      validationId:fold.validationId,trainIds:fold.trainIds,
      selectedSensors,fixedSensors,randomSensors:randomChoice,
      validationAccuracy:selection.validation.accuracy,
      results,
    };
  });
  const all=folds.flatMap(f=>f.results);
  const globalMeans={
    aggregate:mean(all,'aggregate'),fixed:mean(all,'fixed'),
    random:mean(all,'random'),selected:mean(all,'selected'),
  };
  const byVariant=['canonical',...relabelSeeds.map(s=>'relabel-'+s)].map(label=>{
    const group=all.filter(row=>row.label===label);
    return {label,folds:group.length,
      means:{aggregate:mean(group,'aggregate'),fixed:mean(group,'fixed'),
        random:mean(group,'random'),selected:mean(group,'selected')}};
  });
  return {
    protocol:'POLY-05',version:1,authority:'NONE',evidence:'SYNTHETIC CROSS-TOPOLOGY TRANSFER',
    rule,budget,relabelSeeds:[...relabelSeeds],
    folds,byVariant,globalMeans,
    evaluatedConditions:all.length,
    evaluatedPredictionsPerModel:all.length*256,
    limits:[
      'Train, validation and holdout graph families are disjoint; the same 256 binary masks appear in each graph, so this is out-of-graph, not out-of-state transfer.',
      'All graphs are related 8-node, degree-3 synthetic structures with labels from a known local rule; this is not validation on real agent workloads.',
      'Node-index relabeling cannot preserve a meaningful cross-graph sensor identity unless the task defines one. Robust prediction should not rely on arbitrary labels.',
      'Sensor locations are selected on the validation graph only; no labels from holdout topology or relabels are used for fitting or selection.',
      'The graph ensemble has five family representatives, not independent samples from the space of all possible tasks or graphs.',
      'All methods receive the aggregate; extra sensor budget counts raw pocket signs, not real sensing, privacy or compute overhead.',
      'No production routing authority or physical interpretation is implied.',
    ],
  };
}
