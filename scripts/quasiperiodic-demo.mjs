import {run} from '../site/src/quasiperiodic.js';
const [seed='369',qubits='4',noise='.04',trials='3']=process.argv.slice(2);
console.log(JSON.stringify(run({seed:Number(seed),qubits:Number(qubits),noise:Number(noise),trials:Number(trials)}),null,2));
