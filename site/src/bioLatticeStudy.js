/**
 * R14: independent synchronous Markov transport baseline and deterministic
 * parameter sweeps for R13's dimensionless illustrative lattice.
 *
 * This is neither a measured molecular model nor a quantum experiment.
 */
import {simulateBioLattice} from './bioLattice.js';

export const BIO_STUDY_SCHEMA='altermath.bio-lattice.study.v1';
export const STUDY_MODES=Object.freeze(['hopping','amplitude','markov']);
export const SWEEP_GRID=Object.freeze({
  coupling:Object.freeze([0,0.25,0.5,0.75,1]),
  disorder:Object.freeze([0,0.25,0.5,0.75,1]),
  loss:Object.freeze([0,0.015,0.03,0.045,0.06])
});
const average=items=>items.reduce((sum,v)=>sum+v,0)/items.length;

function fieldNoise(seed,n){
  // Matches the R13 seeded disorder field, so each model sees the same
  // synthetic material field. Transition update rules remain independent.
  let state=(seed>>>0)||1;
  const fields=new Float64Array(n);
  for(let i=0;i<n;i++){
    state^=state<<13;state^=state>>>17;state^=state<<5;
    fields[i]=(state>>>0)/4294967296;
  }
  return fields;
}

export function simulateMarkovTransport({
  rings=18,protofilaments=13,coupling=0.38,disorder=0.15,
  loss=0.008,steps=32,seed=369
}={}){
  // Shared dimensional validation from the original reference implementation,
  // with a zero-step call that avoids changing any original transport behavior.
  simulateBioLattice({rings,protofilaments,coupling,disorder,loss,steps:0,seed});
  const n=rings*protofilaments,source=2*protofilaments+Math.floor(protofilaments/2);
  const field=fieldNoise(seed,n),p=new Float64Array(n);
  p[source]=1;
  // Synchronous explicit-Euler update of a symmetric nearest-neighbor
  // continuous-time Markov generator, step length = 1 synthetic tick.
  // Degree <= 4 and sin(0.42)^2 * 4 < 1, so outgoing mass stays nonnegative.
  for(let tick=0;tick<steps;tick++){
    const next=new Float64Array(n);
    for(let a=0;a<n;a++){
      const r=Math.floor(a/protofilaments),c=a%protofilaments;
      const peers=[];
      if(r>0)peers.push(a-protofilaments);
      if(r<rings-1)peers.push(a+protofilaments);
      peers.push(r*protofilaments+(c+1)%protofilaments);
      peers.push(r*protofilaments+(c-1+protofilaments)%protofilaments);
      let outgoing=0;
      for(const b of peers){
        const theta=0.42*coupling*(1-0.65*disorder*Math.abs(field[a]-field[b]));
        const rate=Math.sin(theta)**2;
        outgoing+=rate;
        next[b]+=p[a]*rate;
      }
      next[a]+=p[a]*(1-outgoing);
    }
    for(let i=0;i<n;i++)p[i]=next[i]*(1-loss);
  }
  let survival=0,meanRing=0,second=0,concentration=0;
  for(let i=0;i<n;i++){survival+=p[i];meanRing+=p[i]*Math.floor(i/protofilaments);}
  if(survival>0)meanRing/=survival;
  for(let i=0;i<n;i++){
    const w=p[i]/survival;
    second+=w*(Math.floor(i/protofilaments)-meanRing)**2;
    concentration+=w*w;
  }
  return {
    schema:'altermath.bio-lattice.markov.v1',mode:'markov',
    parameters:{rings,protofilaments,coupling,disorder,loss,steps,seed},
    source,probabilities:Array.from(p),
    metrics:{survival,axialSpreadSites:Math.sqrt(second),
      effectiveSites:concentration?1/concentration:0,meanRing,
      lossFraction:Math.max(0,1-survival)},
    disclaimer:'Synchronous Euler-discretized symmetric Markov walk; arbitrary tick and rate, not a calibrated biological transport law.'
  };
}

