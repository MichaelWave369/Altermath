import {
  stepWorld, withMode, withGain, injectSignal, metrics, FIVE_FUNCTIONS
} from "../src/core.js";
import { demoWorld } from "../src/demo.js";

const $ = id => document.getElementById(id);
const ns = "http://www.w3.org/2000/svg";
const svg = $("stage");
let world = demoWorld();
let playing = false;
let timer = null;

function elem(tag, attrs = {}, text) {
  const node = document.createElementNS(ns, tag);
  for (const [name, val] of Object.entries(attrs)) node.setAttribute(name, String(val));
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function draw() {
  svg.replaceChildren();
  const grid = elem("g", { opacity: "0.12", stroke: "#7d9ab8", "stroke-width": 0.6 });
  for (let x=0; x<900; x+=45) grid.append(elem("path", { d: `M${x} 0V480` }));
  for (let y=0; y<480; y+=45) grid.append(elem("path", { d: `M0 ${y}H900` }));
  svg.append(grid);
  for (const b of world.bubbles.filter(item => item.parentId === null)) {
    const color = b.id === "A" ? "#6bbfe4" : "#bc9ffa";
    svg.append(elem("circle", { cx:b.x, cy:b.y, r:b.radius, fill:color,
      "fill-opacity":0.08, stroke:color, "stroke-opacity":0.8, "stroke-width":2 }));
    svg.append(elem("circle", { cx:b.x, cy:b.y, r:b.radius-10, fill:"none",
      stroke:color, "stroke-dasharray":"5 7", "stroke-opacity":0.23 }));
  }
  for (const j of world.activeJunctions) {
    const a = world.bubbles.find(b => b.id === j.a);
    const b = world.bubbles.find(b => b.id === j.b);
    svg.append(elem("line", { x1:a.x, y1:a.y, x2:b.x, y2:b.y,
      stroke:j.kind === "intra" ? "#6cdad3" : "#ffbf6e",
      "stroke-width":j.kind === "intra" ? 1.7 : 3,
      "stroke-dasharray":j.kind === "intra" ? "3 6" : "7 4",
      "stroke-opacity":0.87 }));
    if (j.kind === "inter") {
      svg.append(elem("circle", { cx:j.x, cy:j.y, r:9, fill:"#ffbf6e", "fill-opacity":0.27 }));
      svg.append(elem("circle", { cx:j.x, cy:j.y, r:4, fill:"#ffbf6e" }));
    }
  }
  for (const b of world.bubbles.filter(item => item.parentId !== null)) {
    svg.append(elem("circle", { cx:b.x, cy:b.y, r:b.radius, fill:"#7fe5db",
      "fill-opacity":0.14 + b.value * 0.36, stroke:"#7fe5db", "stroke-width":1.5 }));
    svg.append(elem("text", { x:b.x, y:b.y + 43, "font-size":11,
      fill:"#e5f8fc", "text-anchor":"middle" }, b.role));
    svg.append(elem("text", { x:b.x, y:b.y + 4, "font-size":11,
      fill:"#081622", "font-weight":"800", "text-anchor":"middle" }, b.value.toFixed(2)));
  }
  for (const b of world.bubbles.filter(item => item.parentId === null)) {
    svg.append(elem("text", { x:b.x, y:b.y-b.radius+23, "font-size":15,
      fill:"#e9f1ff", "font-weight":"700", "text-anchor":"middle" }, b.label));
    svg.append(elem("text", { x:b.x, y:b.y+b.radius-16, "font-size":12,
      fill:"#c6d4ed", "text-anchor":"middle" }, `STATE ${b.value.toFixed(3)}`));
  }
  const m = metrics(world);
  $("tick").textContent = String(m.tick);
  $("junction-count").textContent = String(m.activeJunctions);
  $("types").textContent = `${m.intra} / ${m.inter}`;
  $("total").textContent = m.totalSignal.toFixed(4);
  $("variance").textContent = m.variance.toFixed(5);
  $("transfer").textContent = m.cumulativeTransfer.toFixed(4);
  const lines = world.events.slice(0, 9).map(e =>
    e.type === "injection" ? `#${e.tick} · Injected ${e.amount.toFixed(3)} → ${e.to}` :
      `#${e.tick} · ${e.kind} ${e.from} → ${e.to}, Δ=${e.amount.toFixed(4)}`);
  const list = $("events");
  list.replaceChildren(...(lines.length ? lines : ["No completed junction events yet."])
    .map(s => { const li = document.createElement("li"); li.textContent = s; return li; }));
  $("status").textContent = playing ? "RUNNING" : "PAUSED";
  $("play").textContent = playing ? "Pause simulation" : "Start simulation";
}
function stop() {
  playing = false;
  if (timer !== null) clearInterval(timer);
  timer = null;
}
function reset() {
  stop();
  world = demoWorld($("mode").value, Number($("gain").value));
  draw();
}
$("play").addEventListener("click", () => {
  if (playing) { stop(); draw(); return; }
  playing = true;
  timer = setInterval(() => { world = stepWorld(world); draw(); }, 65);
  draw();
});
$("step").addEventListener("click", () => { stop(); world = stepWorld(world); draw(); });
$("reset").addEventListener("click", reset);
$("inject").addEventListener("click", () => { world = injectSignal(world, "B", 0.3); draw(); });
$("mode").addEventListener("change", () => { world = withMode(world, $("mode").value); draw(); });
$("gain").addEventListener("input", () => {
  $("gain-label").textContent = Number($("gain").value).toFixed(2);
  world = withGain(world, Number($("gain").value)); draw();
});
draw();
