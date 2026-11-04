import {runController} from '../site/src/controller.js';
const raw=process.argv.slice(2).map(Number);
const [startSeed=369,budget=6,trainingSeeds=9,holdoutSeeds=9]=raw;
console.log(JSON.stringify(runController({startSeed,budget,trainingSeeds,holdoutSeeds}),null,2));
