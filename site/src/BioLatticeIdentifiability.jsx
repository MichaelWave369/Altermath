import {useMemo,useState} from 'react';
import {analyzeIdentifiability} from './bioLatticeIdentifiability.js';
import './bioLatticeIdentifiability.css';

const fmt=value=>value===null||!Number.isFinite(value)?
  'Undefined':Number(value).toPrecision(4);
function download(data){
  const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],
    {type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='altermath-r17-identifiability.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function BioLatticeIdentifiability({evidenceAudit,base}){
  const [lengthSelection,setLengthSelection]=useState('');
  const [lifetimeSelection,setLifetimeSelection]=useState('');
  const lengths=evidenceAudit?.records?.filter(r=>r.observable==='migration_diffusion_length')||[];
  const lifetimes=evidenceAudit?.records?.filter(r=>r.observable==='fluorescence_lifetime')||[];
  const lengthId=lengths.some(r=>r.id===lengthSelection)?
    lengthSelection:(lengths[0]?.id??null);
  const lifetimeId=lifetimes.some(r=>r.id===lifetimeSelection)?
    lifetimeSelection:(lifetimes[0]?.id??null);
  const result=useMemo(()=>evidenceAudit?
    analyzeIdentifiability({evidenceAudit,base,lengthId,lifetimeId}):null,
    [evidenceAudit,base,lengthId,lifetimeId]);
  return <section className="bio-id" aria-label="R17 identifiability workbench">
    <div className="bio-id-intro">
      <div><span className="micro">RUNG 17 · IDENTIFIABILITY WORKBENCH</span>
        <h3>One measurement. Many explanations.</h3>
        <p>Explore why one reported diffusion length or lifetime cannot uniquely
          determine molecular coupling, lattice size, or time scales. Every derived
          scale is a <strong>hypothetical requirement under an unsupported equation</strong>,
          not physical calibration.</p>
      </div>
      <aside><b>CALIBRATION GATE CLOSED</b>
        <span>Mathematical compatibility is not experimental verification.</span>
        <span>This panel never changes the real simulator settings.</span>
        <small>No biological or consciousness inference.</small>
      </aside>
    </div>
    {!result?
      <p className="bio-id-empty">Validate the evidence JSON above before analyzing
        it. Draft or rejected data cannot generate mappings.</p>:
      <>
        <div className="bio-id-controls">
          <label>Diffusion-length record
            <select value={lengthId??''} onChange={e=>setLengthSelection(e.target.value)}>
              {!lengths.length?<option value="">Missing</option>:lengths.map(r=>
                <option value={r.id} key={r.id}>{r.id}</option>)}
            </select>
          </label>
          <label>Lifetime record
            <select value={lifetimeId??''} onChange={e=>setLifetimeSelection(e.target.value)}>
              {!lifetimes.length?<option value="">Missing</option>:lifetimes.map(r=>
                <option value={r.id} key={r.id}>{r.id}</option>)}
            </select>
          </label>
          <button type="button" onClick={()=>download(result)}>Export R17 JSON</button>
        </div>
        <p className="bio-id-metadata">Evidence dataset: <b>{result.sourceDatasetId}</b>.
          Source status: <b>{result.sourceEvidenceClass==='synthetic_fixture'?
            'SYNTHETIC FIXTURE':'USER-REPORTED, UNVERIFIED'}</b>.
          Model seed {result.modelConfig.seed}, {result.modelConfig.steps} synthetic steps.
          No independent source verification has occurred.</p>
        <div className="bio-id-kpis">
          <div><small>Claimed migration length</small>
            <strong>{result.selectedRecords.length?
              fmt(result.selectedRecords.length.value)+' nm':'Missing'}</strong>
            <span>Not automatically equal to axial standard deviation</span></div>
          <div><small>Compatible coupling/scale pairs</small>
            <strong>{result.identifiability.matchingGeometryCandidates} / 5</strong>
            <span>All matches constructed under an unverified identity</span></div>
          <div><small>Claimed fluorescence lifetime</small>
            <strong>{result.selectedRecords.lifetime?
              fmt(result.selectedRecords.lifetime.value)+' ps':'Missing'}</strong>
            <span>Not automatically the simulated loss process</span></div>
          <div><small>Compatible loss/clock pairs</small>
            <strong>{result.identifiability.matchingTimeCandidates} / 5</strong>
            <span>Every nonzero loss implies a different model clock</span></div>
        </div>
        <div className="bio-id-tables">
          <div className="bio-id-tablewrap">
            <h4>Hypothetical length mappings</h4>
            <p>Under the unsupported assumption length = spread × site size,
              each coupling requires another nm/site scale.</p>
            <table><thead><tr><th scope="col">Toy coupling</th>
              <th scope="col">Spread (sites)</th><th scope="col">Required nm/site</th></tr></thead>
              <tbody>{result.couplingFamily.map(r=><tr key={r.coupling}>
                <th scope="row">{r.coupling.toFixed(2)}</th>
                <td>{fmt(r.spreadSites)}</td><td>{fmt(r.hypotheticalNmPerSite)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="bio-id-tablewrap">
            <h4>Hypothetical timing mappings</h4>
            <p>Under the unsupported assumption that fluorescence decay equals
              toy loss, each nonzero loss needs another tick duration.</p>
            <table><thead><tr><th scope="col">Toy loss per tick</th>
              <th scope="col">Required ps/tick</th></tr></thead>
              <tbody>{result.lifetimeFamily.map(r=><tr key={r.loss}>
                <th scope="row">{r.loss.toFixed(3)}</th>
                <td>{fmt(r.hypotheticalPsPerTick)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="bio-id-readiness">
          <h4>What remains necessary for a physical calibration?</h4>
          <div className="bio-id-reqs">{result.requirements.map(r=>
            <div key={r.id}><b>{r.label}</b>
              <span>{r.status==='submitted_unverified'?'Supplied, not verified':
                r.status==='missing'?'Missing':'Not established'}</span>
              <small>{r.detail}</small>
            </div>)}</div>
        </div>
        <p className="bio-id-warning">No physical parameter was inferred, and no
          calibration flag was opened. Matching an arbitrary toy scale to a
          claimed experimental number is not a mechanism, measurement,
          or evidence of quantum consciousness.</p>
      </>}
  </section>;
}
