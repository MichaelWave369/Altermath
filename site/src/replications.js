/**
 * Rung 12: repeated independent deterministic train/holdout seed partitions.
 *
 * Uses exactly Rung 11's predeclared five stress profiles and three fees.
 * Selection retrains ONLY on each partition's training seeds. No holdout
 * result chooses a new hyperparameter. A fresh partition is an independent
 * synthetic seed sample, NOT evidence of real-world generalizability.
 */
import {runRobustness,STRESS_PROFILES,SWITCH_FEES} from './robustness.js';
import {HOLDOUT_GAP} from './selection.js';

export const REPLICATION_SCHEMA='Altermath.RepeatedJunctionEvaluation.v1';
export const SPLIT_STRIDE=20011;
export const BASELINES=Object.freeze([
  Object.freeze({key:'adaptiveVsFrozen',name:'Frozen trained'}),
  Object.freeze({key:'adaptiveVsRotating',name:'Rotating priority'}),
  Object.freeze({key:'adaptiveVsShuffled',name:'Static shuffled'})
]);
const average=arr=>arr.reduce((sum,x)=>sum+x,0)/arr.length;
const finiteInt=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const signs=values=>({
  wins:values.filter(x=>x>1e-12).length,
  losses:values.filter(x=>x < -1e-12).length,
  ties:values.filter(x=>Math.abs(x)<=1e-12).length
});
const profileCell=(report,profileId,fee,baseline)=>{
  const scenario=report.scenarios.find(x=>x.id===profileId);
  if(!scenario)throw new Error('Missing stress profile');
  const cell=scenario.costs.find(x=>x.fee===fee);
  if(!cell||!cell[baseline])throw new Error('Missing baseline or switching-fee result');
  return cell[baseline];
};

