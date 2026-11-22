import { createHash } from 'node:crypto';
import { cosmo01Matrix } from '../src/cosmo01.js';

const data = cosmo01Matrix();
const payload = JSON.stringify(data);
const sha256 = createHash('sha256').update(payload).digest('hex');
console.log(JSON.stringify({ ...data, sha256, digestScope: 'JSON.stringify(matrix)' }, null, 2));
