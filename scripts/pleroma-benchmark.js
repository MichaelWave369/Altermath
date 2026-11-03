import { compareTopologies } from '../src/pleroma-network.js';
const [seed = '369', steps = '100', repairAt = '15'] = process.argv.slice(2);
const result = compareTopologies({ seed: Number(seed), steps: Number(steps), repairAt: Number(repairAt) });
console.log(JSON.stringify({
  methodology: 'Equal 30 nodes, 15 syzygies and 43 starting edges; Sophia disturbance +0.5 and severed pair edge; Horos denial; junction repair.',
  seed: result.seed, steps: result.steps, repairAt: result.repairAt,
  results: Object.fromEntries(Object.entries(result.trials).map(([topology, trial]) => [topology, trial.final]))
}, null, 2));
