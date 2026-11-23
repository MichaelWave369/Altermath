import { createHash } from 'node:crypto';
import { cosmo02Census } from '../src/cosmo02.js';
const report=cosmo02Census();
const canonical=JSON.stringify(report);
const sha256=createHash('sha256').update(canonical).digest('hex');
process.stdout.write(JSON.stringify({...report,sha256,
  digestScope:'JSON.stringify(cosmo02Census())'},null,2)+'\n');