function validateStudy({base,sweepKey,startSeed,seedCount}){
  if(!Object.hasOwn(SWEEP_GRID,sweepKey))throw new RangeError('Unknown sweep dimension');
  if(![3,6,9].includes(seedCount))throw new RangeError('Seed count must be 3, 6 or 9');
  if(!Number.isSafeInteger(startSeed)||startSeed<0||startSeed>2147483647-seedCount)
    throw new RangeError('Starting seed out of range');
  if(!base||typeof base!=='object'||Array.isArray(base))
    throw new RangeError('Expected an explicit base configuration');
  simulateBioLattice({...base,mode:'hopping',seed:startSeed});
}

export function runBioLatticeStudy({
  base={rings:18,protofilaments:13,coupling:0.38,disorder:0.15,loss:0.008,steps:32},
  sweepKey='disorder',startSeed=369,seedCount=3
}={}){
  validateStudy({base,sweepKey,startSeed,seedCount});
  const seeds=Array.from({length:seedCount},(_,i)=>startSeed+i);
  const rows=SWEEP_GRID[sweepKey].map(value=>{
    const scenario={...base,[sweepKey]:value};
    const perSeed=seeds.map(seed=>{
      const params={...scenario,seed};
      const hopping=simulateBioLattice({...params,mode:'hopping'}).metrics;
      const amplitude=simulateBioLattice({...params,mode:'amplitude'}).metrics;
      const markov=simulateMarkovTransport(params).metrics;
      return {seed,hopping,amplitude,markov,
        amplitudeMinusMarkov:amplitude.axialSpreadSites-markov.axialSpreadSites,
        hoppingMinusMarkov:hopping.axialSpreadSites-markov.axialSpreadSites};
    });
    const means=Object.fromEntries(STUDY_MODES.map(mode=>[
      mode,{
        spread:average(perSeed.map(s=>s[mode].axialSpreadSites)),
        effectiveSites:average(perSeed.map(s=>s[mode].effectiveSites)),
        survival:average(perSeed.map(s=>s[mode].survival))
      }
    ]));
    const differences=perSeed.map(s=>s.amplitudeMinusMarkov);
    const maxSurvivalError=Math.max(...perSeed.flatMap(sample=>
      STUDY_MODES.map(mode=>Math.abs(sample[mode].survival-(1-scenario.loss)**scenario.steps))));
    return {
      sweepValue:value,seeds:[...seeds],means,perSeed,
      amplitudeMinusMarkovMean:average(differences),
      amplitudeMinusMarkovRange:[Math.min(...differences),Math.max(...differences)],
      pairedSeedSigns:{
        positive:differences.filter(v=>v>1e-10).length,
        negative:differences.filter(v=>v< -1e-10).length,
        ties:differences.filter(v=>Math.abs(v)<=1e-10).length
      },
      maxSurvivalError
    };
  });
  return {
    schema:BIO_STUDY_SCHEMA,studyType:'deterministic_synthetic_paired_sweep',
    parameters:{base:{...base},sweepKey,startSeed,seedCount,grid:[...SWEEP_GRID[sweepKey]]},
    rows,diagnostics:{
      maxSurvivalError:Math.max(...rows.map(r=>r.maxSurvivalError)),
      uniqueSeeds:new Set(rows.flatMap(r=>r.seeds)).size,
      comparisons:rows.length*seedCount
    },
    disclaimers:[
      'All data are generated by toy mathematical models; none are measured physical or biological outcomes.',
      'Seeds are paired across grid points and model types; repeated trajectories are correlated, not independent biological replicates.',
      'No parameter tuning, holdout validation, physical units, inferential significance or quantum-consciousness test.',
      'Differences can result from numerical update rules and boundary conditions alone.',
      'No actuator, kernel, network, or real optical hardware controls.'
    ]
  };
}
