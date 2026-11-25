import { causalFixture, replayCausal, studyCausal } from '../src/phiorbit-causal.mjs';

const result = studyCausal();
const execution = replayCausal(causalFixture(369, 'mixed').slice(0, 24),
  { policy: 'orbital-fallback', horizon: 40, fuel: 9 });
console.log(JSON.stringify({ ...result, execution }, null, 2));
