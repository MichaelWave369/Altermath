// RM-369 E6: live regional orientation stores, bounded synthetic field.
import { encodeRM1, decodeRM1, compose } from './rm369-interop.mjs';

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const count = d => (9 ** d - 1) / 8;
const width = n => Math.max(1, Math.ceil(Math.log2(n) / 8));
const bytes = n => Math.ceil(3 * n / 8);
const valid = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

function getPacked(buf, i) {
  const bit = 3 * i, b = bit >>> 3, s = bit & 7;
  return ((buf[b] | ((buf[b + 1] ?? 0) << 8)) >>> s) & 7;
}
function setPacked(buf, i, v) {
  const bit = 3 * i, b = bit >>> 3, s = bit & 7;
  buf[b] = (buf[b] & ~(7 << s)) | ((v << s) & 255);
  if (s > 5) {
    const mask = 7 >>> (8 - s);
    buf[b + 1] = (buf[b + 1] & ~mask) | (v >>> (8 - s));
  }
}

class Region {
  constructor(n) {
    this.n = n;
    this.nonzero = 0;
    this.map = null;
    this.packed = null;
    // Hysteresis deliberately separates promote and demote thresholds.
    this.high = Math.max(1, Math.ceil(n * 0.20));
    this.low = Math.floor(n * 0.10);
  }
  get mode() { return this.packed ? 'packed' : this.map ? 'sparse' : 'dormant'; }
  read(i) { return this.packed ? getPacked(this.packed, i) : this.map?.get(i) ?? 0; }
  write(i, v) {
    const old = this.read(i);
    if (old === v) return;
    this.nonzero += Number(v !== 0) - Number(old !== 0);
    if (this.packed) setPacked(this.packed, i, v);
    else {
      this.map ??= new Map();
      if (v) this.map.set(i, v); else this.map.delete(i);
    }
    if (!this.nonzero) { this.map = null; this.packed = null; }
    else if (!this.packed && this.nonzero >= this.high) {
      this.packed = Buffer.alloc(bytes(this.n));
      for (const [k, g] of this.map) setPacked(this.packed, k, g);
      this.map = null;
    } else if (this.packed && this.nonzero <= this.low) {
      this.map = new Map(this.entries());
      this.packed = null;
    }
  }
  *entries() {
    if (this.packed) {
      for (let i = 0; i < this.n; i++) {
        const v = this.read(i);
        if (v) yield [i, v];
      }
    } else if (this.map) yield* this.map;
  }
  // Canonical wire selection is independent of the hysteretic live mode.
  encode() {
    const w = width(this.n);
    if (bytes(this.n) < this.nonzero * (w + 1)) {
      if (this.packed) return [2, Buffer.from(this.packed)];
      const body = Buffer.alloc(bytes(this.n));
      for (const [i, g] of this.entries()) setPacked(body, i, g);
      return [2, body];
    }
    const body = Buffer.alloc(this.nonzero * (w + 1));
    const sorted = [...this.entries()].sort(([a], [b]) => a - b);
    for (const [j, [i, g]] of sorted.entries()) {
      body.writeUIntBE(i, j * (w + 1), w);
      body[j * (w + 1) + w] = g;
    }
    return [1, body];
  }
}

export class RegionalField {
  constructor(depth) {
    must(valid(depth, 2, 7), 'regional depth must be 2..7');
    this.depth = depth;
    this.nodes = count(depth);
    this.regionNodes = count(depth - 1);
    this.root = 0;
    this.regions = Array.from({ length: 9 }, () => new Region(this.regionNodes));
  }
  // Global BFS IDs interleave subtrees at each level. Convert exactly.
  locate(id) {
    must(valid(id, 0, this.nodes - 1), 'invalid node ID');
    if (id === 0) return null;
    let level = 1;
    while (id >= count(level + 1)) level++;
    const stride = 9 ** (level - 1);
    const offset = id - count(level);
    return [Math.floor(offset / stride), count(level - 1) + offset % stride];
  }
  globalId(slot, local) {
    must(valid(slot, 0, 8) && valid(local, 0, this.regionNodes - 1), 'invalid local ID');
    let level = 0;
    while (local >= count(level + 1)) level++;
    return count(level + 1) + slot * 9 ** level + local - count(level);
  }
  read(id) {
    const p = this.locate(id);
    return p ? this.regions[p[0]].read(p[1]) : this.root;
  }
  write(id, value) {
    must(valid(value, 0, 7), 'invalid orientation');
    const p = this.locate(id);
    if (p) this.regions[p[0]].write(p[1], value);
    else this.root = value;
  }
  gear(id, operation) { this.write(id, compose(operation, this.read(id))); }
  modes() { return this.regions.map(r => r.mode); }
  toRM1() {
    const records = new Map();
    if (this.root) records.set(0n, this.root);
    for (const [slot, region] of this.regions.entries()) {
      for (const [i, g] of region.entries()) records.set(BigInt(this.globalId(slot, i)), g);
    }
    return encodeRM1(this.depth, records);
  }
  static fromRM1(snapshot) {
    const { depth, overrides } = decodeRM1(snapshot);
    const field = new RegionalField(depth);
    for (const [id, g] of overrides) field.write(Number(id), g);
    return field;
  }
  snapshot() {
    const parts = [Buffer.from([82, 82, 54, this.depth, this.root])];
    for (const [slot, region] of this.regions.entries()) {
      if (!region.nonzero) continue;
      const [mode, body] = region.encode();
      const header = Buffer.alloc(6);
      header[0] = slot; header[1] = mode; header.writeUInt32BE(body.length, 2);
      parts.push(header, body);
    }
    return Buffer.concat(parts);
  }
  static restore(snapshot) {
    must(Buffer.isBuffer(snapshot) && snapshot.length >= 5 &&
      snapshot.subarray(0, 3).equals(Buffer.from('RR6')), 'invalid RR6 header');
    const field = new RegionalField(snapshot[3]);
    field.write(0, snapshot[4]);
    let previous = -1, pos = 5;
    const n = field.regionNodes, w = width(n);
    while (pos < snapshot.length) {
      must(pos + 6 <= snapshot.length, 'truncated region header');
      const slot = snapshot[pos], mode = snapshot[pos + 1], size = snapshot.readUInt32BE(pos + 2);
      must(slot > previous && slot < 9 && size > 0 && pos + 6 + size <= snapshot.length,
        'invalid region envelope');
      const body = snapshot.subarray(pos + 6, pos + 6 + size);
      const region = field.regions[slot];
      if (mode === 1) {
        must(size % (w + 1) === 0 && size <= n * (w + 1), 'invalid sparse size');
        let last = -1;
        for (let i = 0; i < size; i += w + 1) {
          const key = body.readUIntBE(i, w), g = body[i + w];
          must(key > last && key < n && valid(g, 1, 7), 'invalid sparse record');
          region.write(key, g); last = key;
        }
      } else if (mode === 2) {
        must(size === bytes(n), 'invalid packed size');
        for (let i = 0; i < n; i++) {
          const v = getPacked(body, i);
          if (v) region.write(i, v);
        }
      } else throw new Error('invalid region mode');
      previous = slot; pos += 6 + size;
    }
    must(field.snapshot().equals(snapshot), 'noncanonical RR6 snapshot');
    return field;
  }
}
