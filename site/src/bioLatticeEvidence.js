/**
 * R16 Evidence Gate. Validates caller-supplied experimental reports, not the
 * truth of those reports. No fetch, automatic calibration, parameter fitting,
 * device interaction, or inference about biology/awareness.
 */
export const EVIDENCE_SCHEMA='altermath.bio-lattice.evidence.v1';
export const EVIDENCE_AUDIT_SCHEMA='altermath.bio-lattice.evidence-audit.v1';
export const EVIDENCE_MAX_CHARS=65536;

export const OBSERVABLES=Object.freeze({
  migration_diffusion_length:Object.freeze({
    label:'Energy-migration diffusion length',
    baseUnit:'nm',factors:Object.freeze({nm:1,um:1000}),
    lower:0,upper:1e9
  }),
  fluorescence_lifetime:Object.freeze({
    label:'Fluorescence lifetime',
    baseUnit:'ps',factors:Object.freeze({ps:1,ns:1000}),
    lower:0,upper:1e12
  }),
  fluorescence_quantum_yield:Object.freeze({
    label:'Fluorescence quantum yield',
    baseUnit:'fraction',factors:Object.freeze({fraction:1,percent:0.01}),
    lower:0,upper:1
  })
});
const UNCERTAINTY_KINDS=Object.freeze([
  'standard_deviation','standard_error','reported_unspecified','not_reported'
]);
const MATERIAL_KINDS=Object.freeze([
  'microtubule','tryptophan_network','other'
]);
const DOI_PATTERN=/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;
const present=(x)=>typeof x==='string'&&x.trim().length>0;
const plain=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
function requireObject(value,name,expected){
  if(!plain(value))throw new TypeError(name+' must be a JSON object');
  const allowed=new Set(expected);
  for(const key of Object.keys(value))
    if(!allowed.has(key))throw new RangeError(name+' has unsupported field: '+key);
}
function stringField(value,name,min=1,max=200){
  if(typeof value!=='string'||value.trim().length<min||value.length>max)
    throw new RangeError(name+' must contain '+min+'..'+max+' characters');
  return value.trim();
}
function finiteNumber(value,name,min,max,inclusiveLower=false){
  if(typeof value!=='number'||!Number.isFinite(value)||
     (inclusiveLower?value<min:value<=min)||value>max)
    throw new RangeError(name+' must be finite and in its declared physical range');
  return value;
}
function integerOrNull(value,name){
  if(value===null)return null;
  if(!Number.isSafeInteger(value)||value<1||value>1000000000)
    throw new RangeError(name+' must be null or a positive integer');
  return value;
}
const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const fixture={
  schema:EVIDENCE_SCHEMA,classification:'synthetic_fixture',
  datasetId:'EXAMPLE-NOT-REAL-DATA',
  citation:{doi:null,locator:'Synthetic example; no publication'},
  material:{kind:'microtubule',preparation:'Imaginary laboratory preparation',
    conditions:'Demonstration only; not measured'},
  measurements:[
    {id:'demo-length',observable:'migration_diffusion_length',
      value:0.012,unit:'um',
      uncertainty:{kind:'standard_deviation',absolute:0.002},
      sampleCount:5},
    {id:'demo-lifetime',observable:'fluorescence_lifetime',
      value:0.85,unit:'ns',
      uncertainty:{kind:'not_reported',absolute:null},
      sampleCount:null}
  ]
};
export const SYNTHETIC_EVIDENCE_EXAMPLE=Object.freeze(fixture);

export function parseEvidenceJson(text){
  if(typeof text!=='string'||text.length>EVIDENCE_MAX_CHARS)
    throw new RangeError('JSON input must be text of at most 65536 characters');
  let parsed;
  try{parsed=JSON.parse(text);}
  catch{throw new SyntaxError('Expected valid evidence JSON');}
  validateEvidence(parsed);
  return parsed;
}

