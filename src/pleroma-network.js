/**
 * A computational INTERPRETATION of Irenaeus' reported genealogy.
 * Pair/emanation data is historical; simulated two-endpoint communication
 * edges, scalar diffusion, shock and repair are engineered model choices.
 */
import { AEONS, PAIRS, LINEAGES } from './pleroma-data.js';

export const TOPOLOGIES = Object.freeze(['valentinian', 'ring', 'seeded']);
export const PROTECTED = Object.freeze(['bythus', 'sige']);
const pairById = new Map(PAIRS.map(p => [p.id, p]));
const nodeIds = new Set(AEONS.map(a => a.id));

function rng(seed) {
  let n = (seed >>> 0) || 1;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function edgeId(a, b) { return [a, b].sort().join('::'); }
function makeTopology(kind, seed) {
  const used = new Set();
  const edges = [];
  function add(a, b, type) {
    const id = edgeId(a, b);
    if (a === b || used.has(id)) return false;
    used.add(id);
    edges.push({ id, a, b, type, enabled: true });
    return true;
  }
  // All baseline graphs preserve the historically named 15 syzygies.
  for (const pair of PAIRS) add(...pair.members, 'syzygy');
  if (kind === 'valentinian') {
    // Mapping a pair-level emanation to two directed-looking communication
    // edges is a MODELING CHOICE, not an assertion made by Irenaeus.
    for (const { fromPair, toPair } of LINEAGES) {
      const parent = pairById.get(fromPair);
      const child = pairById.get(toPair);
      for (let i = 0; i < 2; i++) add(parent.members[i], child.members[i], 'emanation-model');
    }
  } else if (kind === 'ring') {
    // Connected ring plus skip-links, with exactly the same edge budget.
    for (let i = 0; i < PAIRS.length; i++) {
      add(PAIRS[i].members[0], PAIRS[(i + 1) % PAIRS.length].members[0], 'baseline');
    }
    for (let i = 0; i < PAIRS.length - 2; i++) {
      add(PAIRS[i].members[1], PAIRS[i + 2].members[1], 'baseline');
    }
  } else if (kind === 'seeded') {
    const next = rng(seed);
    // Connected random spanning tree over pairs, then random extra edges.
    const order = [...Array(PAIRS.length).keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 1; i < order.length; i++) {
      const a = PAIRS[order[i]];
      const b = PAIRS[order[Math.floor(next() * i)]];
      add(a.members[Math.floor(next() * 2)], b.members[Math.floor(next() * 2)], 'baseline');
    }
    // 14 spanning links + 14 extra = 28 non-syzygy links.
    while (edges.length < 43) {
      const a = AEONS[Math.floor(next() * AEONS.length)].id;
      const b = AEONS[Math.floor(next() * AEONS.length)].id;
      add(a, b, 'baseline');
    }
  } else throw new Error(`Unknown topology: ${kind}`);
  if (edges.length !== 43) throw new Error(`Edge budget mismatch: ${edges.length}`);
  return edges;
}
function validateGain(gain) {
  if (!Number.isFinite(gain) || gain < 0 || gain > 1) throw new Error('gain must be 0..1');
}
function stateFor(seed, i) {
  // Same initial state for corresponding aeons across all topologies.
  const rand = rng((seed ^ (i + 1) * 0x9e3779b9) >>> 0);
  return 0.15 + 0.16 * rand();
}
export function createPleroma({ topology = 'valentinian', seed = 369, gain = 0.32 } = {}) {
  if (!TOPOLOGIES.includes(topology)) throw new Error('Unknown topology');
  if (!Number.isInteger(seed)) throw new Error('seed must be integer');
  validateGain(gain);
  return {
    topology, seed, gain, tick: 0, disturbed: false, repaired: false,
    nodes: AEONS.map((n, i) => ({ ...n, value: stateFor(seed, i) })),
    edges: makeTopology(topology, seed),
    audit: [], denied: 0, transferred: 0,
    recoveryTick: null
  };
}
const appendAudit = (world, entry) => [{ tick: world.tick, ...entry }, ...world.audit].slice(0, 80);

export function attemptCrossing(world, from = 'sophia', to = 'bythus') {
  if (!nodeIds.has(from) || !nodeIds.has(to)) throw new Error('Unknown aeon');
  // Horos is an EXPLICIT policy object, not a 31st aeon.
  const allowed = !PROTECTED.includes(to) &&
    (from === 'sophia' && to === 'theletos');
  const event = { type: 'horos', from, to, allowed,
    detail: allowed ? 'authorized for repair' : 'protected or unsupported route' };
  return { allowed, world: {
    ...world, denied: world.denied + Number(!allowed),
    audit: appendAudit(world, event)
  }};
}
export function disturbSophia(world, shock = 0.5) {
  if (world.disturbed) return world;
  if (!Number.isFinite(shock) || shock < 0 || shock > 0.6) throw new Error('Invalid shock');
  const sophia = world.nodes.find(n => n.id === 'sophia');
  if (sophia.value + shock > 1) throw new Error('Shock exceeds signal range');
  const target = edgeId('sophia', 'theletos');
  return {
    ...world, disturbed: true,
    nodes: world.nodes.map(n => n.id === 'sophia' ? { ...n, value: n.value + shock } : n),
    edges: world.edges.map(e => e.id === target ? { ...e, enabled: false } : e),
    audit: appendAudit(world, { type: 'fault', detail: `Sophia shock +${shock}; pair edge severed` })
  };
}
export function repairSophia(world) {
  if (!world.disturbed || world.repaired) return world;
  const access = attemptCrossing(world, 'sophia', 'theletos');
  if (!access.allowed) return access.world;
  const target = edgeId('sophia', 'theletos');
  return {
    ...access.world, repaired: true,
    edges: world.edges.map(e => e.id === target ? { ...e, enabled: true } : e),
    audit: appendAudit(access.world, { type: 'repair', detail: 'Sophia–Theletos junction restored' })
  };
}
export function stepPleroma(world) {
  validateGain(world.gain);
  const active = world.edges.filter(e => e.enabled);
  const index = new Map(world.nodes.map((n, i) => [n.id, i]));
  const degree = world.nodes.map(() => 0);
  for (const e of active) { degree[index.get(e.a)]++; degree[index.get(e.b)]++; }
  const deltas = world.nodes.map(() => 0);
  let moved = 0;
  for (const e of active) {
    const a = index.get(e.a), b = index.get(e.b);
    const flow = world.gain * (world.nodes[b].value - world.nodes[a].value) /
      Math.max(1, degree[a], degree[b]);
    deltas[a] += flow;
    deltas[b] -= flow;
    moved += Math.abs(flow);
  }
  const nodes = world.nodes.map((n, i) => ({ ...n, value: n.value + deltas[i] }));
  const firstRecovered = world.disturbed && world.repaired && world.recoveryTick === null &&
    Math.abs(nodes.find(n => n.id === 'sophia').value - nodes.find(n => n.id === 'theletos').value) < 0.05;
  return {
    ...world, nodes, tick: world.tick + 1,
    transferred: world.transferred + moved,
    recoveryTick: firstRecovered ? world.tick + 1 : world.recoveryTick
  };
}
export function pleromaMetrics(world) {
  const values = world.nodes.map(n => n.value);
  const total = values.reduce((a, b) => a + b, 0);
  const mean = total / values.length;
  const sophia = world.nodes.find(n => n.id === 'sophia');
  const theletos = world.nodes.find(n => n.id === 'theletos');
  const active = world.edges.filter(e => e.enabled);
  const adjacent = new Map(world.nodes.map(n => [n.id, []]));
  for (const e of active) {
    adjacent.get(e.a).push(e.b);
    adjacent.get(e.b).push(e.a);
  }
  const seen = new Set(), components = [];
  for (const n of world.nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n.id]; let size = 0;
    seen.add(n.id);
    while (stack.length) {
      const current = stack.pop(); size++;
      for (const next of adjacent.get(current)) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    components.push(size);
  }
  return {
    tick: world.tick, topology: world.topology, total, mean,
    variance: values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length,
    pairDifference: Math.abs(sophia.value - theletos.value),
    activeEdges: active.length, components: components.length,
    largestComponent: Math.max(...components), denied: world.denied,
    transferred: world.transferred, recoveryTick: world.recoveryTick
  };
}
export function compareTopologies({ seed = 369, steps = 100, repairAt = 15, gain = 0.32 } = {}) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 10000) throw new Error('Invalid steps');
  if (!Number.isInteger(repairAt) || repairAt < 0 || repairAt > steps)
    throw new Error('Invalid repairAt');
  const trials = {};
  for (const topology of TOPOLOGIES) {
    let world = disturbSophia(createPleroma({ topology, seed, gain }));
    world = attemptCrossing(world, 'sophia', 'bythus').world;
    const series = [pleromaMetrics(world)];
    if (repairAt === 0) world = repairSophia(world);
    for (let t = 1; t <= steps; t++) {
      if (t === repairAt) world = repairSophia(world);
      world = stepPleroma(world);
      series.push(pleromaMetrics(world));
    }
    trials[topology] = { final: pleromaMetrics(world), series };
  }
  return { seed, steps, repairAt, gain, trials };
}
