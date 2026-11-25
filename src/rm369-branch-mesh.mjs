// RM-369 E7: bounded Fibonacci-wave graph of independent regional fields.
import { createHash } from 'node:crypto';
import { RegionalField } from './rm369-regional.mjs';

const MAX_WAVES = 9;
const MAX_BUDGET = 4096;
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value)
  ? '[' + value.map(canonical).join(',') + ']'
  : value !== null && typeof value === 'object'
    ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'
    : JSON.stringify(value);

// Wave sizes 1,1,2,3,5,...; the root is the first wave.
// Tree uses round-robin previous-wave parents. Mesh adds same-wave
// ring edges. Chain is an equal-node alternative, not an equal-edge one.
export function topology(waves, kind = 'mesh') {
  must(int(waves, 1, MAX_WAVES) && ['chain', 'tree', 'mesh'].includes(kind), 'invalid topology');
  const groups = [], nodes = [], edges = [];
  let a = 1, b = 1;
  const keys = new Set();
  function edge(x, y, type) {
    if (x === y) return;
    const [u, v] = x < y ? [x, y] : [y, x];
    const key = u + ':' + v;
    if (keys.has(key)) return;
    keys.add(key);
    edges.push({ u, v, type, cost: 1 });
  }
  for (let wave = 0; wave < waves; wave++) {
    const group = Array.from({ length: a }, (_, i) => nodes.length + i);
    for (const [i, id] of group.entries()) {
      const parent = wave === 0 ? null : groups[wave - 1][i % groups[wave - 1].length];
      nodes.push({ id, wave, parent });
      if (id > 0) edge(kind === 'chain' ? id - 1 : parent, id, kind === 'chain' ? 'chain' : 'branch');
    }
    if (kind === 'mesh' && group.length > 1) {
      for (let i = 0; i < group.length; i++) edge(group[i], group[(i + 1) % group.length], 'lateral');
    }
    groups.push(group);
    [a, b] = [b, a + b];
  }
  edges.sort((x, y) => x.u - y.u || x.v - y.v);
  return { schema: 'rm369/e7-topology', kind, waves, nodes, edges };
}

// Unit edge weights: deterministic BFS, ascending ID tie-breaking.
// Only paths entirely inside the explicit allowed-node set are eligible.
// Budget is edge traversal cost, not a bound on search CPU.
export function route(graph, start, end, allowed, budget, disabled = []) {
  must(int(budget, 0, MAX_BUDGET) && Array.isArray(allowed) && Array.isArray(disabled), 'invalid route policy');
  const n = graph.nodes.length;
  must(int(start, 0, n - 1) && int(end, 0, n - 1), 'invalid endpoints');
  must(Array.from(allowed).every(x => int(x, 0, n - 1)) &&
    new Set(allowed).size === allowed.length, 'invalid allowed nodes');
  const permitted = new Set(allowed);
  must(permitted.has(start) && permitted.has(end), 'endpoint not granted');
  const validEdges = new Set(graph.edges.map(e => e.u + ':' + e.v));
  must(Array.from(disabled).every(k => validEdges.has(k)) &&
    new Set(disabled).size === disabled.length, 'invalid disabled edges');
  const blocked = new Set(disabled);
  const adj = Array.from({ length: n }, () => []);
  for (const { u, v } of graph.edges) {
    if (!blocked.has(u + ':' + v) && permitted.has(u) && permitted.has(v)) {
      adj[u].push(v); adj[v].push(u);
    }
  }
  adj.forEach(a => a.sort((x, y) => x - y));
  const prev = new Map([[start, null]]), queue = [start];
  for (let i = 0; i < queue.length && !prev.has(end); i++) {
    for (const next of adj[queue[i]]) if (!prev.has(next)) {
      prev.set(next, queue[i]); queue.push(next);
    }
  }
  if (!prev.has(end)) return { status: 'unreachable', path: [], cost: null };
  const path = [];
  for (let x = end; x !== null; x = prev.get(x)) path.push(x);
  path.reverse();
  const cost = path.length - 1;
  return cost > budget ? { status: 'over-budget', path: [], cost: null } : { status: 'ok', path, cost };
}

export class BranchMesh {
  #graph;
  #fields;
  constructor(waves, depth = 3, kind = 'mesh') {
    must(int(depth, 2, 4), 'mesh field depth must be 2..4');
    this.#graph = topology(waves, kind);
    this.#fields = this.#graph.nodes.map(() => new RegionalField(depth));
  }
  graph() { return structuredClone(this.#graph); }
  fieldSnapshot(id) {
    must(int(id, 0, this.#fields.length - 1), 'invalid field');
    return this.#fields[id].snapshot();
  }
  stateDigest() {
    return sha(canonical({
      topology: this.#graph,
      fields: this.#fields.map(f => sha(f.snapshot())),
    }));
  }
  // Single targeted gear edit; route/probe grants are synthetic,
  // caller-supplied policy. State is not altered when route is denied.
  execute(request, grant) {
    must(request && grant, 'request and grant required');
    const before = this.stateDigest();
    must(request.expected_sha256 === before && grant.state_sha256 === before, 'stale mesh or grant');
    must(request.start === grant.start && request.target === grant.target &&
      request.node === grant.node && request.gear === grant.gear, 'edit not granted');
    must(int(request.budget, 1, MAX_BUDGET) && int(grant.max_budget, 1, MAX_BUDGET) &&
      request.budget <= grant.max_budget, 'budget not granted');
    const result = route(this.#graph, request.start, request.target,
      grant.allowed, request.budget - 1, grant.disabled ?? []);
    must(result.status === 'ok', result.status);
    const field = this.#fields[request.target];
    const old = field.read(request.node);
    // Copy only target field for an atomic local edit.
    const updated = RegionalField.restore(field.snapshot());
    updated.gear(request.node, request.gear);
    const newValue = updated.read(request.node);
    this.#fields[request.target] = updated;
    const receipt = {
      schema: 'rm369/e7', evidence: 'SIMULATED', authority: 'NONE',
      before_sha256: before, after_sha256: this.stateDigest(),
      start: request.start, target: request.target, node: request.node,
      gear: request.gear, before_orientation: old, after_orientation: newValue,
      path: result.path, route_cost: result.cost, used: result.cost + 1,
      remaining: request.budget - result.cost - 1,
    };
    receipt.receipt_sha256 = sha(canonical(receipt));
    return receipt;
  }
}

// Equal-node, unequal-edge topology control; all unordered pairs.
// Also remove each topology's first edge independently as a failure fixture.
export function study(waves = 7) {
  return ['chain', 'tree', 'mesh'].map(kind => {
    const graph = topology(waves, kind), allowed = graph.nodes.map(n => n.id);
    let distance = 0, reachable = 0, within4 = 0, afterFailure = 0, maxDistance = 0;
    const first = graph.edges[0];
    const disabled = first ? [first.u + ':' + first.v] : [];
    for (let a = 0; a < allowed.length; a++) for (let b = a + 1; b < allowed.length; b++) {
      const r = route(graph, a, b, allowed, MAX_BUDGET);
      if (r.status === 'ok') {
        reachable++; distance += r.cost; maxDistance = Math.max(maxDistance, r.cost);
        if (r.cost <= 4) within4++;
      }
      if (route(graph, a, b, allowed, MAX_BUDGET, disabled).status === 'ok') afterFailure++;
    }
    return { kind, waves, nodes: allowed.length, edges: graph.edges.length, reachable,
      mean_distance: reachable ? distance / reachable : 0, max_distance: maxDistance,
      within4, first_edge_failure_reachable: afterFailure };
  });
}
