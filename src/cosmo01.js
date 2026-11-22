/**
 * COSMO-01: exact finite bounded-junction observability benchmark.
 * Synthetic binary graph automaton only. NOT a spacetime/black-hole model.
 * 2 four-node domains, path/cycle intradomain edges, one optional interface.
 * Uniform exact prior over all 256 eight-bit states.
 */
export const COSMO01_AUTHORITY = 'SIMULATED / authority NONE';
export const COSMO01_MODES = Object.freeze(['isolated', 'fixed', 'adaptive']);
export const COSMO01_TOPOLOGIES = Object.freeze(['path', 'cycle']);

function validate({ mode = 'isolated', topologyA = 'path', topologyB = 'path',
  rule = 'majority', permit = true, contact = true, compatible = true } = {}) {
  if (!COSMO01_MODES.includes(mode)) throw new TypeError('invalid junction mode');
  if (!COSMO01_TOPOLOGIES.includes(topologyA) ||
      !COSMO01_TOPOLOGIES.includes(topologyB)) throw new TypeError('invalid graph topology');
  if (!['majority', 'identity'].includes(rule)) throw new TypeError('invalid update rule');
  for (const [key, val] of Object.entries({ permit, contact, compatible })) {
    if (typeof val !== 'boolean') throw new TypeError('invalid gate: ' + key);
  }
  return { mode, topologyA, topologyB, rule, permit, contact, compatible };
}

function decode(mask) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 255) {
    throw new RangeError('state must be an 8-bit integer');
  }
  return Array.from({ length: 8 }, (_, i) => (mask >>> i) & 1);
}
function aggregate(bits, start) {
  return bits[start] + bits[start + 1] + bits[start + 2] + bits[start + 3];
}
function neighbors(topA, topB, bridge) {
  const ns = Array.from({ length: 8 }, () => []);
  for (const [offset, kind] of [[0, topA], [4, topB]]) {
    for (let i = 0; i < 3; i++) {
      ns[offset + i].push(offset + i + 1);
      ns[offset + i + 1].push(offset + i);
    }
    if (kind === 'cycle') {
      ns[offset].push(offset + 3);
      ns[offset + 3].push(offset);
    }
  }
  if (bridge) {
    ns[3].push(4);
    ns[4].push(3);
  }
  return ns;
}

/** One synchronous tick, with an explicitly authorized candidate interdomain edge.
 * Adaptive policy is defined operationally as mA > mB; it is NOT a law of nature.
 */
export function cosmo01Step(mask, options = {}) {
  const o = validate(options);
  const bits = decode(mask);
  const mA = aggregate(bits, 0);
  const mB = aggregate(bits, 4);
  const eligible = o.permit && o.contact && o.compatible;
  const bridge = eligible && (o.mode === 'fixed' ||
    (o.mode === 'adaptive' && mA > mB));
  const ns = neighbors(o.topologyA, o.topologyB, bridge);
  const next = o.rule === 'identity' ? bits.slice() : bits.map((self, i) => {
    const count = self + ns[i].reduce((sum, j) => sum + bits[j], 0);
    const votes = ns[i].length + 1;
    return count * 2 === votes ? self : Number(count * 2 > votes);
  });
  return {
    mask, before: bits, after: next, bridge, 
    coarse: [mA, mB],
    outcome: [aggregate(next, 0), aggregate(next, 4)],
    endpointA: bits[3]
  };
}

function conditionalEntropy(rows, keyFn) {
  const groups = new Map();
  for (const r of rows) {
    const key = keyFn(r);
    if (!groups.has(key)) groups.set(key, new Map());
    const y = r.outcome.join(':');
    const count = groups.get(key);
    count.set(y, (count.get(y) || 0) + 1);
  }
  let H = 0;
  for (const counts of groups.values()) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    let local = 0;
    for (const n of counts.values()) {
      const p = n / total;
      local -= p * Math.log2(p);
    }
    H += (total / rows.length) * local;
  }
  return H;
}

/** Exact unconditional enumeration, not Monte Carlo or external observation. */
export function cosmo01Score(options = {}) {
  const o = validate(options);
  const rows = Array.from({ length: 256 }, (_, mask) => cosmo01Step(mask, o));
  const coarseKey = r => r.coarse.join(':');
  const refinedKey = r => coarseKey(r) + ':' + r.endpointA;
  const hCoarse = conditionalEntropy(rows, coarseKey);
  const hRefined = conditionalEntropy(rows, refinedKey);
  const seen = new Map();
  let witness = null;
  for (const r of rows) {
    const key = coarseKey(r);
    const previous = seen.get(key);
    if (previous && previous.outcome.join(':') !== r.outcome.join(':')) {
      witness = { coarse: r.coarse, mask1: previous.mask, mask2: r.mask,
        outcome1: previous.outcome, outcome2: r.outcome };
      break;
    }
    if (!previous) seen.set(key, r);
  }
  return {
    authority: COSMO01_AUTHORITY,
    model: 'two-four-node-binary-graphs / synchronous-local-majority',
    prior: 'exact uniform 256-state enumeration',
    options: o,
    stateCount: rows.length,
    bridgeCases: rows.filter(r => r.bridge).length,
    conditionalEntropyBits: hCoarse,
    conditionalEntropyWithEndpointBits: hRefined,
    informationGainBits: Math.max(0, hCoarse - hRefined),
    witness
  };
}

export function cosmo01Matrix() {
  const rows = [];
  for (const pair of [['path', 'path'], ['path', 'cycle'], ['cycle', 'cycle']]) {
    for (const mode of COSMO01_MODES) {
      rows.push(cosmo01Score({ topologyA: pair[0], topologyB: pair[1], mode }));
    }
  }
  return { authority: COSMO01_AUTHORITY, rows };
}
