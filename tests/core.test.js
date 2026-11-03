import test from "node:test";
import assert from "node:assert/strict";
import {
  FIVE_FUNCTIONS, createWorld, findJunctions, stepWorld, metrics,
  injectSignal, withMode, withGain
} from "../src/core.js";
import { demoWorld } from "../src/demo.js";

const b = (id, props = {}) => ({
  id, x: 90, y: 90, radius: 30, value: id === "a" ? 1 : 0, ...props
});
const world = (bubbles, opts = {}) =>
  createWorld({ bubbles, width: 400, height: 300, ...opts });

test("five functional roles and a separate relational junction concept", () => {
  assert.equal(FIVE_FUNCTIONS.length, 5);
  assert.equal(new Set(FIVE_FUNCTIONS).size, 5);
});
test("duplicate ids, missing parents and cycles fail validation", () => {
  assert.throws(() => world([b("a"), b("a")]), /Duplicate/);
  assert.throws(() => world([b("a", { parentId: "missing" })]), /Missing parent/);
  assert.throws(() => world([b("a", { parentId: "b" }), b("b", { parentId: "a" })]), /cycle/);
});
test("a direct nested child connects without requiring geometric contact", () => {
  const links = findJunctions([b("a"), b("b", { x: 320, parentId: "a" })]);
  assert.equal(links.length, 1);
  assert.equal(links[0].kind, "intra");
});
test("two separate roots form an inter-junction only at contact", () => {
  assert.equal(findJunctions([b("a"), b("b", { x: 300 })]).length, 0);
  assert.equal(findJunctions([b("a"), b("b", { x: 140 })])[0].kind, "inter");
});
test("a child cannot bypass its parent to connect to external root", () => {
  const links = findJunctions([b("a"), b("child", { parentId: "a" }), b("other")]);
  assert.deepEqual(links.map(j => j.id), ["a::child", "a::other"]);
});
test("permissions and channel compatibility prevent unauthorized junctions", () => {
  assert.equal(findJunctions([b("a", { boundary: { outbound: [] } }), b("b")]).length, 0);
  assert.equal(findJunctions([b("a", { channels: ["a"] }), b("b", { channels: ["b"] })]).length, 0);
});
test("diffusion is deterministic, conservative and converges", () => {
  let w = world([b("a"), b("b")], { gain: 0.5 });
  const total = metrics(w).totalSignal;
  for (let i = 0; i < 30; i++) w = stepWorld(w);
  assert.ok(Math.abs(metrics(w).totalSignal - total) < 1e-10);
  assert.ok(Math.abs(w.bubbles[0].value - w.bubbles[1].value) < 1e-5);
  assert.ok(w.cumulativeTransfer > 0);
  assert.equal(w.events[0].type, "altermath");
});
test("adaptive mode opens a new connection after moving into contact", () => {
  const setup = [b("a", { x: 100 }), b("b", { x: 290, vx: -20 })];
  let a = world(setup, { mode: "adaptive" });
  let f = world(setup, { mode: "fixed" });
  for (let i = 0; i < 7; i++) { a = stepWorld(a); f = stepWorld(f); }
  assert.equal(a.activeJunctions.length, 1);
  assert.equal(f.activeJunctions.length, 0);
});
test("isolated mode has no junction; injection changes total signal explicitly", () => {
  const initial = world([b("a"), b("b")], { mode: "isolated" });
  const changed = stepWorld(initial);
  assert.equal(changed.activeJunctions.length, 0);
  assert.equal(metrics(changed).totalSignal, 1);
  const injected = injectSignal(changed, "b", 0.2);
  assert.equal(metrics(injected).totalSignal, 1.2);
  assert.equal(injected.events[0].type, "injection");
  assert.equal(withMode(injected, "adaptive").mode, "adaptive");
  assert.equal(withGain(injected, 0.8).gain, 0.8);
});
test("demo has five nested subdomains, a host, and a separate neighbor", () => {
  const w = demoWorld();
  assert.equal(w.bubbles.length, 7);
  assert.equal(w.activeJunctions.filter(j => j.kind === "intra").length, 5);
});
