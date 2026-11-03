/** Topology-first mathematics, independent of display/projection. */
export const NODE_COUNT = 16;
export const EDGE_COUNT = 32;
export const TOPOLOGIES = Object.freeze(['tesseract', 'circulant', 'rewired']);

export function edge(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b || a < 0 || b < 0 || a >= NODE_COUNT || b >= NODE_COUNT) {
    throw new RangeError('Invalid edge endpoints');
  }
  return a < b ? [a, b] : [b, a];
}
const edgeKey = ([a, b]) => `${a}:${b}`;

export function connected(edges) {
  const neighbors = Array.from({length:NODE_COUNT}, () => []);
  for (const [a,b] of edges) { neighbors[a].push(b); neighbors[b].push(a); }
  const seen = new Set([0]);
  const queue = [0];
  for (const i of queue) for (const j of neighbors[i]) if (!seen.has(j)) { seen.add(j); queue.push(j); }
  return seen.size === NODE_COUNT;
}

export function seedRandom(seed = 369) {
  if (!Number.isInteger(seed)) throw new RangeError('Seed must be an integer');
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createTopology(name = 'tesseract', seed = 369) {
  if (!TOPOLOGIES.includes(name)) throw new RangeError(`Unknown topology: ${name}`);
  let edges = [];
  if (name === 'circulant') {
    for (let i = 0; i < NODE_COUNT; i++) {
      edges.push(edge(i, (i + 1) % NODE_COUNT));
      edges.push(edge(i, (i + 4) % NODE_COUNT));
    }
  } else {
    // The 4D hypercube Q4: edge iff two 4-bit vertex addresses differ in exactly one bit.
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let bit = 0; bit < 4; bit++) {
        const other = i ^ (1 << bit);
        if (i < other) edges.push([i, other]);
      }
    }
  }
  if (name === 'rewired') {
    const rng = seedRandom(seed);
    // Double-edge swaps conserve 16 nodes, 32 edges, degree four, no duplicates or loops.
    let accepted = 0;
    for (let attempt = 0; attempt < 2500 && accepted < 120; attempt++) {
      const ai = Math.floor(rng() * edges.length);
      const bi = Math.floor(rng() * edges.length);
      if (ai === bi) continue;
      const [a,b] = edges[ai], [c,d] = edges[bi];
      if (new Set([a,b,c,d]).size !== 4) continue;
      const useOther = rng() < 0.5;
      const p = edge(a, useOther ? c : d);
      const q = edge(b, useOther ? d : c);
      const known = new Set(edges.filter((_,k) => k !== ai && k !== bi).map(edgeKey));
      if (known.has(edgeKey(p)) || known.has(edgeKey(q)) || edgeKey(p) === edgeKey(q)) continue;
      const trial = edges.map((e,k) => k === ai ? p : k === bi ? q : e);
      if (!connected(trial)) continue;
      edges = trial;
      accepted++;
    }
  }
  edges = edges.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  if (edges.length !== EDGE_COUNT || !connected(edges)) throw new Error('Invalid generated network');
  return { name, seed, edges };
}

export function inDifferentBubble(a, b) { return (a < 8) !== (b < 8); }
export function layerEdges(network) { return network.edges.filter(([a,b]) => inDifferentBubble(a,b)); }
export function degreeSequence(network) {
  const degrees = Array(NODE_COUNT).fill(0);
  for (const [a,b] of network.edges) { degrees[a]++; degrees[b]++; }
  return degrees;
}
