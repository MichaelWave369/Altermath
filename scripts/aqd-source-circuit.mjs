import {compare} from '../site/src/aqdSourceCircuit.js';
const [n='6',J='.95',field='1',samples='8',law='published']=process.argv.slice(2);
const seeds=[369,636,963,1369,1636,1963,2369,2636];
console.log(JSON.stringify({schema:'aqd-e2-ensemble-v1',runs:seeds.map(seed=>compare({n:Number(n),J:Number(J),field:Number(field),samples:Number(samples),law,seed}))},null,2));
