import { createWorld, FIVE_FUNCTIONS } from "./core.js";

export function demoWorld(mode = "adaptive", gain = 0.24) {
  const host = {
    id: "A", label: "Bubble A", role: "host", x: 230, y: 235,
    radius: 147, vx: 0.45, value: 0.82, permeability: 0.85
  };
  const angles = [-Math.PI/2, -Math.PI/10, Math.PI*3/10, Math.PI*7/10, Math.PI*11/10];
  const values = [0.28, 0.65, 0.4, 0.78, 0.2];
  const parts = FIVE_FUNCTIONS.map((role, i) => ({
    id: role, label: role, role, parentId: "A",
    x: host.x + Math.cos(angles[i]) * 88,
    y: host.y + Math.sin(angles[i]) * 88,
    radius: 27, value: values[i], permeability: 0.9
  }));
  const neighbor = {
    id: "B", label: "Bubble B", role: "neighbor",
    x: 754, y: 235, radius: 120, vx: -1.9,
    value: 0.08, permeability: 0.75
  };
  return createWorld({ bubbles: [host, ...parts, neighbor], mode, gain });
}
