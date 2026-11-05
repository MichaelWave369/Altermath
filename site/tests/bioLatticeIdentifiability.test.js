import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeIdentifiability,IDENTIFIABILITY_SCHEMA}
  from '../src/bioLatticeIdentifiability.js';
import {auditEvidence,SYNTHETIC_EVIDENCE_EXAMPLE}
  from '../src/bioLatticeEvidence.js';

const audit=()=>auditEvidence(SYNTHETIC_EVIDENCE_EXAMPLE);
const base={rings:8,protofilaments:9,coupling:.4,disorder:.2,
  loss:.01,steps:10,seed:369};
const run=()=>analyzeIdentifiability({evidenceAudit:audit(),base});

test('R17 never opens physical calibration for a fixture',()=>{
  const r=run();
  assert.equal(r.schema,IDENTIFIABILITY_SCHEMA);
  assert.equal(r.evidenceClass,'hypothetical_underdetermination_only');
  assert.equal(r.sourceVerified,false);
  assert.equal(r.calibrationGate.allowed,false);
  assert.deepEqual(r.identifiability.physicalParametersInferred,[]);
});
test('multiple toy couplings can match the same claimed length by rescaling',()=>{
  const r=run(),L=r.selectedRecords.length.value;
  assert.equal(r.couplingFamily.length,5);
  assert.equal(r.identifiability.matchingGeometryCandidates,4);
  for(const x of r.couplingFamily.filter(x=>x.couldMatchUnderUnverifiedIdentity))
    assert.ok(Math.abs(x.spreadSites*x.hypotheticalNmPerSite-L)<1e-9);
  assert.equal(r.identifiability.lengthNonUnique,true);
});
test('multiple toy losses can match the same claimed lifetime by rescaling',()=>{
  const r=run(),T=r.selectedRecords.lifetime.value;
  assert.equal(r.lifetimeFamily.length,5);
  assert.equal(r.identifiability.matchingTimeCandidates,4);
  for(const x of r.lifetimeFamily.filter(x=>x.couldMatchUnderUnverifiedDecay))
    assert.ok(Math.abs(x.hypotheticalPsPerTick/(-Math.log1p(-x.loss))-T)<1e-8);
  assert.equal(r.identifiability.lifetimeNonUnique,true);
});
test('zero coupling and zero loss produce undefined mapping, never Infinity',()=>{
  const r=run();
  assert.equal(r.couplingFamily[0].spreadSites,0);
  assert.equal(r.couplingFamily[0].hypotheticalNmPerSite,null);
  assert.equal(r.lifetimeFamily[0].hypotheticalPsPerTick,null);
});
test('the full synthetic report is deterministic and keeps units/uncertainty',()=>{
  assert.deepEqual(run(),run());
  const r=run().selectedRecords.length;
  assert.equal(r.value,12);
  assert.equal(r.unit,'nm');
  assert.equal(r.absoluteUncertainty,2);
  assert.equal(r.uncertaintyKind,'standard_deviation');
});
test('missing length and lifetime provide no scale proposals',()=>{
  const data=JSON.parse(JSON.stringify(SYNTHETIC_EVIDENCE_EXAMPLE));
  data.measurements=[{id:'quantum-yield',observable:'fluorescence_quantum_yield',
    value:50,unit:'percent',uncertainty:{kind:'standard_error',absolute:2},
    sampleCount:10}];
  const r=analyzeIdentifiability({evidenceAudit:auditEvidence(data),base});
  assert.equal(r.selectedRecords.length,null);
  assert.equal(r.selectedRecords.lifetime,null);
  assert.equal(r.identifiability.matchingGeometryCandidates,0);
  assert.equal(r.identifiability.matchingTimeCandidates,0);
  assert.equal(r.requirements.find(x=>x.id==='length').status,'missing');
});
test('a second measurement record can be explicitly selected',()=>{
  const data=JSON.parse(JSON.stringify(SYNTHETIC_EVIDENCE_EXAMPLE));
  data.measurements.push({id:'other-length',observable:'migration_diffusion_length',
    value:22,unit:'nm',uncertainty:{kind:'not_reported',absolute:null},
    sampleCount:null});
  const a=auditEvidence(data);
  const r=analyzeIdentifiability({evidenceAudit:a,base,lengthId:'other-length'});
  assert.equal(r.selectedRecords.length.value,22);
  assert.equal(r.selectedRecords.length.absoluteUncertainty,null);
  assert.throws(()=>analyzeIdentifiability({evidenceAudit:a,base,lengthId:'missing-record'}),RangeError);
});
test('R14 infinite-loop regression: invalid steps are rejected before simulation',()=>{
  for(const steps of [Infinity,NaN,-1,121,1.5])
    assert.throws(()=>analyzeIdentifiability({evidenceAudit:audit(),
      base:{...base,steps}}),RangeError);
});
test('an absent, stale or promoted R16 audit is rejected',()=>{
  assert.throws(()=>analyzeIdentifiability({evidenceAudit:null,base}),TypeError);
  const a=audit();
  a.sourceVerified=true;
  assert.throws(()=>analyzeIdentifiability({evidenceAudit:a,base}),RangeError);
  a.sourceVerified=false;
  a.calibrationGate.allowed=true;
  assert.throws(()=>analyzeIdentifiability({evidenceAudit:a,base}),RangeError);
});
test('wrong units, unknown model settings and unverified real claims fail closed',()=>{
  assert.throws(()=>analyzeIdentifiability({
    evidenceAudit:audit(),base:{...base,siteNm:10}
  }),RangeError);
  const a=audit();
  a.records[0].normalizedUnit='ps';
  assert.throws(()=>analyzeIdentifiability({evidenceAudit:a,base}),RangeError);
  const raw=JSON.parse(JSON.stringify(SYNTHETIC_EVIDENCE_EXAMPLE));
  raw.classification='reported_experimental_measurement';
  raw.citation.doi='10.1021/acscentsci.2c01114';
  const real=analyzeIdentifiability({evidenceAudit:auditEvidence(raw),base});
  assert.equal(real.sourceEvidenceClass,'user_reported_unverified');
  assert.equal(real.calibrationGate.allowed,false);
});
