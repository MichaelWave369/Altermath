import {createHash} from 'node:crypto';
import {cosmo03Report} from '../src/cosmo03.js';
const seed=process.argv[2]===undefined?369:Number(process.argv[2]);
const report=cosmo03Report({seed});
const digest=createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(JSON.stringify({...report,sha256:digest,
  digestScope:'JSON.stringify(cosmo03Report({seed}))',
  caveat:'Synthetic analytic oracle; equality is not a measured AI advantage'},null,2)+'\n');
