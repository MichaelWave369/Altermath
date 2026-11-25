import test from 'node:test';
import assert from 'node:assert/strict';
import { topology, route, BranchMesh, study } from '../src/rm369-branch-mesh.mjs';
import { RegionalField } from '../src/rm369-regional.mjs';

test('Fibonacci waves, unique links and deterministic routing', () => {
  const graph = topology(7);
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => graph.nodes.filter(n => n.wave === i).length),
    [1, 1, 2, 3, 5, 8, 13]);
  assert.equal(graph.nodes.length, 33);
  assert.equal(graph.edges.length, 62);
  assert.equal(new Set(graph.edges.map(e => e.u + ':' + e.v)).size, 62);
  const allowed = graph.nodes.map(n => n.id);
  assert.deepEqual(route(graph, 1, 2, allowed, 2, ['1:2']), { status: 'ok', path: [1, 3, 2], cost: 2 });
  assert.equal(route(graph, 1, 2, allowed, 1, ['1:2']).status, 'over-budget');
  assert.equal(route(graph, 1, 2, [1, 2], 9, ['1:2']).status, 'unreachable');
  assert.equal(route(graph, 0, 2, allowed, 9, ['0:1']).status, 'unreachable');
  assert.deepEqual(route(graph, 2, 2, [2], 0), { status: 'ok', path: [2], cost: 0 });
  assert.throws(() => route(graph, 0, 2, [0], 9));
  assert.throws(() => route(graph, 0, 2, allowed, 9, ['0:32']));
  assert.throws(() => topology(10));
});

test('targeted gear transaction, stale refusal and field isolation', () => {
  const mesh = new BranchMesh(7, 3);
  const allowed = mesh.graph().nodes.map(n => n.id);
  const before = mesh.stateDigest();
  const request = { expected_sha256: before, start: 1, target: 2, node: 10, gear: 1, budget: 3 };
  const grant = { state_sha256: before, start: 1, target: 2, node: 10, gear: 1,
    max_budget: 3, allowed, disabled: ['1:2'] };
  const original = allowed.map(id => mesh.fieldSnapshot(id));
  assert.throws(() => mesh.execute({ ...request, budget: 2 }, grant));
  assert.throws(() => mesh.execute({ ...request, gear: 3 }, grant));
  assert.throws(() => mesh.execute(request, { ...grant, allowed: [1, 2] }));
  assert.equal(mesh.stateDigest(), before);
  const receipt = mesh.execute(request, grant);
  assert.deepEqual(receipt.path, [1, 3, 2]);
  assert.equal(receipt.used, 3);
  assert.equal(receipt.remaining, 0);
  assert.equal(receipt.authority, 'NONE');
  assert.equal(receipt.after_orientation, 1);
  assert.equal(RegionalField.restore(mesh.fieldSnapshot(2)).read(10), 1);
  for (const id of allowed) if (id !== 2) assert.deepEqual(mesh.fieldSnapshot(id), original[id]);
  assert.throws(() => mesh.execute(request, grant));
  const after = mesh.stateDigest();
  mesh.execute({ ...request, expected_sha256: after, gear: 3 },
    { ...grant, state_sha256: after, gear: 3 });
  assert.equal(mesh.stateDigest(), before);
  assert.deepEqual(mesh.fieldSnapshot(2), original[2]);
});

test('equal-node controls and exhaustive single-edge failures', () => {
  const rows = study(7);
  assert.deepEqual(rows.map(r => r.nodes), [33, 33, 33]);
  assert.deepEqual(rows.map(r => r.edges), [32, 32, 62]);
  assert.ok(rows.every(r => r.reachable === 528));
  for (const row of rows) {
    assert.equal(row.failure_pairs.length, row.edges);
    const graph = topology(7, row.kind);
    const allowed = graph.nodes.map(n => n.id);
    for (const failure of row.failure_pairs) {
      // Independent all-pairs reachability using the route function.
      let reachable = 0;
      for (let a = 0; a < 33; a++) for (let b = a + 1; b < 33; b++) {
        if (route(graph, a, b, allowed, 100, [failure.edge.join(':')]).status === 'ok') reachable++;
      }
      assert.equal(failure.reachable_pairs, reachable);
    }
  }
  assert.ok(rows[2].mean_single_edge_failure_pairs > rows[1].mean_single_edge_failure_pairs);
  assert.ok(rows[2].worst_single_edge_failure_pairs < 528); // root bridge remains
});
