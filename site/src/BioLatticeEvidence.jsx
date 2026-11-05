import {useState} from 'react';
import BioLatticeIdentifiability from './BioLatticeIdentifiability.jsx';
import {
  SYNTHETIC_EVIDENCE_EXAMPLE,parseEvidenceJson,auditEvidence,
  EVIDENCE_MAX_CHARS,OBSERVABLES
} from './bioLatticeEvidence.js';
import './bioLatticeEvidence.css';

const example=JSON.stringify(SYNTHETIC_EVIDENCE_EXAMPLE,null,2);
const LABELS={SAMPLE_COUNT_NOT_REPORTED:'Sample count missing',
  UNCERTAINTY_NOT_REPORTED:'Uncertainty not reported',
  UNCERTAINTY_TYPE_UNSPECIFIED:'Uncertainty definition unspecified'};
function saveAudit(audit){
  const url=URL.createObjectURL(new Blob([JSON.stringify({
    ...audit,exportedAt:new Date().toISOString()
  },null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r16-evidence-review.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const fmt=n=>Number(n).toPrecision(5);
export default function BioLatticeEvidence({base}){
  const [draft,setDraft]=useState(example);
  const [report,setReport]=useState(()=>auditEvidence(SYNTHETIC_EVIDENCE_EXAMPLE));
  const [error,setError]=useState('');
  const [fileLabel,setFileLabel]=useState('Included synthetic example');
  const review=()=>{
    try{
      const next=auditEvidence(parseEvidenceJson(draft));
      setReport(next);setError('');
    }catch(e){setReport(null);setError(e.message);}
  };
  const loadFile=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{
      if(file.size> EVIDENCE_MAX_CHARS)
        throw new RangeError('File is too large (64 KB maximum)');
      const text=await file.text();
      const next=auditEvidence(parseEvidenceJson(text));
      setDraft(text);setReport(next);setFileLabel(file.name);setError('');
    }catch(err){setReport(null);setError(err.message);}
    e.target.value='';
  };
  return <section className="bio-evidence" aria-label="Scientific measurement evidence intake">
    <div className="bio-evidence-heading">
      <div><span className="micro">RUNG 16 · EXPERIMENTAL PROVENANCE GATE</span>
        <h3>Measurements need receipts.</h3>
        <p>Import a locally held experimental report with a source DOI, source location,
          physical units and uncertainty. See exactly what is usable for source review,
          what is missing, and why none of it automatically calibrates the simulator.</p></div>
      <aside><b>LOCAL REVIEW ONLY</b><span>Source text is not fetched or authenticated.</span>
        <span>No upload to a server or changes to simulation parameters.</span>
        <small>A green schema check is not experimental verification.</small></aside>
    </div>
    <div className="bio-evidence-controls">
      <label className="bio-evidence-upload">Import local JSON
        <input type="file" accept=".json,application/json" onChange={loadFile}/>
      </label>
      <button type="button" onClick={review}>Validate and audit</button>
      <button type="button" onClick={()=>{
        setDraft(example);setReport(auditEvidence(SYNTHETIC_EVIDENCE_EXAMPLE));
        setFileLabel('Included synthetic example');setError('');
      }}>Load synthetic example</button>
      <button type="button" disabled={!report} onClick={()=>saveAudit(report)}>Export audit JSON</button>
    </div>
    <p className="bio-evidence-info">Source: {fileLabel}. The initial example is intentionally fabricated and is permanently classified as a fixture, never as evidence.</p>
    <label className="bio-evidence-editor">Evidence JSON
      <textarea rows="13" spellCheck={false} maxLength={EVIDENCE_MAX_CHARS}
        aria-label="Evidence dataset JSON" value={draft}
        onChange={e=>{setDraft(e.target.value);setReport(null);setError('');}}/>
    </label>
    <p className="bio-evidence-hint">Supported observables: {Object.values(OBSERVABLES).map(o=>o.label+' ('+Object.keys(o.factors).join(' / ')+')').join('; ')}. All absolute uncertainties retain their declared type.</p>
    {error&&<p role="alert" className="bio-evidence-error">Rejected: {error}</p>}
    {!report&&!error&&<p className="bio-evidence-info">Input has changed. Run "Validate and audit" to generate a new review snapshot.</p>}
    {report&&<>
      <div className="bio-evidence-summary">
        <div><small>Dataset</small><b>{report.input.datasetId}</b>
          <span>{report.evidenceClass==='synthetic_fixture'?'Synthetic illustration':'User-reported; unverified'}</span></div>
        <div><small>Records</small><b>{report.records.length}</b>
          <span>Physically dimensioned, not fitted</span></div>
        <div><small>Source verification</small><b>NOT VERIFIED</b>
          <span>DOI syntax is only a formatting check</span></div>
      </div>
      <p className="bio-evidence-source"><b>Citation:</b> {report.input.citation.doi||'No DOI: synthetic fixture'}
        <span>Source locator: {report.input.citation.locator}</span>
        <span>Material: {report.input.material.kind}; {report.input.material.preparation}; {report.input.material.conditions}</span></p>
      <div className="bio-evidence-tablewrap"><table>
        <thead><tr><th scope="col">Observable</th><th scope="col">Reported</th>
          <th scope="col">Converted</th><th scope="col">Absolute uncertainty</th>
          <th scope="col">N</th><th scope="col">Review flags</th></tr></thead>
        <tbody>{report.records.map(r=><tr key={r.id}>
          <th scope="row">{OBSERVABLES[r.observable].label}</th>
          <td>{fmt(r.sourceValue)} {r.sourceUnit}</td>
          <td>{fmt(r.normalizedValue)} {r.normalizedUnit}</td>
          <td>{r.uncertainty.normalizedAbsolute===null?'Not reported':
            fmt(r.uncertainty.normalizedAbsolute)+' '+r.normalizedUnit} <small>{r.uncertainty.kind}</small></td>
          <td>{r.sampleCount??'Unknown'}</td>
          <td>{r.reviewFlags.length?r.reviewFlags.map(flag=>LABELS[flag]||flag).join('; '):'Metadata present'}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="bio-evidence-gate">
        <h4>Calibration gate: closed</h4>
        <p>{report.calibrationGate.reason}</p>
        <ul>{report.calibrationGate.requirements.map(item=>
          <li key={item.id}>{item.label}</li>)}</ul>
      </div>
      <p className="bio-evidence-disclaimer">This is a provenance and dimensional-consistency checker, not a DOI verification service. Do not treat self-reported numbers, a passed JSON check or a synthetic fixture as a physical calibration, proof of quantum coherence or evidence for consciousness.</p>
    </>}
    <BioLatticeIdentifiability evidenceAudit={report} base={base}/>
  </section>;
}
