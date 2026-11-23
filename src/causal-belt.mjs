// ABL Causal Pocket Machine R1: deterministic, offline, simulation-only DAG interpreter.
// This is not a concurrent executor, security boundary, model runtime, or production router.
import { createHash } from 'node:crypto';

export const CAUSAL_VERSION = 'Altermath.CausalBelt.R1';
const OPS = Object.freeze({
  DELEGATE: ['child', 'allocation'], OBSERVE: ['field'], EXECUTE: ['gear', 'source'],
  REFINE: ['field', 'source'], RETURN: ['source'], COMPOSE: ['gear', 'sources'],
  CANCEL: ['child'], FINISH: ['source']
});
const PATH = /^root(?:\/[A-Za-z0-9_-]{1,32})*$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
const GEARS = Object.freeze({ double: x => x * 2, negate: x => -x, absolute: x => Math.abs(x) });
const COMPOSERS = Object.freeze({ sum: xs => xs.reduce((a, b) => a + b, 0), maximum: xs => Math.max(...xs), minimum: xs => Math.min(...xs) });
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const sha = item => createHash('sha256').update(JSON.stringify(item)).digest('hex');
const fail = message => { throw new Error('CAUSAL_REFUSE: ' + message); };
const positive = n => Number.isSafeInteger(n) && n > 0;
const valueOK = value => typeof value === 'number' && Number.isFinite(value);
const parentOf = path => path === 'root' ? null : path.slice(0, path.lastIndexOf('/'));
const grant = (grants, pocket, kind, target) =>
  has(grants, pocket) && has(grants[pocket], kind) &&
  Array.isArray(grants[pocket][kind]) && grants[pocket][kind].includes(target);

