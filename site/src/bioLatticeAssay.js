/**
 * R19: laboratory-facing, DRAFT-ONLY blinded-label assay packet and intake.
 * A deterministic shuffled assignment is NOT secure randomization, external
 * preregistration, measurement verification or a powered experiment.
 * Zero network, hardware, calibration, or consciousness claims.
 */
import {OBSERVABLES} from './bioLatticeEvidence.js';

export const ASSAY_PACKET_SCHEMA='altermath.bio-lattice.assay-packet.v1';
export const ASSAY_RESULTS_SCHEMA='altermath.bio-lattice.assay-results.v1';
export const ASSAY_AUDIT_SCHEMA='altermath.bio-lattice.assay-audit.v1';
export const ASSAY_MAX_JSON_CHARS=65536;
export const ASSAY_ARMS=Object.freeze([
  {id:'prepared',label:'Prepared microtubule sample'},
  {id:'perturbed',label:'Matched perturbed preparation'},
  {id:'reagent_blank',label:'Matched reagent / buffer blank'}
]);
export const ASSAY_DEFAULTS=Object.freeze({
  studyId:'ALTERMATH-R19-DEMO',observable:'fluorescence_lifetime',
  unit:'ns',replicatesPerArm:3,seed:369
});
const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const STATES=['not_collected','measured','no_signal','excluded'];
const UNCERTAINTIES=['not_reported','standard_deviation','standard_error','reported_unspecified'];
function ensureObject(o,name,fields){
  if(!o||typeof o!=='object'||Array.isArray(o))
    throw new TypeError(name+' must be an object');
  for(const key of Object.keys(o))if(!fields.includes(key))
    throw new RangeError(name+' contains unexpected field '+key);
}
const validId=(s)=>typeof s==='string'&&ID.test(s);
function shuffle(list,seed){
  let state=(seed>>>0)||1;
  const rng=()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return state>>>0;
  };
  const values=[...list];
  for(let i=values.length-1;i>0;i--){
    const j=rng()%(i+1);
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}
function checkOptions({studyId,observable,unit,replicatesPerArm,seed}){
  if(!validId(studyId))throw new RangeError('Study ID must be a safe identifier');
  if(!Object.hasOwn(OBSERVABLES,observable))
    throw new RangeError('Observable is not supported');
  if(!Object.hasOwn(OBSERVABLES[observable].factors,unit))
    throw new RangeError('Unit is incompatible with observable');
  if(!Number.isInteger(replicatesPerArm)||replicatesPerArm<3||replicatesPerArm>12)
    throw new RangeError('Draft replicate count must be 3 through 12');
  if(!Number.isInteger(seed)||seed<0||seed>2147483647)
    throw new RangeError('Invalid deterministic illustration seed');
}
export function buildAssayPacket(options={}){
  ensureObject(options,'options',Object.keys(ASSAY_DEFAULTS));
  const o={...ASSAY_DEFAULTS,...options};
  checkOptions(o);
  const arms=ASSAY_ARMS.flatMap(arm=>
    Array.from({length:o.replicatesPerArm},()=>arm.id));
  const shuffled=shuffle(arms,o.seed);
  const samples=shuffled.map((condition,index)=>({
    sampleId:'BL-'+String(index+1).padStart(3,'0'),
    stationOrder:index+1,condition
  }));
  const blindedManifest={
    schema:ASSAY_PACKET_SCHEMA,
    stage:'PROTOCOL_DRAFT_NOT_PREREGISTERED',
    studyId:o.studyId,observable:o.observable,unit:o.unit,
    sampleCount:samples.length,
    blindIds:samples.map(({sampleId,stationOrder})=>({sampleId,stationOrder})),
    design:{
      draftArmCount:ASSAY_ARMS.length,
      draftReplicatesPerArm:o.replicatesPerArm,
      missingDecisions:[
        'A domain expert must validate preparation and perturbation controls.',
        'Record instrument configuration, excitation wavelengths and temperature.',
        'Specify independent biological batch count and a justified power analysis.',
        'Freeze primary endpoint, quality thresholds, exclusions and analysis before collection.',
        'Register protocol externally before data collection for preregistration.'
      ]
    },
    warnings:[
      'Labels are pseudorandomly shuffled from a documented integer seed; NOT cryptographically secure or independently assigned.',
      'This file excludes condition labels, but the browser session that generated it can access the private key.',
      'Do not call this a blinded, approved or preregistered physical experiment without an independently run procedure.',
      'Buffer blanks may yield no meaningful lifetime; no_signal must be recorded, never converted to a fabricated zero.',
      'No data have been collected and no outcomes or real physical parameters are supplied.'
    ]
  };
  const privateAssignmentKey={
    schema:'altermath.bio-lattice.private-assignment.v1',
    stage:'DRAFT_KEY_KEEP_SEPARATE_FROM_OPERATOR',
    studyId:o.studyId,illustrativeSeed:o.seed,
    assignments:samples.map(({sampleId,condition})=>({sampleId,condition})),
    warning:'This unencrypted, reproducible key is not secure blinding. Store separately with the designated custodian.'
  };
  const resultsTemplate={
    schema:ASSAY_RESULTS_SCHEMA,
    studyId:o.studyId,observable:o.observable,unit:o.unit,
    instrumentRunId:null,
    records:samples.map(({sampleId})=>({
      sampleId,status:'not_collected',value:null,
      uncertaintyKind:'not_reported',absoluteUncertainty:null,
      instrumentTraceId:null,reason:null
    }))
  };
  return {blindedManifest,privateAssignmentKey,resultsTemplate};
}
export function parseAssayResultsJson(text){
  if(typeof text!=='string'||text.length>ASSAY_MAX_JSON_CHARS)
    throw new RangeError('Results JSON is larger than 64 KB or is not text');
  try{return JSON.parse(text);}
  catch{throw new SyntaxError('Assay results must be valid JSON');}
}
function safeOptionalText(value,name){
  if(value===null)return null;
  if(typeof value!=='string'||value.trim().length<3||value.length>160)
    throw new RangeError(name+' must be null or 3 to 160 characters');
  return value.trim();
}
export function auditAssayResults(packet,raw){
  if(!packet||!packet.blindedManifest||!packet.privateAssignmentKey)
    throw new TypeError('Expected locally generated assay packet');
  const manifest=packet.blindedManifest;
  if(manifest.schema!==ASSAY_PACKET_SCHEMA||
    !Array.isArray(manifest.blindIds)||!Number.isInteger(manifest.sampleCount)||
    manifest.sampleCount<9||manifest.sampleCount>36||
    manifest.blindIds.length!==manifest.sampleCount)
    throw new RangeError('Invalid blinded manifest');
  ensureObject(raw,'results',['schema','studyId','observable','unit','instrumentRunId','records']);
  if(raw.schema!==ASSAY_RESULTS_SCHEMA||raw.studyId!==manifest.studyId||
     raw.observable!==manifest.observable||raw.unit!==manifest.unit)
    throw new RangeError('Result schema or study/observable/unit mismatch');
  const instrumentRunId=safeOptionalText(raw.instrumentRunId,'instrumentRunId');
  if(!Array.isArray(raw.records)||raw.records.length!==manifest.sampleCount)
    throw new RangeError('Expected exactly one result per blinded sample');
  const permitted=new Set(manifest.blindIds.map(r=>r.sampleId));
  const seen=new Set();
  const spec=OBSERVABLES[manifest.observable],factor=spec.factors[manifest.unit];
  const rows=raw.records.map((r,index)=>{
    ensureObject(r,'result row '+index,
      ['sampleId','status','value','uncertaintyKind','absoluteUncertainty','instrumentTraceId','reason']);
    if(!permitted.has(r.sampleId)||seen.has(r.sampleId))
      throw new RangeError('Unknown or duplicate blinded sample id');
    seen.add(r.sampleId);
    if(!STATES.includes(r.status))
      throw new RangeError('Unsupported collection status');
    const trace=safeOptionalText(r.instrumentTraceId,'instrumentTraceId');
    const reason=safeOptionalText(r.reason,'reason');
    if(!UNCERTAINTIES.includes(r.uncertaintyKind))
      throw new RangeError('Unknown uncertainty kind');
    const issues=[];
    let normalizedValue=null,normalizedUncertainty=null;
    if(r.status==='measured'){
      if(typeof r.value!=='number'||!Number.isFinite(r.value)||
         r.value<=0||r.value*factor>spec.upper)
        throw new RangeError('Measured value is outside allowed dimensional range');
      normalizedValue=r.value*factor;
      if(r.uncertaintyKind==='not_reported'){
        if(r.absoluteUncertainty!==null)
          throw new RangeError('Unreported uncertainty requires null');
        issues.push('UNCERTAINTY_MISSING');
      }else{
        if(typeof r.absoluteUncertainty!=='number'||
           !Number.isFinite(r.absoluteUncertainty)||
           r.absoluteUncertainty<=0||r.absoluteUncertainty*factor>spec.upper)
          throw new RangeError('Invalid absolute uncertainty');
        normalizedUncertainty=r.absoluteUncertainty*factor;
        if(r.uncertaintyKind==='reported_unspecified')
          issues.push('UNCERTAINTY_KIND_UNSPECIFIED');
      }
      if(!trace)issues.push('INSTRUMENT_TRACE_MISSING');
      if(reason!==null)issues.push('UNEXPECTED_REASON_ON_MEASURED_RESULT');
    }else{
      if(r.value!==null||r.absoluteUncertainty!==null||
         r.uncertaintyKind!=='not_reported')
        throw new RangeError('Non-measured rows must retain null values and uncertainty');
      if(r.status==='not_collected'&&reason!==null)
        throw new RangeError('Uncollected rows cannot report an exclusion reason');
      if(['no_signal','excluded'].includes(r.status)&&!reason)
        throw new RangeError('No-signal and excluded rows require a reason');
      if(r.status==='not_collected')issues.push('NOT_COLLECTED');
      if(r.status==='excluded')issues.push('EXCLUDED_WITH_REASON');
      if(r.status==='no_signal')issues.push('NO_SIGNAL_REPORTED');
    }
    return {
      sampleId:r.sampleId,status:r.status,sourceValue:r.value,
      sourceUnit:manifest.unit,normalizedValue,
      normalizedUnit:spec.baseUnit,uncertaintyKind:r.uncertaintyKind,
      normalizedAbsoluteUncertainty:normalizedUncertainty,
      instrumentTraceId:trace,reason,issues
    };
  });
  if(seen.size!==manifest.sampleCount)
    throw new RangeError('Incomplete blinded manifest coverage');
  const statusCounts=Object.fromEntries(STATES.map(status=>
    [status,rows.filter(row=>row.status===status).length]));
  return {
    schema:ASSAY_AUDIT_SCHEMA,studyId:manifest.studyId,
    observable:manifest.observable,unit:manifest.unit,
    sourceVerified:false,preregistered:false,blindKeyExposedInAudit:false,
    calibrationGate:{allowed:false,reason:
      'Collection-format validation cannot verify physical experiments or map measurements to toy simulation parameters.'},
    instrumentRunId,rows,statusCounts,
    collectionComplete:statusCounts.not_collected===0,
    instrumentTracesComplete:rows.filter(x=>x.status==='measured')
      .every(x=>x.instrumentTraceId!==null)&&instrumentRunId!==null,
    limitations:[
      'Sample assignments remain absent from blinded manifest and audit report.',
      'The draft is not independently randomized, blinded, registered or powered.',
      'Validated JSON values are user-supplied and cannot verify instrument authenticity or source provenance.',
      'No arm-level effects, statistical tests, biological conclusions or calibration are computed.',
      'Missing signals, exclusions and missing uncertainties are retained explicitly.'
    ]
  };
}
