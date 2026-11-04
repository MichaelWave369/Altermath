/**
 * Altermath 3-6-9 research oscillator, not a claim about consciousness or physics.
 * This is a small deterministic Kuramoto-type model with within-layer coupling
 * and removable cross-boundary junctions. ALL units are arbitrary.
 */
export const GROUPS = Object.freeze([
  Object.freeze({ id: 3, key: 'remember', name: 'Remembrance', domain: 'Mind', color: '#e3b36f', count: 3, radius: 92,
    concepts: ['Nous', 'Logos', 'Gnosis'] }),
  Object.freeze({ id: 6, key: 'align', name: 'Alignment', domain: 'Body', color: '#7ce0d1', count: 6, radius: 176,
    concepts: ['Sophia', 'Soma', 'Temperance', 'Integrity', 'Relation', 'Boundary'] }),
  Object.freeze({ id: 9, key: 'return', name: 'Return', domain: 'Witness', color: '#b99be5', count: 9, radius: 258,
    concepts: ['Testimony', 'Witness', 'Trace', 'Synthesis', 'Continuity', 'Context', 'Recognition', 'Reunion', 'Return'] }),
]);
const TAU = Math.PI * 2;
export const wrap = n => ((n % TAU) + TAU) % TAU;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const rng = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const edgeId = (a,b) => [a,b].sort((x,y)=>x-y).join(':');

export function buildTopology() {
  const nodes = [];
  const links = [];
  const seen = new Set();
  const add = (a, b, cross) => {
    if (a === b) return;
    const id = edgeId(a,b);
    if (seen.has(id)) return;
    seen.add(id);
    links.push({id,a,b,cross});
  };
  const offsets = [];
  for (const group of GROUPS) {
    const offset = nodes.length;
    offsets.push(offset);
    for (let i = 0; i < group.count; i++) {
      const angle = -Math.PI/2 + i * TAU/group.count;
      nodes.push({id:offset+i,group:group.id,name:group.concepts[i],angle,
        x:380 + group.radius*Math.cos(angle), y:320 + group.radius*Math.sin(angle)});
    }
    for (let i = 0; i < group.count; i++) add(offset+i,offset+((i+1)%group.count),false);
  }
  // Two links per 3-point node into the 6-point layer.
  for (let i=0;i<3;i++) for (let j=0;j<2;j++) add(offsets[0]+i,offsets[1]+2*i+j,true);
  // Every 6-point node connects to a nearby 9-point node.
  for (let i=0;i<6;i++) add(offsets[1]+i,offsets[2]+Math.floor(i*9/6),true);
  return {nodes,links};
}

const STRUCTURE = buildTopology();
export function createWorld(seed=369) {
  if (!Number.isInteger(seed)) throw new TypeError('Seed must be an integer');
  const random = rng(seed);
  const phases = STRUCTURE.nodes.map(n => wrap((n.group === 3 ? 0 : n.group === 6 ? 1.2 : 2.7) + (random()-.5)*.6));
  const frequencies = STRUCTURE.nodes.map(() => (random()-.5)*.32);
  return { ...STRUCTURE,phases,frequencies,seed,tick:0,gain:1.9,gate:true,
    energy:0,events:[{tick:0,type:'SYSTEM',text:'18 conceptual nodes initialized'}] };
}

export function activeLinks(world) { return world.links.filter(e => world.gate || !e.cross); }
export function coherence(phases) {
  if (!phases.length) return 0;
  let x=0,y=0;
  for(const theta of phases){x+=Math.cos(theta);y+=Math.sin(theta);}
  return Math.hypot(x,y)/phases.length;
}
export function metrics(world) {
  const ranges = GROUPS.map(group => {
    const local = world.nodes.filter(n=>n.group===group.id).map(n=>world.phases[n.id]);
    return {group:group.id,order:coherence(local)};
  });
  const active = activeLinks(world);
  return {tick:world.tick,order:coherence(world.phases),junctions:active.filter(x=>x.cross).length,
    totalLinks:active.length,energy:world.energy,groups:ranges};
}
export function stepWorld(world) {
  const active=activeLinks(world), forces=Array(world.nodes.length).fill(0), degrees=Array(world.nodes.length).fill(0);
  let exchange=0;
  for(const edge of active){
    const delta=Math.sin(world.phases[edge.b]-world.phases[edge.a]);
    forces[edge.a]+=delta;forces[edge.b]-=delta;
    degrees[edge.a]++;degrees[edge.b]++;
    if(edge.cross) exchange+=Math.abs(delta);
  }
  const phases=world.phases.map((theta,i)=>wrap(theta+.05*(world.frequencies[i]+world.gain*forces[i]/Math.max(1,degrees[i]))));
  return {...world,phases,tick:world.tick+1,energy:world.energy+exchange*.05};
}
const event = (world,type,text) => ({...world,events:[{tick:world.tick,type,text},...world.events].slice(0,16)});
export function setGate(world,gate) {return event({...world,gate:Boolean(gate)},gate?'JUNCTION':'HOROS',gate?'Cross-layer junctions authorized':'Cross-layer boundary closed');}
export function setGain(world,gain) {if(!Number.isFinite(gain)||gain<0||gain>5) throw new RangeError('Invalid gain');return {...world,gain};}
export function disturb(world,group=6) {
  if(!GROUPS.some(g=>g.id===group)) throw new RangeError('Unknown group');
  return event({...world,phases:world.phases.map((theta,i)=>world.nodes[i].group===group?wrap(theta+(i%2?1.5:-1.2)):theta)},
    'FAULT',`Perturbed the ${group}-point layer`);
}