export function validateReplicationParams(input={}){
  const p={startSeed:369,splitCount:3,trainingSeeds:3,holdoutSeeds:3,
    budget:6,warmup:60,horizon:180,selectionEvery:12,minDwell:12,maxSwaps:2,...input};
  if(!finiteInt(p.startSeed,-100000000,100000000)||
     ![3,6,9].includes(p.splitCount) ||
     ![3,6,9].includes(p.trainingSeeds) ||
     ![3,6,9].includes(p.holdoutSeeds) ||
     !finiteInt(p.budget,0,12) ||
     !finiteInt(p.warmup,0,2000) ||
     !finiteInt(p.horizon,160,300) ||
     !finiteInt(p.selectionEvery,1,100) ||
     !finiteInt(p.minDwell,0,300) ||
     !finiteInt(p.maxSwaps,0,12))
    throw new RangeError('Invalid repeated-evaluation parameters');
  if(p.trainingSeeds>=HOLDOUT_GAP||
     p.holdoutSeeds>=SPLIT_STRIDE-HOLDOUT_GAP)
    throw new RangeError('Train/holdout blocks may overlap');
  return p;
}
const jaccard=(left,right)=>{
  const a=new Set(left), b=new Set(right);
  const intersect=[...a].filter(x=>b.has(x)).length;
  const union=new Set([...a,...b]).size;
  return union===0?1:intersect/union;
};
function summarizeBaseline(splitReports,baseline){
  return STRESS_PROFILES.map(profile=>({
    id:profile.id,
    label:profile.label,
    fees:SWITCH_FEES.map(fee=>{
      const comparisons=splitReports.map(r=>profileCell(r.report,profile.id,fee,baseline));
      const deltaBySplit=comparisons.map(c=>c.meanDelta);
      // Report the split as a unit; do not pretend the five profiles
      // or repeated trajectories are independent physical observations.
      const counts=signs(deltaBySplit);
      const bySeed=splitReports.flatMap((r,i)=>comparisons[i].bySeed.map(x=>({
        split:i+1,seed:x.seed,delta:x.delta
      })));
      if(bySeed.length!==splitReports.length*splitReports[0].report.setup.holdoutSeeds.length)
        throw new Error('Incomplete holdout evidence');
      return {fee,meanDelta:average(deltaBySplit),minSplitDelta:Math.min(...deltaBySplit),
        maxSplitDelta:Math.max(...deltaBySplit),...counts,
        bySplit:splitReports.map((r,i)=>({
          split:i+1,startSeed:r.startSeed,delta:deltaBySplit[i]
        })),bySeed};
    })
  }));
}
export function runReplications(input={}){
  const p=validateReplicationParams(input);
  const splits=[];
  const seen=new Set();
  for(let i=0;i<p.splitCount;i++){
    const startSeed=p.startSeed+i*SPLIT_STRIDE;
    const report=runRobustness({...p,startSeed});
    const train=report.setup.trainingSeeds,held=report.setup.holdoutSeeds;
    if(train.length!==p.trainingSeeds||held.length!==p.holdoutSeeds)
      throw new Error('Incomplete seed split');
    for(const seed of [...train,...held]){
      if(seen.has(seed))throw new Error('Seed reused between splits or train and test');
      seen.add(seed);
    }
    if(new Set(report.selection.fixedStartingJunctions).size!==p.budget)
      throw new Error('Incomplete trained junction selection');
    splits.push({split:i+1,startSeed,
      trainingSeeds:[...train],holdoutSeeds:[...held],
      selection:[...report.selection.fixedStartingJunctions],
      report});
  }
  const selections=splits.map(s=>s.selection);
  const overlaps=[];
  for(let i=0;i<selections.length;i++)
    for(let j=i+1;j<selections.length;j++)
      overlaps.push({fromSplit:i+1,toSplit:j+1,
        jaccard:jaccard(selections[i],selections[j])});
  const baselines=BASELINES.map(ref=>({
    key:ref.key,label:ref.name,profiles:summarizeBaseline(splits,ref.key)
  }));
  const primary=baselines.find(x=>x.key==='adaptiveVsFrozen');
  const refFee=0.002;
  const primaryCells=primary.profiles.map(profile=>profile.fees.find(f=>f.fee===refFee));
  const outcomes=primaryCells.flatMap(cell=>cell.bySplit.map(x=>x.delta));
  const splitOverall=splits.map((split,i)=>average(primaryCells.map(c=>c.bySplit[i].delta)));
  return {
    schema:REPLICATION_SCHEMA,
    parameters:{...p,splitStride:SPLIT_STRIDE,holdoutOffset:HOLDOUT_GAP},
    splits:splits.map(({split,startSeed,trainingSeeds,holdoutSeeds,selection})=>({
      split,startSeed,trainingSeeds,holdoutSeeds,selection
    })),
    selectionStability:{meanPairwiseJaccard:average(overlaps.map(x=>x.jaccard)),
      pairs:overlaps},
    baselines,
    summary:{referenceFee:refFee,
      meanAcrossSplitProfileCells:average(outcomes),
      ...signs(outcomes),
      meanBySplit:splitOverall,
      splitSummary:signs(splitOverall),
      worstCell:{delta:Math.min(...outcomes),
        ...primaryCells.reduce((best,cell)=>{
          const low=cell.bySplit.reduce((b,x)=>x.delta<b.delta?x:b,cell.bySplit[0]);
          return !best||low.delta<best.delta?{profile:primary.profiles[primaryCells.indexOf(cell)].id,split:low.split,delta:low.delta}:best;
        },null)}
    },
    limitations:[
      'Independent non-overlapping pseudo-random seed partitions, not independent physical systems or true k-fold cross-validation.',
      'Every split is retrained only on its own training seeds; the five stress scenarios and fees remain fixed across splits.',
      'Within each split, stress scenarios reuse holdout seeds, so scenario-level results are correlated and cannot be counted as independent samples.',
      'The overall score equally weights the five prespecified synthetic stress profiles, not real-world scenario probabilities.',
      'The selected junction sets may differ by split; a low selection-overlap score measures instability in this model only.',
      'No p-values, statistical confidence intervals, physical energy or awareness claims are inferred.',
      'The synthetic permission gate cannot grant actual PhiKernel or NBGPocketMesh authority.'
    ]
  };
}
