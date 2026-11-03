import { PAIRS, AEONS } from '../src/pleroma-data.js';
import {
  TOPOLOGIES, createPleroma, stepPleroma, disturbSophia,
  attemptCrossing, repairSophia, pleromaMetrics, compareTopologies
} from '../src/pleroma-network.js';

const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const SVG = (tag, attrs = {}, content) => {
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (content !== undefined) e.textContent = String(content);
  return e;
};
const COLORS = { Ogdoad: '#81cfe2', Decad: '#b8a7fa', Duodecad: '#e2ad72' };
const COMPARE_COLORS = { valentinian: '#7edcc9', ring: '#e3ae76', seeded: '#b69cf7' };
let world = createPleroma();
let selectedId = 'sophia';
let playing = false;
let timer = null;
let comparison = null;

// Pairs are visual neighbors; rings indicate reported groups, not a historical diagram.
const groupRadii = { Ogdoad: 95, Decad: 190, Duodecad: 272 };
const positions = new Map();
for (const group of Object.keys(groupRadii)) {
  const groupPairs = PAIRS.filter(p => p.group === group);
  groupPairs.forEach((p, i) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / groupPairs.length);
    const base = groupRadii[group];
    for (const side of [0, 1]) {
      const spread = group === 'Ogdoad' ? 0.26 : group === 'Decad' ? 0.19 : 0.14;
      const a = angle + (side === 0 ? -spread : spread);
      positions.set(p.members[side], { x: 450 + Math.cos(a) * base, y: 310 + Math.sin(a) * base });
    }
  });
}

function renderGraph() {
  const root = $('pleroma-stage');
  const parts = [];
  // The three enclosing bands are modern display affordances.
  for (const [group, radius] of Object.entries(groupRadii)) {
    parts.push(SVG('circle', { cx:450, cy:310, r:radius, fill:'none', stroke:COLORS[group],
      'stroke-opacity':'.2', 'stroke-dasharray':'4 9', 'stroke-width':'1.3' }));
  }
  parts.push(SVG('circle', { cx:450, cy:310, r:303, fill:'none', stroke:'#8098bf',
    'stroke-opacity':'.3', 'stroke-dasharray':'2 9' }));
  parts.push(SVG('text', { x:450, y:304, 'text-anchor':'middle', class:'diagram-bg-label' }, 'FULLNESS'));
  parts.push(SVG('text', { x:450, y:324, 'text-anchor':'middle', fill:'#b2a1cd', 'font-size':11 }, 'connected system'));
  for (const e of world.edges) {
    const a = positions.get(e.a), b = positions.get(e.b);
    parts.push(SVG('line', { x1:a.x, y1:a.y, x2:b.x, y2:b.y,
      stroke:e.enabled ? (e.type === 'syzygy' ? '#efc986' : '#7b9fbd') : '#db687c',
      'stroke-opacity':e.enabled ? (e.type === 'syzygy' ? '.88' : '.38') : '.6',
      'stroke-width':e.type === 'syzygy' ? 2.5 : 1.1,
      'stroke-dasharray':!e.enabled ? '5 5' : e.type === 'syzygy' ? '' : '3 5' }));
  }
  for (const n of world.nodes) {
    const p = positions.get(n.id);
    const active = n.id === selectedId;
    const node = SVG('g', { class:'aeon-node', tabindex:0, role:'button',
      'aria-label': `${n.label}, ${n.group}, signal ${n.value.toFixed(3)}` });
    node.append(SVG('circle', { cx:p.x, cy:p.y, r:active ? 13 : 10,
      fill:COLORS[n.group], 'fill-opacity': String(0.28 + n.value * .64),
      stroke: active ? '#fff0be' : COLORS[n.group], 'stroke-width':active ? 2.5 : 1.1 }));
    node.append(SVG('title', {}, `${n.label} · ${n.group} · state ${n.value.toFixed(4)}`));
    // Labels are placed outward from each orbital ring.
    const offset = n.group === 'Duodecad' ? 20 : 18;
    const angle = Math.atan2(p.y - 310, p.x - 450);
    const labelX = p.x + Math.cos(angle) * offset;
    const labelY = p.y + Math.sin(angle) * offset + 3;
    node.append(SVG('text', { x:labelX, y:labelY, class:'aeon-label',
      'text-anchor': Math.abs(labelX - 450) < 10 ? 'middle' : (labelX > 450 ? 'start' : 'end') }, n.label));
    node.addEventListener('click', () => { selectedId = n.id; render(); });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedId = n.id; render(); }
    });
    parts.push(node);
  }
  root.replaceChildren(...parts);
}
function render() {
  renderGraph();
  const m = pleromaMetrics(world);
  $('tick').textContent = m.tick;
  $('edges').textContent = m.activeEdges;
  $('components').textContent = m.components;
  $('difference').textContent = m.pairDifference.toFixed(4);
  $('variance').textContent = m.variance.toFixed(6);
  $('total').textContent = m.total.toFixed(4);
  $('denied').textContent = m.denied;
  $('recovered').textContent = m.recoveryTick === null ? '—' : m.recoveryTick;
  $('status').textContent = playing ? 'RUNNING' : 'PAUSED';
  $('status').className = `status ${playing ? 'running' : 'paused'}`;
  $('play').textContent = playing ? 'Pause' : 'Run';
  const n = world.nodes.find(v => v.id === selectedId);
  $('selected').replaceChildren();
  const title = document.createElement('strong'); title.textContent = n.label;
  const desc = document.createElement('span');
  desc.textContent = `${n.group} · Pair ${n.pairId} · Signal ${n.value.toFixed(4)}`;
  $('selected').append(title, desc);
  const records = world.audit.slice(0, 8);
  $('audit').replaceChildren(...(records.length ? records : [{ tick:0, type:'note', detail:'No recorded boundary or repair events.' }])
    .map(evt => {
      const li = document.createElement('li');
      li.textContent = `#${evt.tick} · ${evt.type}: ${evt.detail ?? `${evt.from} → ${evt.to} ${evt.allowed ? 'allowed' : 'denied'}`}`;
      return li;
    }));
  $('fault').disabled = world.disturbed;
  $('repair').disabled = !world.disturbed || world.repaired;
}
function stop() { playing = false; if (timer !== null) clearInterval(timer); timer = null; }
function reset() { stop(); world = createPleroma({ topology:$('topology').value }); render(); }
$('reset').addEventListener('click', reset);
$('topology').addEventListener('change', reset);
$('step').addEventListener('click', () => { stop(); world = stepPleroma(world); render(); });
$('play').addEventListener('click', () => {
  if (playing) { stop(); render(); return; }
  playing = true;
  timer = setInterval(() => { world = stepPleroma(world); render(); }, 110);
  render();
});
$('fault').addEventListener('click', () => { world = disturbSophia(world); render(); });
$('crossing').addEventListener('click', () => {
  world = attemptCrossing(world, 'sophia', 'bythus').world;
  render();
});
$('repair').addEventListener('click', () => { world = repairSophia(world); render(); });
$('benchmark').addEventListener('click', () => {
  comparison = compareTopologies({ seed:369, steps:100, repairAt:15 });
  renderComparison();
});
$('metric').addEventListener('change', () => { if (comparison) renderComparison(); });

