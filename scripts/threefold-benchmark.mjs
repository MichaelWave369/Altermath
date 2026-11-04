import {runBenchmark} from '../site/src/experiments.js';
const startSeed=process.argv[2]===undefined?369:Number(process.argv[2]);
const seedCount=process.argv[3]===undefined?9:Number(process.argv[3]);
const result=runBenchmark({startSeed,seedCount});
console.log(JSON.stringify(result,null,2));
