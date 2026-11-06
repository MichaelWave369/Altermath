#!/usr/bin/env node
import {runHorizonStudy} from '../site/src/horizonDuality.js';
// Usage: npm run horizon:duality -- [M] [a] [future step] [rapidity]
// All values are geometrized, G=c=1. Numerical comparison only.
const defaults=[1,.2,.01,.4],names=['M','a','step','eta'];
if(process.argv.slice(2).length>4)throw new Error('Expected at most four numeric arguments');
const options={};
for(let i=0;i<4;i++){
  const raw=process.argv.slice(2)[i];
  options[names[i]]=raw===undefined?defaults[i]:Number(raw);
}
process.stdout.write(JSON.stringify(runHorizonStudy(options),null,2)+'\n');