export function validateEvidence(input){
  requireObject(input,'dataset',
    ['schema','classification','datasetId','citation','material','measurements']);
  if(input.schema!==EVIDENCE_SCHEMA)throw new RangeError('Unsupported evidence schema');
  if(!['synthetic_fixture','reported_experimental_measurement'].includes(input.classification))
    throw new RangeError('Unsupported evidence classification');
  const id=stringField(input.datasetId,'datasetId',1,80);
  if(!ID.test(id))throw new RangeError('datasetId must contain only safe identifier characters');
  requireObject(input.citation,'citation',['doi','locator']);
  const locator=stringField(input.citation.locator,'citation.locator',5,160);
  const doi=input.citation.doi;
  if(input.classification==='reported_experimental_measurement'){
    if(!present(doi)||doi.length>200||!DOI_PATTERN.test(doi.trim()))
      throw new RangeError('Reported measurements require a DOI-shaped citation');
  }else if(doi!==null&&(!present(doi)||doi.length>200||!DOI_PATTERN.test(doi.trim()))){
    throw new RangeError('Synthetic citation DOI must be null or DOI-shaped');
  }
  requireObject(input.material,'material',['kind','preparation','conditions']);
  if(!MATERIAL_KINDS.includes(input.material.kind))
    throw new RangeError('Unsupported material type');
  const preparation=stringField(input.material.preparation,'material.preparation',3,240);
  const conditions=stringField(input.material.conditions,'material.conditions',3,240);
  if(!Array.isArray(input.measurements)||input.measurements.length<1||
     input.measurements.length>20)
    throw new RangeError('measurements must have 1..20 entries');
  const seen=new Set();
  const measurements=input.measurements.map((item,index)=>{
    const name='measurements['+index+']';
    requireObject(item,name,['id','observable','value','unit','uncertainty','sampleCount']);
    const mid=stringField(item.id,name+'.id',1,80);
    if(!ID.test(mid)||seen.has(mid))throw new RangeError('Duplicate or malformed measurement id');
    seen.add(mid);
    if(!Object.hasOwn(OBSERVABLES,item.observable))
      throw new RangeError(name+'.observable is not supported');
    const spec=OBSERVABLES[item.observable];
    if(!Object.hasOwn(spec.factors,item.unit))
      throw new RangeError(name+'.unit is dimensionally incompatible');
    const factor=spec.factors[item.unit];
    const value=finiteNumber(item.value,name+'.value',spec.lower,spec.upper/factor,
      item.observable==='fluorescence_quantum_yield');
    const normalized=value*factor;
    if(!Number.isFinite(normalized)||normalized>spec.upper||
       (item.observable!=='fluorescence_quantum_yield'&&normalized<=spec.lower))
      throw new RangeError(name+'.value exceeds normalized physical range');
    requireObject(item.uncertainty,name+'.uncertainty',['kind','absolute']);
    if(!UNCERTAINTY_KINDS.includes(item.uncertainty.kind))
      throw new RangeError(name+'.uncertainty.kind is invalid');
    let uncertainty=null;
    if(item.uncertainty.kind==='not_reported'){
      if(item.uncertainty.absolute!==null)
        throw new RangeError('not_reported uncertainty must have absolute=null');
    }else{
      const absolute=finiteNumber(item.uncertainty.absolute,name+'.uncertainty.absolute',
        0,spec.upper/factor);
      uncertainty=absolute*factor;
      if(!Number.isFinite(uncertainty)||uncertainty>spec.upper)
        throw new RangeError(name+'.uncertainty overflows base units');
    }
    return {
      id:mid,observable:item.observable,sourceValue:value,sourceUnit:item.unit,
      normalizedValue:normalized,normalizedUnit:spec.baseUnit,
      uncertainty:{
        kind:item.uncertainty.kind,
        sourceAbsolute:item.uncertainty.absolute,
        normalizedAbsolute:uncertainty
      },
      sampleCount:integerOrNull(item.sampleCount,name+'.sampleCount')
    };
  });
  return {
    schema:EVIDENCE_SCHEMA,classification:input.classification,datasetId:id,
    citation:{doi:doi===null?null:doi.trim(),locator},
    material:{kind:input.material.kind,preparation,conditions},
    measurements
  };
}

export function auditEvidence(input){
  const normalized=validateEvidence(input);
  const flags=[];
  const isFixture=normalized.classification==='synthetic_fixture';
  flags.push(isFixture?'SYNTHETIC_FIXTURE_NOT_A_MEASUREMENT':
    'SOURCE_NOT_INDEPENDENTLY_VERIFIED');
  const records=normalized.measurements.map(item=>{
    const review=[];
    if(item.sampleCount===null)review.push('SAMPLE_COUNT_NOT_REPORTED');
    if(item.uncertainty.kind==='not_reported')
      review.push('UNCERTAINTY_NOT_REPORTED');
    if(item.uncertainty.kind==='reported_unspecified')
      review.push('UNCERTAINTY_TYPE_UNSPECIFIED');
    return {...item,reviewFlags:review};
  });
  if(records.some(r=>r.reviewFlags.length))flags.push('MEASUREMENT_METADATA_INCOMPLETE');
  const requirements=[
    {id:'source_verified',label:'Source and figure independently checked',satisfied:false},
    {id:'site_spacing',label:'Measured mapping from numerical lattice sites to physical distance',satisfied:false},
    {id:'time_mapping',label:'Measured mapping from numerical ticks to physical time',satisfied:false},
    {id:'mechanism',label:'Experimentally supported correspondence from simulator couplings to optical mechanism',satisfied:false},
    {id:'heldout_physical',label:'Independent physical holdout with uncertainty and conditions',satisfied:false}
  ];
  return {
    schema:EVIDENCE_AUDIT_SCHEMA,
    evidenceClass:isFixture?'synthetic_fixture':'user_reported_unverified',
    sourceVerified:false,
    reviewStatus:isFixture?'DEMONSTRATION_ONLY':'AWAITING_INDEPENDENT_SOURCE_REVIEW',
    input:{classification:normalized.classification,datasetId:normalized.datasetId,
      citation:normalized.citation,material:normalized.material},
    records,reviewFlags:flags,
    calibrationGate:{allowed:false,reason:
      'A DOI-shaped string and validated units cannot establish experimental truth or map dimensionless toy-model parameters to physics.',
      requirements},
    limitations:[
      'The browser cannot verify that a reported DOI supports a specific value or uncertainty; citation fields are user assertions.',
      'Unit conversions preserve dimensionality but do not turn axial lattice spread into an experimental diffusion length.',
      'No averaging across incompatible experimental conditions or statistical uncertainty types is performed.',
      'No calibration, fit, numerical parameter promotion, runtime authority or consciousness conclusions.'
    ]
  };
}
