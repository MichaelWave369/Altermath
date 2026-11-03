import { benchmark } from '../src/phase-network.js';
const seed=process.argv[2]===undefined?369:Number(process.argv[2]);
const steps=process.argv[3]===undefined?240:Number(process.argv[3]);
const results=benchmark({seed,steps,faultAt:Math.floor(steps/6),repairAt:Math.floor(steps*3/8)});
console.log('Altermath phase lab: deterministic Kuramoto-type graph comparison');
console.log(`Seed=${seed}; steps=${steps}; 16 nodes and 32 edges per network; fault≈1/6; repair≈3/8`);
console.table(results.map(({topology,possibleCrossEdges,finalOrder,meanOrder,cumulativeCrossTransfer})=>({topology,crossEdges:possibleCrossEdges,finalOrder:+finalOrder.toFixed(4),meanOrder:+meanOrder.toFixed(4),cumulativeCrossTransfer:+cumulativeCrossTransfer.toFixed(4)})));
console.log('These are toy-model outcomes. The networks differ in cross-boundary edge count and path structure; no universal superiority is implied.');
