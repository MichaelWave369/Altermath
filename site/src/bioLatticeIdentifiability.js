/**
 * R17: mathematical underdetermination of a physical length or lifetime
 * against dimensionless Markov lattice parameters.
 *
 * Counterfactual scales are not fits, source verification or physical units
 * assigned to the actual simulator. No hardware or authority.
 */
import {simulateMarkovTransport,SWEEP_GRID} from './bioLatticeStudy.js';
import {EVIDENCE_AUDIT_SCHEMA} from './bioLatticeEvidence.js';

export const IDENTIFIABILITY_SCHEMA='altermath.bio-lattice.identifiability.v1';
const SMALL=1e-12;
const LENGTH='migration_diffusion_length';
const LIFETIME='fluorescence_lifetime';

function checkedAudit(audit){
  if(!audit||typeof audit!=='object'||Array.isArray(audit)||
     audit.schema!==EVIDENCE_AUDIT_SCHEMA||!Array.isArray(audit.records)||
     !audit.input||typeof audit.input.datasetId!=='string')
    throw new TypeError('Current R16 audit required');
  if(audit.sourceVerified!==false||audit.calibrationGate?.allowed!==false)
    throw new RangeError('Source/calibration authority cannot be promoted here');
  if(!['synthetic_fixture','user_reported_unverified'].includes(audit.evidenceClass))
    throw new RangeError('Unsupported evidence class');
}
function selectTarget(audit,observable,selectedId,unit){
  const matches=audit.records.filter(r=>r.observable===observable);
  if(selectedId!==null&&selectedId!==undefined&&selectedId!==''){
    if(typeof selectedId!=='string'||selectedId.length>80)
      throw new RangeError('Selected record ID invalid');
    const found=matches.find(r=>r.id===selectedId);
    if(!found)throw new RangeError('Selected record does not exist');
    matches.splice(0,matches.length,found);
  }
  if(!matches.length)return null;
  const r=matches[0];
  if(r.normalizedUnit!==unit||typeof r.normalizedValue!=='number'||
     !Number.isFinite(r.normalizedValue)||r.normalizedValue<=0)
    throw new RangeError('Target requires positive value in '+unit);
  const unc=r.uncertainty?.normalizedAbsolute;
  if(unc!==null&&unc!==undefined&&
    (typeof unc!=='number'||!Number.isFinite(unc)||unc<0))
    throw new RangeError('Invalid source uncertainty');
  return {id:r.id,observable,value:r.normalizedValue,unit,
    uncertaintyKind:r.uncertainty?.kind??'not_reported',
    absoluteUncertainty:unc??null,sampleCount:r.sampleCount??null,
    flags:[...(r.reviewFlags??[])]};
}
export function analyzeIdentifiability({
  evidenceAudit,base={},lengthId=null,lifetimeId=null
}={}){
  checkedAudit(evidenceAudit);
  if(!base||typeof base!=='object'||Array.isArray(base))
    throw new RangeError('Expected simulator configuration object');
  const allowed=new Set(['rings','protofilaments','coupling','disorder','loss','steps','seed']);
  if(Object.keys(base).some(key=>!allowed.has(key)))
    throw new RangeError('Unexpected simulator parameter');
  const config={rings:18,protofilaments:13,coupling:.38,disorder:.15,
    loss:.008,steps:32,seed:369,...base};
  if(!Number.isInteger(config.steps)||config.steps<0||config.steps>120)
    throw new RangeError('Unbounded or invalid steps');
  const length=selectTarget(evidenceAudit,LENGTH,lengthId,'nm');
  const lifetime=selectTarget(evidenceAudit,LIFETIME,lifetimeId,'ps');
  const couplingFamily=SWEEP_GRID.coupling.map(coupling=>{
    const simulated=simulateMarkovTransport({...config,coupling});
    const spread=simulated.metrics.axialSpreadSites;
    // UNVERIFIED identity: measured diffusion length = spread * nm/site.
    const scale=length&&spread>SMALL?length.value/spread:null;
    return {coupling,spreadSites:spread,
      hypotheticalNmPerSite:scale,
      couldMatchUnderUnverifiedIdentity:scale!==null&&
        Number.isFinite(scale)&&scale>0};
  });
  const lifetimeFamily=SWEEP_GRID.loss.map(loss=>{
    // UNVERIFIED identity: experimental fluorescence lifetime corresponds
    // to this arbitrary discrete per-step loss.
    const scale=lifetime&&loss>0?lifetime.value*(-Math.log1p(-loss)):null;
    return {loss,hypotheticalPsPerTick:scale,
      couldMatchUnderUnverifiedDecay:scale!==null&&
        Number.isFinite(scale)&&scale>0};
  });
  const lengthCount=couplingFamily.filter(r=>r.couldMatchUnderUnverifiedIdentity).length;
  const timeCount=lifetimeFamily.filter(r=>r.couldMatchUnderUnverifiedDecay).length;
  const requirements=[
    {id:'source',label:'Verify primary source and figure independently',
      status:'not_established',detail:'A DOI-shaped citation is not a verified result'},
    {id:'length',label:'Obtain migration-length measurement with conditions',
      status:length?'submitted_unverified':'missing',detail:length?'Source record: '+length.id:'No compatible length record'},
    {id:'lifetime',label:'Obtain measured fluorescence lifetime with conditions',
      status:lifetime?'submitted_unverified':'missing',detail:lifetime?'Source record: '+lifetime.id:'No compatible lifetime record'},
    {id:'geometry',label:'Establish measured molecular site spacing and definition',
      status:'not_established',detail:'Toy axial spread is not a measured diffusion length'},
    {id:'time',label:'Establish physical model time step from kinetics',
      status:'not_established',detail:'Toy loss does not establish molecular lifetime'},
    {id:'mechanism',label:'Derive experimentally supported transfer coupling',
      status:'not_established',detail:'Dimensionless coupling is arbitrary'},
    {id:'holdout',label:'Collect independent biological holdout replicates',
      status:'not_established',detail:'Synthetic seeds are not physical samples'}
  ];
  return {
    schema:IDENTIFIABILITY_SCHEMA,
    evidenceClass:'hypothetical_underdetermination_only',
    sourceDatasetId:evidenceAudit.input.datasetId,
    sourceEvidenceClass:evidenceAudit.evidenceClass,
    sourceVerified:false,
    calibrationGate:{allowed:false,reason:'No source or physical mapping independently established'},
    selectedRecords:{length,lifetime},
    modelConfig:{...config},
    couplingFamily,lifetimeFamily,
    identifiability:{
      matchingGeometryCandidates:lengthCount,matchingTimeCandidates:timeCount,
      lengthNonUnique:lengthCount>1,lifetimeNonUnique:timeCount>1,
      physicalParametersInferred:[],physicalParameterClaimsAllowed:0
    },
    requirements,
    assumptions:[
      'Unsupported hypothetical identity L_nm = spread_sites * nm_per_site',
      'Unsupported hypothetical identity T_ps = dt_ps / -ln(1-loss)',
      'No physical correspondence or empirical parameter inference'
    ],
    limitations:[
      'R16 evidence may be a synthetic example or unverified user submission.',
      'One reported observable cannot establish a site, clock or coupling scale.',
      'Diffusion length is not necessarily the same as spread at one fixed model time.',
      'Measured fluorescence lifetime need not equal the toy per-tick loss process.',
      'Numerical compatibility is not physical validation or consciousness evidence.',
      'No model, device, network, safety or authority settings are changed.'
    ]
  };
}
