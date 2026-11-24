import {study} from '../site/src/quasiperiodicStudy.js';
const [qubits='3',noise='.04']=process.argv.slice(2);
console.log(JSON.stringify(study({qubits:Number(qubits),noise:Number(noise)}),null,2));
