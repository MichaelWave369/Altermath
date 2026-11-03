/**
 * Altermath v0.1: a deterministic permission-aware, nested-bubble toy model.
 * A sixth "point" denotes a relational junction, not a spatial dimension.
 */
export const FIVE_FUNCTIONS = Object.freeze([
  "perception", "memory", "computation", "expression", "regulation"
]);
export const MODES = Object.freeze(["adaptive", "fixed", "isolated"]);
const nearZero = 1e-10;
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const allows = (list, value) => list.includes("*") || list.includes(value);

function normalize(raw) {
  if (!raw || typeof raw.id !== "string" || !raw.id.trim()) {
    throw new Error("Bubble id must be a nonempty string");
  }
  const b = {
    id: raw.id,
    label: raw.label ?? raw.id,
    parentId: raw.parentId ?? null,
    role: raw.role ?? "system",
    x: raw.x ?? 0, y: raw.y ?? 0, radius: raw.radius ?? 30,
    vx: raw.vx ?? 0, vy: raw.vy ?? 0,
    value: raw.value ?? 0.5,
    permeability: raw.permeability ?? 1,
    channels: [...(raw.channels ?? ["signal"])],
    boundary: {
      inbound: [...(raw.boundary?.inbound ?? ["*"])],
      outbound: [...(raw.boundary?.outbound ?? ["*"])]
    }
  };
  for (const field of ["x", "y", "radius", "vx", "vy", "value", "permeability"]) {
    if (!Number.isFinite(b[field])) throw new Error(`Invalid ${field} on ${b.id}`);
  }
  if (b.radius <= 0 || b.value < 0 || b.value > 1 ||
      b.permeability < 0 || b.permeability > 1) {
    throw new Error(`Out-of-range radius, value, or permeability on ${b.id}`);
  }
  return b;
}

function validate(bubbles) {
  if (!Array.isArray(bubbles) || bubbles.length === 0) throw new Error("No bubbles supplied");
  const byId = new Map();
  for (const b of bubbles) {
    if (byId.has(b.id)) throw new Error(`Duplicate bubble id ${b.id}`);
    byId.set(b.id, b);
  }
  for (const b of bubbles) {
    const visited = new Set([b.id]);
    let parent = b.parentId;
    while (parent !== null) {
      if (!byId.has(parent)) throw new Error(`Missing parent ${parent}`);
      if (visited.has(parent)) throw new Error(`Parent cycle on ${b.id}`);
      visited.add(parent);
      parent = byId.get(parent).parentId;
    }
  }
}

function relationship(a, b) {
  if (a.parentId === b.id || b.parentId === a.id) return "intra";
  if (a.parentId === null && b.parentId === null) return "inter";
  if (a.parentId !== null && a.parentId === b.parentId) return "intra";
  return null; // No child-to-external shortcut through its parent boundary.
}
function permitted(a, b) {
  return a.channels.some(channel => b.channels.includes(channel)) &&
    allows(a.boundary.outbound, b.id) && allows(b.boundary.inbound, a.id) &&
    allows(b.boundary.outbound, a.id) && allows(a.boundary.inbound, b.id);
}

export function findJunctions(bubbles, { requireContact = true } = {}) {
  const result = [];
  for (let i = 0; i < bubbles.length; i++) {
    for (let k = i + 1; k < bubbles.length; k++) {
      const a = bubbles[i], b = bubbles[k];
      const kind = relationship(a, b);
      if (!kind || !permitted(a, b)) continue;
      const directNest = a.parentId === b.id || b.parentId === a.id;
      if (requireContact && !directNest &&
          Math.hypot(a.x - b.x, a.y - b.y) > a.radius + b.radius) continue;
      result.push({
        id: [a.id, b.id].sort().join("::"), a: a.id, b: b.id, kind,
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2
      });
    }
  }
  return result;
}

export function createWorld({
  bubbles, mode = "adaptive", gain = 0.24, width = 900, height = 480
} = {}) {
  if (!MODES.includes(mode)) throw new Error("Unknown mode");
  if (!Number.isFinite(gain) || gain < 0 || gain > 1) throw new Error("Invalid gain");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("Invalid dimensions");
  const clean = bubbles.map(normalize);
  validate(clean);
  const initial = findJunctions(clean);
  return {
    bubbles: clean, mode, gain, width, height, tick: 0,
    fixedPairs: initial.map(j => j.id),
    activeJunctions: mode === "isolated" ? [] : initial,
    events: [], cumulativeTransfer: 0
  };
}

