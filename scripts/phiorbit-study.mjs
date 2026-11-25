import { fixture, replay, study } from '../src/phiorbit-scheduler.mjs';

const result = study();
const execution = replay(fixture(369, 'mixed').slice(0, 24),
  { policy: 'orbital-fallback', horizon: 32, fuel: 9 });
console.log(JSON.stringify({ ...result, execution }, null, 2));
