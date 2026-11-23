// Altermath Belt Language (ABL) R0: offline, deterministic research interpreter.
// No dynamic code, network, filesystem writes, model calls, or delegated authority.
import { createHash } from 'node:crypto';

export const ABL_VERSION = 'Altermath.ABL.R0';
const OPCODES = new Set(['DESCEND', 'ASCEND', 'LATERAL', 'OBSERVE', 'GEAR', 'EXECUTE', 'FOLD', 'UNFOLD', 'RETURN']);
const NEEDS_ARG = new Set(['DESCEND', 'LATERAL', 'OBSERVE', 'GEAR', 'FOLD', 'UNFOLD']);
const GEARS = Object.freeze({
  'count-ones': { input: 'bits', output: 'number', run: value => [...value].filter(v => v === '1').length },
  'reverse-bits': { input: 'bits', output: 'bits', run: value => [...value].reverse().join('') },
  double: { input: 'number', output: 'number', run: value => value * 2 }
});
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const deny = reason => { throw new Error(`ABL_REFUSE: ${reason}`); };
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isBits = value => typeof value === 'string' && /^[01]+$/.test(value) && value.length <= 4096;
const typed = value => isBits(value) ? 'bits' : typeof value === 'number' && Number.isFinite(value) ? 'number' : null;
const allowed = (grants, address, action, target) =>
  Array.isArray(grants?.[address]?.[action]) && grants[address][action].includes(target);

export function parseABL(source) {
  if (typeof source !== 'string' || source.length > 16_384) deny('program must be bounded text');
  const lines = source.split(/\r?\n/);
  const program = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    const [op, arg] = tokens;
    if (!OPCODES.has(op)) deny(`unknown opcode on line ${i + 1}`);
    const expected = NEEDS_ARG.has(op) ? 2 : 1;
    if (tokens.length !== expected || (expected === 2 && !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(arg))) {
      deny(`invalid operands on line ${i + 1}`);
    }
    program.push(Object.freeze({ op, ...(arg === undefined ? {} : { arg }), line: i + 1 }));
  }
  if (program.length === 0 || program.length > 128) deny('instruction count outside 1..128');
  if (program.at(-1).op !== 'RETURN' || program.slice(0, -1).some(x => x.op === 'RETURN')) {
    deny('exactly one terminal RETURN required');
  }
  return program;
}

export function verifyABLReceipts(receipts) {
  if (!Array.isArray(receipts)) return false;
  let previous = 'GENESIS';
  for (let i = 0; i < receipts.length; i++) {
    const { hash, ...entry } = receipts[i] ?? {};
    if (entry.version !== ABL_VERSION || entry.index !== i + 1 || entry.previous !== previous || hash !== digest(entry)) return false;
    previous = hash;
  }
  return true;
}