function renderComparison() {
  if (!comparison) return;
  const rows = [];
  for (const topology of TOPOLOGIES) {
    const result = comparison.trials[topology].final;
    const tr = document.createElement('tr');
    const values = [topology === 'valentinian' ? 'Valentinian-inspired' :
      topology === 'ring' ? 'Ring + shortcuts' : 'Seeded random',
      result.pairDifference.toFixed(5), result.variance.toFixed(6),
      result.recoveryTick ?? 'Not reached', result.components];
    for (const v of values) { const td = document.createElement('td'); td.textContent = String(v); tr.append(td); }
    rows.push(tr);
  }
  $('benchmark-rows').replaceChildren(...rows);
  $('benchmark-note').textContent =
    'Reproducible seed 369, gain 0.32, 100 ticks, repair at tick 15. ' +
    'Differences show the effect of these graph constructions only, not a general performance ranking.';
  const metric = $('metric').value;
  const svg = $('benchmark-chart');
  const all = TOPOLOGIES.flatMap(k => comparison.trials[k].series.map(m => m[metric]));
  const max = Math.max(...all, 1e-6) * 1.08;
  const width = 760, left = 54, top = 16, height = 165;
  const chart = [SVG('rect', {x:0,y:0,width:830,height:220,fill:'#0b1424'})];
  for (let i = 0; i <= 4; i++) {
    const y = top + height * i / 4;
    chart.push(SVG('line', { x1:left,y1:y,x2:left+width,y2:y,stroke:'#34475f','stroke-width':.8 }));
    chart.push(SVG('text', { x:47,y:y+4,'text-anchor':'end',fill:'#b3c6dc','font-size':10 },
      (max * (1 - i / 4)).toFixed(3)));
  }
  for (const topology of TOPOLOGIES) {
    const samples = comparison.trials[topology].series;
    const points = samples.map((m, i) =>
      `${left + (width * i / (samples.length - 1))},${top + height * (1 - m[metric] / max)}`).join(' ');
    chart.push(SVG('polyline', {points,fill:'none',stroke:COMPARE_COLORS[topology],
      'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'}));
  }
  for (const t of [0,25,50,75,100]) chart.push(SVG('text', {
    x:left+width*t/100,y:203,'text-anchor':'middle',fill:'#b3c6dc','font-size':11
  },t));
  chart.push(SVG('text', {x:815,y:213,'text-anchor':'end',fill:'#809bb5','font-size':10},'TICK'));
  svg.replaceChildren(...chart);
}
render();