function advanceMotion(world) {
  const byId = new Map(world.bubbles.map(b => [b.id, b]));
  const displacements = new Map();
  for (const b of world.bubbles.filter(item => item.parentId === null)) {
    let vx = b.vx, vy = b.vy;
    if (b.x + vx - b.radius < 0 || b.x + vx + b.radius > world.width) vx *= -1;
    if (b.y + vy - b.radius < 0 || b.y + vy + b.radius > world.height) vy *= -1;
    displacements.set(b.id, { x: vx, y: vy });
  }
  return world.bubbles.map(b => {
    let root = b;
    while (root.parentId !== null) root = byId.get(root.parentId);
    const shift = displacements.get(root.id);
    return {
      ...b, x: b.x + shift.x, y: b.y + shift.y,
      vx: b.parentId === null ? shift.x : b.vx,
      vy: b.parentId === null ? shift.y : b.vy
    };
  });
}

export function stepWorld(world) {
  const bubbles = advanceMotion(world);
  const allPermitted = findJunctions(bubbles, { requireContact: world.mode === "adaptive" });
  const active = world.mode === "isolated" ? [] :
    world.mode === "fixed" ?
      allPermitted.filter(j => world.fixedPairs.includes(j.id)) : allPermitted;
  const indices = new Map(bubbles.map((b, i) => [b.id, i]));
  const degree = new Map(bubbles.map(b => [b.id, 0]));
  for (const j of active) {
    degree.set(j.a, degree.get(j.a) + 1);
    degree.set(j.b, degree.get(j.b) + 1);
  }
  const delta = bubbles.map(() => 0);
  const changes = [];
  let transferred = 0;
  for (const j of active) {
    const ai = indices.get(j.a), bi = indices.get(j.b);
    const a = bubbles[ai], b = bubbles[bi];
    const divisor = Math.max(1, degree.get(a.id), degree.get(b.id));
    const flowIntoA = world.gain * Math.min(a.permeability, b.permeability) *
      (b.value - a.value) / divisor;
    delta[ai] += flowIntoA;
    delta[bi] -= flowIntoA;
    if (Math.abs(flowIntoA) > nearZero) {
      transferred += Math.abs(flowIntoA);
      changes.push({
        tick: world.tick + 1, type: "altermath", kind: j.kind,
        from: flowIntoA > 0 ? b.id : a.id,
        to: flowIntoA > 0 ? a.id : b.id,
        amount: Math.abs(flowIntoA), junction: j.id
      });
    }
  }
  return {
    ...world,
    bubbles: bubbles.map((b, i) => ({ ...b, value: clamp(b.value + delta[i], 0, 1) })),
    activeJunctions: active, tick: world.tick + 1,
    events: [...changes.reverse(), ...world.events].slice(0, 80),
    cumulativeTransfer: world.cumulativeTransfer + transferred
  };
}

export function withMode(world, mode) {
  if (!MODES.includes(mode)) throw new Error("Unknown mode");
  const initial = findJunctions(world.bubbles);
  return { ...world, mode, fixedPairs: initial.map(j => j.id),
    activeJunctions: mode === "isolated" ? [] : initial };
}
export function withGain(world, gain) {
  if (!Number.isFinite(gain) || gain < 0 || gain > 1) throw new Error("Invalid gain");
  return { ...world, gain };
}
export function injectSignal(world, id, amount = 0.25) {
  if (!world.bubbles.some(b => b.id === id)) throw new Error("Unknown bubble");
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  return {
    ...world,
    bubbles: world.bubbles.map(b => b.id === id ?
      { ...b, value: clamp(b.value + amount, 0, 1) } : b),
    events: [{ tick: world.tick, type: "injection", to: id, amount }, ...world.events].slice(0, 80)
  };
}
export function metrics(world) {
  const values = world.bubbles.map(b => b.value);
  const totalSignal = values.reduce((sum, v) => sum + v, 0);
  const mean = totalSignal / values.length;
  return {
    tick: world.tick, totalSignal,
    activeJunctions: world.activeJunctions.length,
    intra: world.activeJunctions.filter(j => j.kind === "intra").length,
    inter: world.activeJunctions.filter(j => j.kind === "inter").length,
    variance: values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
    cumulativeTransfer: world.cumulativeTransfer
  };
}
