import { runABL, verifyABLReceipts } from '../src/abl-belt.mjs';

const program = `# ABL R0: navigate into detail, execute an allowed gear, fold, and reconstruct
DESCEND 3
OBSERVE bits
GEAR count-ones
EXECUTE
FOLD bits
UNFOLD bits
ASCEND
RETURN`;
const pockets = {
  root: { fields: { summary: 5 }, links: [] },
  'root/3': { fields: { bits: '10110110' }, links: [] }
};
const grants = {
  root: { descend: ['3'] },
  'root/3': { observe: ['bits'], gear: ['count-ones'], execute: ['count-ones'],
    fold: ['bits'], unfold: ['bits'], ascend: ['..'] }
};
const result = runABL({ program, pockets, grants });
console.log(JSON.stringify({ ...result, verified: verifyABLReceipts(result.receipts) }, null, 2));
