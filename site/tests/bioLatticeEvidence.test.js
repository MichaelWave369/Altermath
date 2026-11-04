import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVIDENCE_SCHEMA,EVIDENCE_AUDIT_SCHEMA,EVIDENCE_MAX_CHARS,
  SYNTHETIC_EVIDENCE_EXAMPLE,parseEvidenceJson,validateEvidence,auditEvidence
} from '../src/bioLatticeEvidence.js';

const clone=value=>JSON.parse(JSON.stringify(value));
function reported(){
  const d=clone(SYNTHETIC_EVIDENCE_EXAMPLE);
  d.classification='reported_experimental_measurement';
  d.datasetId='candidate-figure-a';
  d.citation={doi:'10.1021/acscentsci.2c01114',locator:'Figure label supplied by reviewer; verify independently'};
  return d;
}
test('example is always a synthetic fixture and calibration remains closed',()=>{
  const r=auditEvidence(SYNTHETIC_EVIDENCE_EXAMPLE);
  assert.equal(r.schema,EVIDENCE_AUDIT_SCHEMA);
  assert.equal(r.evidenceClass,'synthetic_fixture');
  assert.equal(r.reviewStatus,'DEMONSTRATION_ONLY');
  assert.equal(r.sourceVerified,false);
  assert.equal(r.calibrationGate.allowed,false);
  assert.ok(r.reviewFlags.includes('SYNTHETIC_FIXTURE_NOT_A_MEASUREMENT'));
  assert.equal(r.records.length,2);
});
test('unit conversion is dimensionally strict and preserves uncertainties',()=>{
  const r=auditEvidence(reported());
  assert.equal(r.records[0].normalizedValue,12);
  assert.equal(r.records[0].normalizedUnit,'nm');
  assert.equal(r.records[0].uncertainty.normalizedAbsolute,2);
  assert.equal(r.records[1].normalizedValue,850);
  assert.equal(r.records[1].normalizedUnit,'ps');
  assert.equal(r.records[1].uncertainty.normalizedAbsolute,null);
  assert.equal(r.evidenceClass,'user_reported_unverified');
  assert.equal(r.calibrationGate.allowed,false);
  assert.equal(r.sourceVerified,false);
  assert.ok(r.records[1].reviewFlags.includes('UNCERTAINTY_NOT_REPORTED'));
});
test('quantum yield supports percent only within its physical range',()=>{
  const d=reported();
  d.measurements=[{id:'yield',observable:'fluorescence_quantum_yield',
    value:55,unit:'percent',uncertainty:{kind:'standard_error',absolute:5},sampleCount:10}];
  const r=auditEvidence(d);
  assert.equal(r.records[0].normalizedValue,0.55);
  assert.equal(r.records[0].normalizedUnit,'fraction');
  assert.equal(r.records[0].uncertainty.normalizedAbsolute,0.05);
  d.measurements[0].value=101;
  assert.throws(()=>auditEvidence(d),RangeError);
});
test('missing sample count and unknown uncertainty type are visible, never imputed',()=>{
  const d=reported();
  d.measurements[0].sampleCount=null;
  d.measurements[0].uncertainty.kind='reported_unspecified';
  const r=auditEvidence(d);
  assert.ok(r.records[0].reviewFlags.includes('SAMPLE_COUNT_NOT_REPORTED'));
  assert.ok(r.records[0].reviewFlags.includes('UNCERTAINTY_TYPE_UNSPECIFIED'));
});
test('parsed JSON is normalized with no loss of source description or measure ids',()=>{
  const s=JSON.stringify(reported());
  const p=parseEvidenceJson(s),a=auditEvidence(JSON.parse(s));
  assert.equal(p.measurements[0].id,'demo-length');
  assert.equal(p.material.conditions,'Demonstration only; not measured');
  assert.deepEqual(a.records.map(x=>x.id),p.measurements.map(x=>x.id));
});
test('unknown units and incompatible dimensions fail closed',()=>{
  const d=reported();
  d.measurements[0].unit='ps';
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].unit='nm';
  d.measurements[0].value=-1;
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].value=NaN;
  assert.throws(()=>auditEvidence(d),RangeError);
});
test('required DOI-shaped metadata is not confused with verified evidence',()=>{
  const d=reported();
  d.citation.doi='not-a-doi';
  assert.throws(()=>auditEvidence(d),RangeError);
  d.citation.doi=null;
  assert.throws(()=>auditEvidence(d),RangeError);
  d.citation.doi='10.1000/looks-like-a-doi';
  const r=auditEvidence(d);
  assert.equal(r.sourceVerified,false);
  assert.equal(r.calibrationGate.requirements[0].satisfied,false);
});
test('structural sanitation rejects duplicate ids, unknown keys and invalid top-level values',()=>{
  const d=reported();
  d.measurements.push(clone(d.measurements[0]));
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements.pop();
  d.unexpected='surprise';
  assert.throws(()=>auditEvidence(d),RangeError);
  delete d.unexpected;
  d.measurements[0].__custom='untrusted';
  assert.throws(()=>auditEvidence(d),RangeError);
  assert.throws(()=>validateEvidence(null),TypeError);
  assert.throws(()=>validateEvidence([]),TypeError);
});
test('uncertainty must be finite, positive or exactly null for not_reported',()=>{
  const d=reported();
  d.measurements[0].uncertainty.absolute=0;
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].uncertainty.absolute=Infinity;
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].uncertainty={kind:'not_reported',absolute:1};
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].uncertainty={kind:'not_reported',absolute:null};
  assert.equal(auditEvidence(d).records[0].uncertainty.normalizedAbsolute,null);
});
test('bounds prevent unbounded uploads, unsafe identifiers and bogus sample count',()=>{
  assert.throws(()=>parseEvidenceJson('x'.repeat(EVIDENCE_MAX_CHARS+1)),RangeError);
  assert.throws(()=>parseEvidenceJson('{invalid'),SyntaxError);
  const d=reported();
  d.datasetId='x/y';
  assert.throws(()=>auditEvidence(d),RangeError);
  d.datasetId='safe-id';
  d.measurements[0].sampleCount=0;
  assert.throws(()=>auditEvidence(d),RangeError);
  d.measurements[0].sampleCount=1.5;
  assert.throws(()=>auditEvidence(d),RangeError);
});
test('schema does not accept an R13 synthetic run as physical measurement',()=>{
  const d=reported();
  d.schema='altermath.bio-lattice.holdout.v1';
  assert.throws(()=>auditEvidence(d),RangeError);
  d.schema=EVIDENCE_SCHEMA;
  d.measurements[0].observable='axialSpreadSites';
  assert.throws(()=>auditEvidence(d),RangeError);
});