export function compileCausalScore({ score, pockets } = {}) {
  if (!Array.isArray(score) || score.length < 1 || score.length > 128) fail('event count must be 1..128');
  if (!pockets || typeof pockets !== 'object' || Array.isArray(pockets) || !has(pockets, 'root')) fail('missing root pocket');
  const addresses = Object.keys(pockets);
  if (addresses.length > 64) fail('pocket count exceeds 64');
  for (const address of addresses) {
    if (!PATH.test(address) || address.split('/').length > 9) fail('invalid pocket path or depth');
    if (address !== 'root' && !has(pockets, parentOf(address))) fail('orphan pocket');
    const item = pockets[address];
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        !has(item, 'fields') || !item.fields || typeof item.fields !== 'object' || Array.isArray(item.fields)) fail('invalid pocket fields');
    for (const [field, value] of Object.entries(item.fields)) {
      if (!ID.test(field) || !valueOK(value)) fail('pocket fields must be finite numeric scalars');
    }
  }
  const events = new Map();
  const delegates = new Map();
  for (const event of score) {
    if (!event || typeof event !== 'object' || Array.isArray(event) || !ID.test(event.id) ||
        !has(OPS, event.op) || !has(pockets, event.pocket) || events.has(event.id)) fail('invalid or duplicate event');
    const keys = new Set(['id', 'op', 'pocket', 'deps', ...OPS[event.op]]);
    if (Object.keys(event).some(key => !keys.has(key))) fail('unexpected event field');
    if (!Array.isArray(event.deps) || event.deps.length > 32 ||
        event.deps.some(id => !ID.test(id)) || new Set(event.deps).size !== event.deps.length) fail('invalid dependency list');
    if (event.op === 'DELEGATE') {
      if (typeof event.child !== 'string' || parentOf(event.child) !== event.pocket || !has(pockets, event.child) || !positive(event.allocation)) fail('invalid delegation');
      if (delegates.has(event.child)) fail('child delegated more than once');
      delegates.set(event.child, event.id);
    }
    if (event.op === 'CANCEL' && (typeof event.child !== 'string' || parentOf(event.child) !== event.pocket)) fail('invalid cancellation target');
    if (['OBSERVE', 'REFINE'].includes(event.op) && !ID.test(event.field)) fail('invalid field');
    if (event.op === 'EXECUTE' && !has(GEARS, event.gear)) fail('unknown executor gear');
    if (event.op === 'COMPOSE' && (!has(COMPOSERS, event.gear) || !Array.isArray(event.sources) || event.sources.length < 2 || event.sources.length > 8 || new Set(event.sources).size !== event.sources.length)) fail('invalid composition');
    if (['EXECUTE', 'REFINE', 'RETURN', 'FINISH'].includes(event.op) && !ID.test(event.source)) fail('invalid data source');
    events.set(event.id, { ...event, deps: [...event.deps] });
  }
  const indegree = new Map();
  const descendants = new Map([...events.keys()].map(id => [id, []]));
  for (const event of events.values()) {
    indegree.set(event.id, event.deps.length);
    for (const dep of event.deps) {
      if (!events.has(dep) || dep === event.id) fail('missing or self dependency');
      descendants.get(dep).push(event.id);
    }
  }
  const order = []; const frontiers = [];
  let ready = [...events.keys()].filter(id => indegree.get(id) === 0).sort();
  while (ready.length) {
    frontiers.push([...ready]);
    const next = [];
    for (const id of ready) {
      order.push(events.get(id));
      for (const target of descendants.get(id)) {
        indegree.set(target, indegree.get(target) - 1);
        if (indegree.get(target) === 0) next.push(target);
      }
    }
    ready = next.sort();
  }
  if (order.length !== events.size) fail('causal dependency cycle');
  const ancestorsCache = new Map();
  const ancestors = id => {
    if (ancestorsCache.has(id)) return ancestorsCache.get(id);
    const set = new Set();
    for (const dependency of events.get(id).deps) {
      set.add(dependency);
      for (const transitive of ancestors(dependency)) set.add(transitive);
    }
    ancestorsCache.set(id, set);
    return set;
  };
  for (const event of order) {
    if (event.pocket !== 'root' && (!delegates.has(event.pocket) || !ancestors(event.id).has(delegates.get(event.pocket)))) fail('child event missing causal delegation ancestry');
    if (event.op === 'CANCEL' && (!delegates.has(event.child) || !ancestors(event.id).has(delegates.get(event.child)))) fail('cancellation must follow delegation');
    const dataRefs = event.op === 'COMPOSE' ? event.sources :
      ['EXECUTE', 'REFINE', 'RETURN', 'FINISH'].includes(event.op) ? [event.source] : [];
    for (const source of dataRefs) {
      if (!events.has(source) || !event.deps.includes(source)) fail('data source must be a direct causal dependency');
      const origin = events.get(source);
      if (event.op === 'COMPOSE') {
        if (origin.op !== 'RETURN' || parentOf(origin.pocket) !== event.pocket) fail('composition requires returned direct-child results');
      } else if (origin.pocket !== event.pocket) fail('cross-pocket data access forbidden');
    }
    if (event.op === 'RETURN' && event.pocket === 'root') fail('root may not RETURN as a child');
    if (event.op === 'FINISH' && event.pocket !== 'root') fail('only root may finish');
  }
  if (order.filter(e => e.op === 'FINISH').length !== 1) fail('exactly one FINISH required');
  return { order, frontiers };
}

export function verifyCausalReceipts(receipts) {
  if (!Array.isArray(receipts) || receipts.length < 1) return false;
  let previous = 'GENESIS';
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    if (!receipt || typeof receipt !== 'object') return false;
    const { hash, ...fields } = receipt;
    if (fields.version !== CAUSAL_VERSION || fields.index !== i + 1 || fields.previous !== previous || hash !== sha(fields)) return false;
    previous = hash;
  }
  return true;
}

