import {runReplications} from '../site/src/replications.js';
const args=process.argv.slice(2);
const integers=args.map(x=>Number(x));
const [startSeed=369,splitCount=3,trainingSeeds=3,holdoutSeeds=3,budget=6]=integers;
const report=runReplications({startSeed,splitCount,trainingSeeds,holdoutSeeds,budget});
console.log(JSON.stringify(report,null,2));
