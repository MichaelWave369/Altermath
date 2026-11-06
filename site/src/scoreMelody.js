/**
 * R23 / Score → Gears → Bubbles → Melody.
 * Deterministic musical-information transfer TOY MODEL, not a theory of souls,
 * death, quantum physics, consciousness, or a physical universal language.
 *
 * Key idea: the interval/rhythm signature survives transposition, global tempo
 * changes and instrument changes, but an altered score should not pass.
 */
export const SCHEMA = 'altermath-r23:score-gears-melody:v1';
export const SCORE = Object.freeze([
  {semitone:0,beats:1}, {semitone:2,beats:0.5},
  {semitone:4,beats:0.5}, {semitone:7,beats:1},
  {semitone:5,beats:1}, {semitone:4,beats:0.5},
  {semitone:2,beats:0.5}, {semitone:0,beats:1.5},
].map(n=>Object.freeze(n)));
const GEAR_COUNT=6;
const EPSILON=1e-7;
const finite=(n,name)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new RangeError('Invalid '+name);};
const bounded=(n,name,min,max)=>{finite(n,name);if(n<min||n>max)throw new RangeError(name+' outside ['+min+', '+max+']');};
const randomGenerator=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

/** Render the same abstract score with different pitch and time encodings. */
export function renderScore({transpose=0,tempo=1,mutation=0}={}){
  bounded(transpose,'transpose',-24,24);
  bounded(tempo,'tempo',0.25,4);
  bounded(mutation,'mutation',-12,12);
  return SCORE.map((note,index)=>({
    index,
    semitone:note.semitone+transpose+(index===3?mutation:0),
    beats:note.beats*tempo,
  }));
}

/**
 * Musical invariants: consecutive semitone intervals and each note's duration
 * divided by first-note duration. A timbre is intentionally NOT represented.
 */
export function melodySignature(events){
  if(!Array.isArray(events)||events.length<2)throw new RangeError('Need at least two notes');
  for(const event of events){
    finite(event.semitone,'note pitch');
    finite(event.beats,'note duration');
    if(event.beats<=0)throw new RangeError('Note duration must be positive');
  }
  return {
    intervals:events.slice(1).map((note,i)=>note.semitone-events[i].semitone),
    rhythmRatios:events.map(note=>note.beats/events[0].beats),
  };
}
export function signatureError(left,right){
  const a=melodySignature(left),b=melodySignature(right);
  if(a.intervals.length!==b.intervals.length)throw new RangeError('Unequal melody length');
  return a.intervals.reduce((sum,x,i)=>sum+Math.abs(x-b.intervals[i]),0)
    +a.rhythmRatios.reduce((sum,x,i)=>sum+Math.abs(x-b.rhythmRatios[i]),0);
}

/** Six synthetic timing teeth with seeded, symmetric phase jitter. */
export function gearMetrics({phaseOffset=0,phaseJitter=0,seed=369}={}){
  bounded(phaseOffset,'phase offset',0,180);
  bounded(phaseJitter,'phase jitter',0,90);
  if(!Number.isSafeInteger(seed))throw new RangeError('Invalid seed');
  const rng=randomGenerator(seed);
  const angles=Array.from({length:GEAR_COUNT},()=>(
    (phaseOffset+(rng()*2-1)*phaseJitter)*Math.PI/180
  ));
  const real=angles.reduce((acc,x)=>acc+Math.cos(x),0)/GEAR_COUNT;
  const imag=angles.reduce((acc,x)=>acc+Math.sin(x),0)/GEAR_COUNT;
  return {
    count:GEAR_COUNT,
    alignment:(real+1)/2,
    coherence:Math.hypot(real,imag),
    offsetsRadians:angles,
  };
}

/**
 * Keyhole: a deliberately declared policy gate, not evidence for the afterlife.
 * Keeping alignment and coherence separate avoids treating uniformly shifted
 * phases as aligned just because their phase concentration is high.
 */
export function runMelodyStudy({
  seed=369,transpose=7,tempo=1.25,phaseOffset=0,phaseJitter=0,
  mutation=0,gate=true,threshold=0.85,
}={}){
  if(typeof gate!=='boolean')throw new TypeError('Gate must be boolean');
  bounded(threshold,'threshold',0,1);
  const source=renderScore();
  const candidate=renderScore({transpose,tempo,mutation});
  const sourceSignature=melodySignature(source);
  const candidateSignature=melodySignature(candidate);
  const error=signatureError(source,candidate);
  const gears=gearMetrics({phaseOffset,phaseJitter,seed});
  const invariantPreserved=error<EPSILON;
  const aligned=gears.alignment>=threshold;
  const transferred=gate&&invariantPreserved&&aligned;
  const reasons=[];
  if(!gate)reasons.push('Boundary policy closed');
  if(!invariantPreserved)reasons.push('Melodic interval or rhythm invariant changed');
  if(!aligned)reasons.push('Timing gear alignment below threshold');
  return {
    schema:SCHEMA,
    authority:'DETERMINISTIC SOFTWARE / ORIGINAL MUSICAL MOTIF',
    limitations:'Invariants of a constructed melody; no evidence for reincarnation, a persistent subject, cosmic code, or physical transfer across lives.',
    parameters:{seed,transpose,tempo,phaseOffset,phaseJitter,mutation,gate,threshold},
    score:{source,candidate,sourceSignature,candidateSignature},
    gears,
    keyhole:{invariantPreserved,aligned,policyAllowed:gate,transferred,signatureError:error,reasons},
    interpretation:transferred
      ? 'The candidate retains the declared musical pattern and passes the toy interface policy.'
      : 'The candidate does not pass every declared musical-pattern and interface condition.',
  };
}
