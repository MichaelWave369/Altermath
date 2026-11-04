import {runAblation} from '../site/src/ablation.js';
const args=process.argv.slice(2);
const startSeed=args[0]===undefined?369:Number(args[0]);
const seedCount=args[1]===undefined?9:Number(args[1]);
const report=runAblation({startSeed,seedCount});
console.log(JSON.stringify(report,null,2));
