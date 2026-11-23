import { runCausalScore, verifyCausalReceipts } from '../src/causal-belt.mjs';

// Tiny, offline, synthetic fixture: two delegated pockets return metrics to the root.
const pockets = {
  root: { fields: {} },
  'root/network': { fields: { latency: 16 } },
  'root/render': { fields: { frame: 9, refinedFrame: 12 } }
};
const grants = {
  root: { delegate: ['root/network', 'root/render'], compose: ['sum'], finish: ['result'] },
  'root/network': { observe: ['latency'], execute: ['double'], return: ['root'] },
  'root/render': { observe: ['frame', 'refinedFrame'], refine: ['refinedFrame'], return: ['root'] }
};
const score = [
  { id: 'delegate_net', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/network', allocation: 7 },
  { id: 'delegate_render', op: 'DELEGATE', pocket: 'root', deps: [], child: 'root/render', allocation: 7 },
  { id: 'net_read', op: 'OBSERVE', pocket: 'root/network', deps: ['delegate_net'], field: 'latency' },
  { id: 'net_double', op: 'EXECUTE', pocket: 'root/network', deps: ['net_read'], gear: 'double', source: 'net_read' },
  { id: 'net_return', op: 'RETURN', pocket: 'root/network', deps: ['net_double'], source: 'net_double' },
  { id: 'render_read', op: 'OBSERVE', pocket: 'root/render', deps: ['delegate_render'], field: 'frame' },
  { id: 'render_detail', op: 'REFINE', pocket: 'root/render', deps: ['render_read'], field: 'refinedFrame', source: 'render_read' },
  { id: 'render_return', op: 'RETURN', pocket: 'root/render', deps: ['render_detail'], source: 'render_detail' },
  { id: 'compose', op: 'COMPOSE', pocket: 'root', deps: ['net_return', 'render_return'], gear: 'sum', sources: ['net_return', 'render_return'] },
  { id: 'finish', op: 'FINISH', pocket: 'root', deps: ['compose'], source: 'compose' }
];
const run = runCausalScore({ score, pockets, grants, fuel: 40 });
console.log(JSON.stringify({
  researchOnly: true, authority: run.authority, result: run.result,
  events: run.events, totalFuelConsumed: run.fuelConsumed,
  rootFuelRemaining: run.rootFuelRemaining,
  readyFrontiers: run.frontiers, verifiedLocalHashChain: verifyCausalReceipts(run.receipts),
  receiptHead: run.receiptHead, receipts: run.receipts
}, null, 2));
