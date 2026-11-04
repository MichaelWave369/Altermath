import {runSelection} from '../site/src/selection.js';
const args=process.argv.slice(2).map(Number);
const [startSeed=369,budget=6,trainingSeeds=9,holdoutSeeds=9]=args;
console.log(JSON.stringify(runSelection({startSeed,budget,trainingSeeds,holdoutSeeds}),null,2));
