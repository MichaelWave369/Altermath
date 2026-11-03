/** A discrete Kuramoto-type toy oscillator model over matched 4-regular networks.
 * Altermath 'junctions' here denote cross-boundary coupling, not spatial dimensions.
 */
import { NODE_COUNT, createTopology, seedRandom, inDifferentBubble, degreeSequence } from './phase-geometry.js';
const TAU = 2*Math.PI;
const wrap = x => ((x % TAU) + TAU) % TAU;
const clamp = (x,min,max) => Math.min(max,Math.max(min,x));
function assertRange(name,n,min,max) {
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${name} must be between ${min} and ${max}`);
}

export function createPhaseWorld({topology = 'tesseract', seed = 369, coupling = 2.4, spread = 0.4, gate = false, dt = 0.06} = {}) {
  assertRange('Coupling', coupling, 0, 10);
  assertRange('Spread', spread, 0, 3);
  assertRange('Time step', dt, 0.001, 0.1);
  const network = createTopology(topology,seed);
  const rng = seedRandom(seed + 7);
  // Identical initial conditions for every topology in a run.
  const phases = Array.from({length:NODE_COUNT}, (_,i) => wrap((i<8?0:Math.PI*0.72) + (rng()-0.5)*0.45));
  const frequencies = Array.from({length:NODE_COUNT}, () => (rng()*2-1)*spread);
  return { network, seed, coupling, spread, dt, gate: Boolean(gate), phases, frequencies,
    tick:0, transfer:0, lastCrossTransfer:0, events:[] };
}

export function setGate(world, open) {
  const gate = Boolean(open);
  if (world.gate === gate) return world;
  const type = gate ? 'junctions-authorized' : 'horos-boundary-closed';
  return {...world, gate, events:[{tick:world.tick,type},...world.events].slice(0,40)};
}
export function setCoupling(world,coupling) {
  assertRange('Coupling', coupling, 0, 10);
  return {...world,coupling};
}
export function activeEdges(world) {
  return world.network.edges.filter(([a,b]) => world.gate || !inDifferentBubble(a,b));
}

export function phaseOrder(phases) {
  if (phases.length === 0) throw new RangeError('No phases');
  const real = phases.reduce((s,v)=>s+Math.cos(v),0)/phases.length;
  const imag = phases.reduce((s,v)=>s+Math.sin(v),0)/phases.length;
  return Math.hypot(real,imag);
}

export function phaseMetrics(world) {
  const edges = activeEdges(world);
  const inter = edges.filter(([a,b])=>inDifferentBubble(a,b)).length;
  return {tick:world.tick,order:phaseOrder(world.phases),leftOrder:phaseOrder(world.phases.slice(0,8)),
    rightOrder:phaseOrder(world.phases.slice(8)),activeEdges:edges.length,interEdges:inter,
    possibleInterEdges:world.network.edges.filter(([a,b])=>inDifferentBubble(a,b)).length,
    transfer:world.transfer,lastCrossTransfer:world.lastCrossTransfer};
}

export function stepPhase(world) {
  const edges=activeEdges(world);
  const degrees=Array(NODE_COUNT).fill(0);
  const force=Array(NODE_COUNT).fill(0);
  let crossTransfer=0;
  for (const [a,b] of edges) {
    const sine=Math.sin(world.phases[b]-world.phases[a]);
    force[a] += sine;
    force[b] -= sine;
    degrees[a]++; degrees[b]++;
    if (inDifferentBubble(a,b)) crossTransfer += Math.abs(sine)*world.coupling*world.dt;
  }
  const phases=world.phases.map((theta,i)=>wrap(theta+world.dt*(world.frequencies[i]+world.coupling*force[i]/Math.max(1,degrees[i]))));
  // Signal flux is a diagnostic of cross-boundary coupling, NOT a conserved energy quantity.
  return {...world,phases,tick:world.tick+1,
    lastCrossTransfer:crossTransfer,transfer:world.transfer+crossTransfer};
}

/** Same initial states, frequencies, time step and edge budget across topology baselines.
 * Fault at tick 40 closes cross-boundary edges; repair at tick 90 reopens them.
 * Each topology has a different number of cross-boundary edges, reported explicitly.
 */
export function benchmark({seed=369,steps=240,coupling=2.4,spread=0.4,faultAt=40,repairAt=90}={}) {
  if (!Number.isInteger(steps) || steps<1 || steps>10000) throw new RangeError('Invalid steps');
  if (!Number.isInteger(faultAt) || !Number.isInteger(repairAt) || faultAt<0 || repairAt<faultAt || repairAt>steps) throw new RangeError('Invalid schedule');
  return ['tesseract','circulant','rewired'].map(topology=>{
    let world=createPhaseWorld({topology,seed,coupling,spread,gate:true});
    const initial=phaseMetrics(world);
    let atFault=null,atRepair=null;
    let orderSum=0;
    for(let k=0;k<steps;k++){
      if(k===faultAt){world=setGate(world,false);atFault=phaseMetrics(world).order;}
      if(k===repairAt){world=setGate(world,true);atRepair=phaseMetrics(world).order;}
      world=stepPhase(world);
      orderSum+=phaseOrder(world.phases);
    }
    const m=phaseMetrics(world);
    return {topology,seed,steps,edges:world.network.edges.length,degrees:degreeSequence(world.network),
      possibleCrossEdges:initial.possibleInterEdges,initialOrder:initial.order,
      orderAtFault:atFault,orderAtRepair:atRepair,finalOrder:m.order,meanOrder:orderSum/steps,
      cumulativeCrossTransfer:m.transfer};
  });
}