export function runCausalScore({ score, pockets, grants, fuel = 40 } = {}) {
  const { order, frontiers } = compileCausalScore({ score, pockets });
  if (!grants || typeof grants !== 'object' || Array.isArray(grants) || !positive(fuel) || fuel > 10000) fail('invalid grants or root fuel');
  const balances = new Map([['root', fuel]]);
  const status = new Map([['root', 'ACTIVE']]);
  const values = new Map();
  const receipts = [];
  let previous = 'GENESIS';
  let result;
  let consumed = 0;
  const cost = op => op === 'REFINE' ? 2 : 1;
  const spend = (pocket, amount) => {
    if (status.get(pocket) !== 'ACTIVE' || (balances.get(pocket) ?? 0) < amount) fail('inactive pocket or insufficient fuel');
    balances.set(pocket, balances.get(pocket) - amount); consumed += amount;
  };
  const permission = (pocket, kind, target) => { if (!grant(grants, pocket, kind, target)) fail('permission denied for ' + kind + ' at ' + pocket); };
  const sourceValue = (event, source) => {
    if (!event.deps.includes(source) || !values.has(source)) fail('missing causal input');
    return values.get(source);
  };
  for (const event of order) {
    spend(event.pocket, cost(event.op));
    let output;
    let type = 'none';
    switch (event.op) {
      case 'DELEGATE': {
        permission(event.pocket, 'delegate', event.child);
        if (status.has(event.child) || balances.get(event.pocket) < event.allocation) fail('delegation denied or over budget');
        balances.set(event.pocket, balances.get(event.pocket) - event.allocation);
        balances.set(event.child, event.allocation); status.set(event.child, 'ACTIVE');
        break;
      }
      case 'OBSERVE':
      case 'REFINE': {
        permission(event.pocket, 'observe', event.field);
        if (event.op === 'REFINE') {
          permission(event.pocket, 'refine', event.field);
          sourceValue(event, event.source);
        }
        if (!has(pockets[event.pocket].fields, event.field)) fail('observable not present');
        output = pockets[event.pocket].fields[event.field]; type = 'number';
        break;
      }
      case 'EXECUTE': {
        permission(event.pocket, 'execute', event.gear);
        output = GEARS[event.gear](sourceValue(event, event.source)); type = 'number';
        break;
      }
      case 'RETURN': {
        permission(event.pocket, 'return', parentOf(event.pocket));
        output = sourceValue(event, event.source); type = 'number';
        const parent = parentOf(event.pocket);
        if (status.get(parent) !== 'ACTIVE') fail('return parent inactive');
        balances.set(parent, balances.get(parent) + balances.get(event.pocket));
        balances.set(event.pocket, 0); status.set(event.pocket, 'RETURNED');
        break;
      }
      case 'COMPOSE': {
        permission(event.pocket, 'compose', event.gear);
        output = COMPOSERS[event.gear](event.sources.map(s => sourceValue(event, s))); type = 'number';
        break;
      }
      case 'CANCEL': {
        permission(event.pocket, 'cancel', event.child);
        if (status.get(event.child) !== 'ACTIVE') fail('cancellation target not active');
        if ([...status].some(([path, state]) => path.startsWith(event.child + '/') && state === 'ACTIVE')) fail('cancel descendants first');
        balances.set(event.pocket, balances.get(event.pocket) + balances.get(event.child));
        balances.set(event.child, 0); status.set(event.child, 'CANCELLED');
        break;
      }
      case 'FINISH': {
        permission('root', 'finish', 'result');
        if ([...status].some(([path, state]) => path !== 'root' && state === 'ACTIVE')) fail('unfinished children');
        output = sourceValue(event, event.source); type = 'number'; result = output;
        break;
      }
      default: fail('unsupported operation');
    }
    if (type === 'number') {
      if (!valueOK(output)) fail('nonfinite computed output');
      values.set(event.id, output);
    }
    const fields = { version: CAUSAL_VERSION, index: receipts.length + 1,
      eventId: event.id, op: event.op, pocket: event.pocket, deps: [...event.deps].sort(),
      outputType: type, outputDigest: type === 'number' ? sha(output) : null,
      fuelRemaining: balances.get(event.pocket), previous };
    const hash = sha(fields);
    receipts.push({ ...fields, hash }); previous = hash;
  }
  return { version: CAUSAL_VERSION, authority: 'SIMULATED_LOCAL / NONE',
    result, events: receipts.length, fuelConsumed: consumed, rootFuelRemaining: balances.get('root'),
    frontiers, receipts, receiptHead: previous };
}
