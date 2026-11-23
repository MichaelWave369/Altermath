import {createHash} from 'node:crypto';
import {cosmo04Report} from '../src/cosmo04.js';
const report=cosmo04Report();
const sha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(JSON.stringify({...report,sha256,
 digestScope:'JSON.stringify(cosmo04Report())',
 verdict:'Index wins validation but loses on heldout mesh; flat-indexed and nested tie by construction.'},null,2)+'\n');