// The explicit grants are independent of the program: instructions can request, never grant.
export function runABL({ program, pockets, grants, start = 'root', maxSteps = 64, maxDepth = 12 } = {}) {
  const parsed = parseABL(program);
  if (!pockets || typeof pockets !== 'object' || Array.isArray(pockets) || !own(pockets, start)) deny('missing start pocket');
  if (!grants || typeof grants !== 'object' || Array.isArray(grants)) deny('missing grants');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 128) deny('invalid step budget');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 12) deny('invalid depth budget');
  if (parsed.length > maxSteps) deny('step budget exceeded');
  if (start !== 'root') deny('R0 start must be root');
  // Copy only allowlisted data shape; reject inheritance, malformed pocket addresses and values.
  const state = Object.create(null);
  for (const [addr, pocket] of Object.entries(pockets)) {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(addr) || !addr.startsWith('root') || (addr !== 'root' && !addr.startsWith('root/'))) deny('invalid pocket address');
    if (addr.split('/').length - 1 > maxDepth) deny('pocket depth exceeded');
    if (!pocket || typeof pocket !== 'object' || Array.isArray(pocket)) deny('invalid pocket');
    if (!pocket.fields || typeof pocket.fields !== 'object' || Array.isArray(pocket.fields)) deny('missing pocket fields');
    const fields = Object.create(null);
    for (const [key, value] of Object.entries(pocket.fields)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(key) || typed(value) === null) deny('unsupported field type');
      fields[key] = value;
    }
    if (!Array.isArray(pocket.links) || pocket.links.some(x => typeof x !== 'string')) deny('invalid pocket links');
    state[addr] = { fields, links: [...pocket.links] };
  }
  for (const [addr, pocket] of Object.entries(state)) {
    if (addr !== 'root' && !own(state, addr.slice(0, addr.lastIndexOf('/')))) deny('orphan pocket');
    if (pocket.links.some(x => !own(state, x))) deny('unknown lateral destination');
  }
  let current = start;
  let selectedGear = null;
  let lastValue;
  let lastType = null;
  let lastSource = null;
  let completed = false;
  const stack = [];
  const residuals = new Map();
  const receipts = [];
  let previous = 'GENESIS';
  const authorize = (action, target) => { if (!allowed(grants, current, action, target)) deny(`permission denied for ${action} at ${current}`); };
  for (const instruction of parsed) {
    const { op, arg } = instruction;
    const before = current;
    let info = null;
    switch (op) {
      case 'DESCEND': {
        const target = `${current}/${arg}`;
        authorize('descend', arg);
        if (!own(state, target)) deny('child pocket missing');
        if (target.split('/').length - 1 > maxDepth) deny('depth budget exceeded');
        stack.push(current); current = target; selectedGear = null; lastSource = null; break;
      }
      case 'ASCEND': {
        if (!stack.length) deny('no parent on navigation stack');
        authorize('ascend', '..');
        current = stack.pop(); selectedGear = null; lastSource = null; break;
      }
      case 'LATERAL': {
        authorize('lateral', arg);
        if (!state[current].links.includes(arg) || !allowed(grants, arg, 'receive', current)) deny('lateral junction refused');
        if (arg !== 'root' && arg.slice(0, arg.lastIndexOf('/')) !== current.slice(0, current.lastIndexOf('/'))) deny('R0 lateral requires same parent');
        if (stack.length === 0 || stack.at(-1) !== arg.slice(0, arg.lastIndexOf('/'))) deny('lateral navigation context mismatch');
        current = arg; selectedGear = null; lastSource = null; break;
      }
      case 'OBSERVE': {
        authorize('observe', arg);
        if (!own(state[current].fields, arg)) deny('missing observable field');
        lastValue = state[current].fields[arg]; lastType = typed(lastValue); lastSource = current;
        info = { field: arg, type: lastType }; break;
      }
      case 'GEAR': {
        authorize('gear', arg);
        if (!own(GEARS, arg)) deny('unknown local gear');
        selectedGear = arg; info = { gear: arg }; break;
      }
      case 'EXECUTE': {
        if (selectedGear === null || lastType === null || lastSource !== current) deny('missing fresh, local gear input');
        authorize('execute', selectedGear);
        const gear = GEARS[selectedGear];
        if (lastType !== gear.input) deny('gear input type mismatch');
        lastValue = gear.run(lastValue);
        lastType = gear.output;
        if (typed(lastValue) !== lastType) deny('nonfinite or unsupported gear output');
        info = { gear: selectedGear, resultType: lastType }; break;
      }
      case 'FOLD': {
        authorize('fold', arg); authorize('observe', arg);
        const bits = state[current].fields[arg];
        if (!isBits(bits)) deny('fold requires bit string');
        const summary = { length: bits.length, ones: [...bits].filter(v => v === '1').length };
        residuals.set(`${current}:${arg}`, { bits, summary, checksum: digest({ bits, summary, current, arg }) });
        // The working view is the summary, not a claim of storage savings.
        lastValue = summary.ones; lastType = 'number'; lastSource = current;
        info = { field: arg, mode: 'summary', length: bits.length }; break;
      }
      case 'UNFOLD': {
        authorize('unfold', arg);
        const r = residuals.get(`${current}:${arg}`);
        if (!r || digest({ bits: r.bits, summary: r.summary, current, arg }) !== r.checksum) deny('missing or damaged exact residual');
        if (r.bits.length !== r.summary.length || [...r.bits].filter(v => v === '1').length !== r.summary.ones) deny('residual summary mismatch');
        lastValue = r.bits; lastType = 'bits'; lastSource = current;
        info = { field: arg, mode: 'exact-reconstruction' }; break;
      }
      case 'RETURN': {
        if (stack.length || current !== start) deny('unbalanced return path');
        completed = true; break;
      }
      default: deny('unknown operation');
    }
    const receipt = {
      version: ABL_VERSION, index: receipts.length + 1,
      op, at: before, to: current, ...(info === null ? {} : { info }), previous
    };
    const hash = digest(receipt);
    receipts.push({ ...receipt, hash }); previous = hash;
  }
  if (!completed) deny('execution did not terminate');
  return Object.freeze({ ok: true, pocket: current, result: lastValue, resultType: lastType,
    receipts, receiptHead: previous, steps: receipts.length,
    // R0 archive remains in process only; its contents are intentionally excluded from receipts.
    archiveEntries: residuals.size, authority: 'SIMULATED_LOCAL / NONE' });
}
