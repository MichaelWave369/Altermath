import test from 'node:test';
import assert from 'node:assert/strict';
import { AEONS, PAIRS, LINEAGES, GROUPS } from '../src/pleroma-data.js';
import {
  TOPOLOGIES, createPleroma, disturbSophia, attemptCrossing,
  repairSophia, stepPleroma, pleromaMetrics, compareTopologies
} from '../src/pleroma-network.js';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
test('one documented scheme has 30 uniquely identified Aeons in 15 pairs', () => {
  assert.equal(AEONS.length, 30);
  assert.equal(PAIRS.length, 15);
  assert.equal(new Set(AEONS.map(n => n.id)).size, 30);
  assert.equal(new Set(AEONS.map(n => n.pairId)).size, 15);
  assert.deepEqual(GROUPS.map(group => AEONS.filter(n => n.group === group.name).length), [8, 10, 12]);
  assert.equal(AEONS.filter(n => n.id === 'sophia').length, 1);
  assert.equal(LINEAGES.length, 14);
});
test('historically reported emanations form the intended pair-level genealogy', () => {
  const byId = new Map(PAIRS.map(p => [p.id, p]));
  assert.equal(PAIRS[0].parentId, null);
  for (const p of PAIRS.slice(1)) {
    assert.ok(byId.has(p.parentId));
    const seen = new Set([p.id]); let parent = p.parentId;
    while (parent !== null) {
      assert.ok(!seen.has(parent), 'no ancestry cycle'); seen.add(parent);
      parent = byId.get(parent).parentId;
    }
  }
  assert.equal(PAIRS.at(-1).names[1], 'Sophia');
});
test('all topologies have matched nodes and edge budgets with preserved syzygies', () => {
  const initials = TOPOLOGIES.map(topology => createPleroma({ topology, seed: 13 }));
  for (const w of initials) {
    assert.equal(w.nodes.length, 30);
    assert.equal(w.edges.length, 43);
    assert.equal(new Set(w.edges.map(e => e.id)).size, 43);
    assert.equal(w.edges.filter(e => e.type === 'syzygy').length, 15);
    assert.equal(pleromaMetrics(w).components, 1);
  }
  for (const w of initials.slice(1)) {
    assert.deepEqual(w.nodes.map(n => n.value), initials[0].nodes.map(n => n.value));
  }
});
test('equal seed yields same random graph; changed seed changes it', () => {
  const edges = seed => createPleroma({ topology: 'seeded', seed }).edges.map(e => e.id);
  assert.deepEqual(edges(369), edges(369));
  assert.notDeepEqual(edges(369), edges(370));
});
test('Sophia fault explicitly injects +0.5 and severs one syzygy in each topology', () => {
  for (const topology of TOPOLOGIES) {
    const before = createPleroma({ topology });
    const after = disturbSophia(before);
    close(pleromaMetrics(after).total - pleromaMetrics(before).total, 0.5);
    assert.equal(pleromaMetrics(after).activeEdges, 42);
    assert.equal(after.edges.find(e => e.id === 'sophia::theletos').enabled, false);
    assert.equal(disturbSophia(after), after);
  }
});
test('Horos denies unauthorized Sophia to Bythus access without modifying state', () => {
  const original = disturbSophia(createPleroma());
  const { allowed, world } = attemptCrossing(original, 'sophia', 'bythus');
  assert.equal(allowed, false);
  assert.equal(world.denied, 1);
  assert.deepEqual(world.nodes, original.nodes);
  assert.deepEqual(world.edges, original.edges);
  assert.equal(world.audit[0].type, 'horos');
});
test('authorized Horos repair reconnects the severed syzygy once', () => {
  const fault = disturbSophia(createPleroma());
  const permitted = attemptCrossing(fault, 'sophia', 'theletos');
  assert.equal(permitted.allowed, true);
  const repaired = repairSophia(fault);
  assert.equal(repaired.repaired, true);
  assert.equal(pleromaMetrics(repaired).activeEdges, 43);
  assert.deepEqual(repaired.nodes, fault.nodes);
  assert.equal(repairSophia(repaired), repaired);
});
test('diffusion conserves total signal and never leaves [0,1]', () => {
  for (const topology of TOPOLOGIES) {
    let world = disturbSophia(createPleroma({ topology, gain: 0.65 }));
    const total = pleromaMetrics(world).total;
    for (let tick = 0; tick < 140; tick++) {
      if (tick === 13) world = repairSophia(world);
      world = stepPleroma(world);
      close(pleromaMetrics(world).total, total);
      assert.ok(world.nodes.every(n => n.value >= -1e-12 && n.value <= 1 + 1e-12));
    }
    assert.equal(world.tick, 140);
    assert.ok(world.transferred > 0);
  }
});
test('benchmark is deterministic and includes the same fault and repair for all three', () => {
  const a = compareTopologies({ steps: 30, seed: 212 });
  const b = compareTopologies({ steps: 30, seed: 212 });
  assert.deepEqual(a, b);
  for (const topology of TOPOLOGIES) {
    const x = a.trials[topology];
    assert.equal(x.series.length, 31);
    assert.equal(x.final.activeEdges, 43);
    assert.equal(x.final.denied, 1);
    assert.equal(x.final.tick, 30);
  }
});
test('reject malformed configurations and crossings', () => {
  assert.throws(() => createPleroma({ topology: 'magic' }), /Unknown topology/);
  assert.throws(() => createPleroma({ gain: Infinity }), /gain/);
  assert.throws(() => createPleroma({ seed: 2.4 }), /seed/);
  assert.throws(() => attemptCrossing(createPleroma(), 'noone', 'bythus'), /Unknown aeon/);
  assert.throws(() => compareTopologies({ steps: 0 }), /Invalid steps/);
  assert.throws(() => compareTopologies({ steps: 4, repairAt: 5 }), /Invalid repairAt/);
});
