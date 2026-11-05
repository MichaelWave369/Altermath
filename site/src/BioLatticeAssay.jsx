import {useState} from 'react';
import {OBSERVABLES} from './bioLatticeEvidence.js';
import {ASSAY_DEFAULTS,ASSAY_MAX_JSON_CHARS,buildAssayPacket,
  auditAssayResults,parseAssayResultsJson} from './bioLatticeAssay.js';
import './bioLatticeAssay.css';

function save(value,name){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const original=buildAssayPacket();
export default function BioLatticeAssay(){
  const [options,setOptions]=useState({...ASSAY_DEFAULTS});
  const [packet,setPacket]=useState(original);
  const [draft,setDraft]=useState(JSON.stringify(original.resultsTemplate,null,2));
  const [audit,setAudit]=useState(()=>auditAssayResults(original,original.resultsTemplate));
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(1);
  const update=(key,value)=>setOptions(old=>({...old,[key]:value}));
  const newPacket=()=>{
    try{
      const next=buildAssayPacket(options);
      setPacket(next);setDraft(JSON.stringify(next.resultsTemplate,null,2));
      setAudit(auditAssayResults(next,next.resultsTemplate));
      setRevision(n=>n+1);setError('');
    }catch(e){setError(e.message);}
  };
  const validate=(value=draft)=>{
    try{const result=auditAssayResults(packet,parseAssayResultsJson(value));
      setAudit(result);setError('');}
    catch(e){setAudit(null);setError(e.message);}
  };
  const fileUpload=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{
      if(file.size>ASSAY_MAX_JSON_CHARS)throw new RangeError('JSON exceeds 64 KB');
      const s=await file.text();setDraft(s);validate(s);
    }catch(err){setAudit(null);setError(err.message);}
    e.target.value='';
  };
  const manifest=packet.blindedManifest;
  return <section className="bio-assay" aria-label="R19 blinded assay draft and measurement intake">
    <div className="bio-assay-intro">
      <div><span className="micro">RUNG 19 · LAB HANDOFF DRAFT</span>
        <h3>Design the test. Keep assignments separate.</h3>
        <p>Generate an operator-facing sample list, a separate private assignment
          key and an empty results template. Audit records by blinded ID
          without silently dropping missing readings or inventing zeroes.</p>
      </div>
      <aside><b>NOT A REGISTERED EXPERIMENT</b><span>Deterministic shuffling is not
        cryptographically secure blinding.</span><span>Instrument protocols,
        controls and sample sizes require laboratory review.</span>
        <small>No biological data or verified measurements are included.</small></aside>
    </div>
    <div className="bio-assay-controls">
      <label>Study ID<input maxLength="80" value={options.studyId}
        onChange={e=>update('studyId',e.target.value)}/></label>
      <label>Observable<select value={options.observable} onChange={e=>{
        const observable=e.target.value;
        setOptions(o=>({...o,observable,unit:Object.keys(OBSERVABLES[observable].factors)[0]}));
      }}>{Object.entries(OBSERVABLES).map(([key,info])=>
        <option key={key} value={key}>{info.label}</option>)}</select></label>
      <label>Unit<select value={options.unit} onChange={e=>update('unit',e.target.value)}>
        {Object.keys(OBSERVABLES[options.observable].factors).map(unit=>
          <option key={unit} value={unit}>{unit}</option>)}</select></label>
      <label>Draft repeats per arm<select value={options.replicatesPerArm}
        onChange={e=>update('replicatesPerArm',Number(e.target.value))}>
        {[3,4,6,9,12].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <label>Illustrative seed<input type="number" min="0" max="2147483647" value={options.seed}
        onChange={e=>update('seed',Number(e.target.value))}/></label>
      <button type="button" onClick={newPacket}>Generate draft</button>
    </div>
    <p className="bio-assay-note">Draft #{revision}: {manifest.studyId}, {manifest.sampleCount}
      blinded sample IDs. Changes above take effect only after Generate draft.</p>
    <div className="bio-assay-export">
      <div><b>1. Operator manifest</b><p>Blind labels and station order only.
        No preparation assignments.</p>
        <button type="button" onClick={()=>save(manifest,'r19-operator-manifest.json')}>
          Export operator manifest</button></div>
      <div><b>2. Private key</b><p>Contains sample-to-preparation mapping.
        Keep separate from operators and reviewers.</p>
        <button type="button" onClick={()=>save(packet.privateAssignmentKey,'r19-private-key.json')}>
          Export separate private key</button></div>
      <div><b>3. Empty results</b><p>Every sample starts uncollected.
        Edit this template only after obtaining real readings.</p>
        <button type="button" onClick={()=>save(packet.resultsTemplate,'r19-results-template.json')}>
          Export empty results</button></div>
    </div>
    <div className="bio-assay-grid">
      <div className="bio-assay-scroll"><h4>Blinded operator list</h4>
        <table><thead><tr><th>Order</th><th>Blind ID</th></tr></thead>
          <tbody>{manifest.blindIds.map(item=><tr key={item.sampleId}>
            <td>{item.stationOrder}</td><th>{item.sampleId}</th></tr>)}</tbody></table>
      </div>
      <div><h4>Unresolved protocol decisions</h4>
        <ul>{manifest.design.missingDecisions.map(note=><li key={note}>{note}</li>)}</ul>
        <p className="bio-assay-note">These are proposed preparation arms, not
          scientifically validated controls. A domain expert must approve
          the design and externally register any claimed preregistration.</p></div>
    </div>
    <div className="bio-assay-intake">
      <h4>Measurement intake</h4>
      <p>Paste results JSON or import a local file. Collection states are
        not_collected, measured, no_signal and excluded. No-signal or
        excluded records require a reason; measured values need physical units.</p>
      <div className="bio-assay-actions">
        <label>Local JSON file<input type="file" accept=".json,application/json"
          onChange={fileUpload}/></label>
        <button type="button" onClick={()=>validate()}>Audit JSON</button>
        <button type="button" disabled={!audit} onClick={()=>save(audit,'r19-audit.json')}>
          Export audit</button>
      </div>
      <textarea aria-label="R19 measurement JSON" rows={12} spellCheck={false}
        maxLength={ASSAY_MAX_JSON_CHARS} value={draft}
        onChange={e=>{setDraft(e.target.value);setAudit(null);setError('');}}/>
      {error&&<p role="alert" className="bio-assay-error">Rejected: {error}</p>}
      {!audit&&!error&&<p>Edited draft is unverified. Click Audit JSON.</p>}
      {audit&&<>
        <div className="bio-assay-summary">
          {Object.entries(audit.statusCounts).map(([state,count])=>
            <div key={state}><small>{state.replaceAll('_',' ')}</small><strong>{count}</strong></div>)}
        </div>
        <div className="bio-assay-scroll"><table>
          <thead><tr><th>Blind ID</th><th>State</th><th>Normalized</th><th>Issues</th></tr></thead>
          <tbody>{audit.rows.map(row=><tr key={row.sampleId}>
            <th>{row.sampleId}</th><td>{row.status}</td>
            <td>{row.normalizedValue===null?'Not measured':
              row.normalizedValue.toPrecision(5)+' '+row.normalizedUnit}</td>
            <td>{row.issues.join('; ')||'No format flags'}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="bio-assay-warning"><strong>Calibration CLOSED.</strong>
          This audit checks structure, not authentic experimental provenance,
          control validity, statistical significance or any relationship
          to the toy simulation. The audit never exposes the condition key.</p>
      </>}
    </div>
  </section>;
}
