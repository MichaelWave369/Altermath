import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSAY_PACKET_SCHEMA,ASSAY_RESULTS_SCHEMA,ASSAY_AUDIT_SCHEMA,
  ASSAY_DEFAULTS,buildAssayPacket,auditAssayResults,parseAssayResultsJson
} from '../src/bioLatticeAssay.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const packet=()=>buildAssayPacket();
test('R19 generates stable unique blinded IDs and segregates mapping key',()=>{
  const a=packet(),b=packet();
  assert.deepEqual(a,b);
  assert.equal(a.blindedManifest.schema,ASSAY_PACKET_SCHEMA);
  assert.equal(a.blindedManifest.sampleCount,9);
  assert.equal(a.blindedManifest.blindIds.length,9);
  assert.equal(new Set(a.blindedManifest.blindIds.map(x=>x.sampleId)).size,9);
  assert.ok(a.blindedManifest.blindIds.every(x=>!Object.hasOwn(x,'condition')));
  assert.ok(!JSON.stringify(a.blindedManifest).includes('"prepared"'));
  assert.equal(a.privateAssignmentKey.assignments.length,9);
  for(const name of ['prepared','perturbed','reagent_blank'])
    assert.equal(a.privateAssignmentKey.assignments.filter(x=>x.condition===name).length,3);
});
test('explicit seed changes allocation but keeps manifest IDs stable',()=>{
  const a=packet(),b=buildAssayPacket({...ASSAY_DEFAULTS,seed:370});
  assert.deepEqual(a.blindedManifest.blindIds,b.blindedManifest.blindIds);
  assert.notDeepEqual(a.privateAssignmentKey.assignments,b.privateAssignmentKey.assignments);
});
test('result template is explicitly uncollected and audit leaves calibration closed',()=>{
  const p=packet(),data=copy(p.resultsTemplate),a=auditAssayResults(p,data);
  assert.equal(data.schema,ASSAY_RESULTS_SCHEMA);
  assert.equal(a.schema,ASSAY_AUDIT_SCHEMA);
  assert.equal(a.statusCounts.not_collected,9);
  assert.equal(a.collectionComplete,false);
  assert.equal(a.sourceVerified,false);
  assert.equal(a.preregistered,false);
  assert.equal(a.calibrationGate.allowed,false);
  assert.equal(a.blindKeyExposedInAudit,false);
  assert.ok(!JSON.stringify(a).includes('privateAssignmentKey'));
  assert.ok(!JSON.stringify(a).includes('illustrativeSeed'));
});
test('a measured lifetime is unit-normalized, but absent trace and uncertainty are flagged',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.records[0]={...data.records[0],status:'measured',value:1.2};
  const a=auditAssayResults(p,data),row=a.rows[0];
  assert.equal(row.normalizedValue,1200);
  assert.equal(row.normalizedUnit,'ps');
  assert.ok(row.issues.includes('UNCERTAINTY_MISSING'));
  assert.ok(row.issues.includes('INSTRUMENT_TRACE_MISSING'));
  assert.equal(a.statusCounts.measured,1);
  assert.equal(a.collectionComplete,false);
  assert.equal(a.calibrationGate.allowed,false);
});
test('traceable readings preserve uncertainty units without claiming verification',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.instrumentRunId='RUN-0001';
  data.records[0]={...data.records[0],status:'measured',value:.8,
    absoluteUncertainty:.04,uncertaintyKind:'standard_error',
    instrumentTraceId:'TRACE-0001'};
  const a=auditAssayResults(p,data);
  assert.equal(a.rows[0].normalizedValue,800);
  assert.equal(a.rows[0].normalizedAbsoluteUncertainty,40);
  assert.equal(a.rows[0].instrumentTraceId,'TRACE-0001');
  assert.equal(a.sourceVerified,false);
});
test('no-signal and exclusions require reasons, never counterfeit a zero lifetime',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.records[0]={...data.records[0],status:'no_signal',reason:'No detectable fluorescence'};
  data.records[1]={...data.records[1],status:'excluded',reason:'Instrument trace corrupted'};
  const a=auditAssayResults(p,data);
  assert.equal(a.rows[0].normalizedValue,null);
  assert.equal(a.rows[1].normalizedValue,null);
  assert.equal(a.statusCounts.no_signal,1);
  assert.equal(a.statusCounts.excluded,1);
  data.records[0].reason=null;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records[0].reason='No detectable fluorescence';
  data.records[0].value=0;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('no fabricated missing readings or unexpected extra fields',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.records[0].value=0;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  delete data.records[0].value;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records[0].value=null;
  data.records[0].condition='prepared';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('duplicate, unknown and missing sample IDs fail closed',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.records[1].sampleId=data.records[0].sampleId;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records[1].sampleId='NOT-IN-MANIFEST';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records.pop();
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('units, observable and study must match the planned collection',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.unit='ps';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.unit='ns';data.observable='migration_diffusion_length';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.observable='fluorescence_lifetime';data.studyId='SOME-OTHER-STUDY';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('quantum yield enforces physical bounds; percent uncertainties normalize',()=>{
  const p=buildAssayPacket({observable:'fluorescence_quantum_yield',unit:'percent'});
  const data=copy(p.resultsTemplate);
  data.records[0]={...data.records[0],status:'measured',value:35,
    uncertaintyKind:'standard_deviation',absoluteUncertainty:2};
  const a=auditAssayResults(p,data);
  assert.ok(Math.abs(a.rows[0].normalizedValue-.35)<1e-12);
  assert.ok(Math.abs(a.rows[0].normalizedAbsoluteUncertainty-.02)<1e-12);
  data.records[0].value=101;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('strong numeric and sampling parameter bounds reject invalid inputs',()=>{
  for(const n of [Infinity,NaN,-1,2,13,4.5])
    assert.throws(()=>buildAssayPacket({replicatesPerArm:n}),RangeError);
  assert.throws(()=>buildAssayPacket({seed:Infinity}),RangeError);
  assert.throws(()=>buildAssayPacket({seed:-1}),RangeError);
  assert.throws(()=>buildAssayPacket({unit:'ps',observable:'migration_diffusion_length'}),RangeError);
  assert.throws(()=>buildAssayPacket({studyId:'unsafe id'}),RangeError);
  assert.throws(()=>buildAssayPacket({unexpected:true}),RangeError);
});
test('invalid measurement value or uncertainty cannot silently enter the report',()=>{
  const p=packet(),data=copy(p.resultsTemplate);
  data.records[0]={...data.records[0],status:'measured',value:Infinity};
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records[0].value=0.7;
  data.records[0].absoluteUncertainty=Infinity;
  data.records[0].uncertaintyKind='standard_error';
  assert.throws(()=>auditAssayResults(p,data),RangeError);
  data.records[0].absoluteUncertainty=0;
  assert.throws(()=>auditAssayResults(p,data),RangeError);
});
test('strict JSON parsing rejects invalid or oversize content',()=>{
  const data=packet().resultsTemplate;
  assert.deepEqual(parseAssayResultsJson(JSON.stringify(data)),data);
  assert.throws(()=>parseAssayResultsJson('{broken'),SyntaxError);
  assert.throws(()=>parseAssayResultsJson('a'.repeat(65537)),RangeError);
});
