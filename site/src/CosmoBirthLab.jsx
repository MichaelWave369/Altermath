import {useMemo,useState} from 'react';
import {
  COSMO02_OPERATIONS,cosmo02Initial,cosmo02Transition,cosmo02Advance,
  cosmo02Merge,cosmo02Audit,cosmo02Census
} from '../../src/cosmo02.js';
import './cosmoBirth.css';

const labels={hold:'Hold / null',transform:'Local transform',transfer:'Endpoint transfer',birth:'Explicit child birth'};
function Domain({node,original=false}){
  return <div className={'cosmo02-domain '+(node.id==='C@1'?'child':'')}>
    <div className="cosmo02-domain-head"><strong>{node.id}</strong><span>{node.tokens.length} inherited tokens</span></div>
    <div className="cosmo02-pockets">{node.tokens.map(t=><div className={'cosmo02-pocket '+(t.signal?'is-on':'')} key={t.id}
      title={'Source '+t.id+' / inherited signal '+t.signal}>
      <strong>{t.signal}</strong><small>{t.id}</small>
    </div>)}</div>
    <div className="cosmo02-role">{original?'Original bounded domain':node.id==='C@1'?'New container · parent IDs A + B':'Existing parent domain'}</div>
  </div>;
}
function download(record){
  const blob=new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='altermath-cosmo02-synthetic.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function CosmoBirthLab(){
  const [mask,setMask]=useState(165);
  const [mode,setMode]=useState('birth');
  const [approved,setApproved]=useState(false);
  const [creationEnabled,setCreationEnabled]=useState(false);
  const [permit,setPermit]=useState(true);
  const [contact,setContact]=useState(true);
  const [compatible,setCompatible]=useState(true);
  const [steps,setSteps]=useState(0);
  const [showMerge,setShowMerge]=useState(false);
  const [mergeApproved,setMergeApproved]=useState(false);
  const start=useMemo(()=>cosmo02Initial(mask),[mask]);
  const gates={operatorApproved:approved,creationEnabled,permit,contact,compatible};
  const current=useMemo(()=>cosmo02Transition(mask,mode,gates),
    [mask,mode,approved,creationEnabled,permit,contact,compatible]);
  const advanced=useMemo(()=>cosmo02Advance(current,steps),[current,steps]);
  const merged=useMemo(()=>showMerge?cosmo02Merge(advanced,{permit,contact,compatible,
    operatorApproved:mergeApproved}):null,
    [showMerge,advanced,permit,contact,compatible,mergeApproved]);
  const effective=merged??advanced;
  const audit=cosmo02Audit(effective);
  const census=useMemo(()=>cosmo02Census(),[]);
  const obs=census.childObservation;
  const reset=()=>{setMask(165);setMode('birth');setSteps(0);setApproved(false);
    setCreationEnabled(false);setPermit(true);setContact(true);setCompatible(true);
    setShowMerge(false);setMergeApproved(false);};
  return <section className="cosmo02-lab" id="cosmo02" aria-labelledby="cosmo02-title">
    <div className="cosmo02-heading">
      <div>
        <div className="micro">RUNG 30 · COSMO-02 / LINEAGE + CONSERVATION</div>
        <h2 id="cosmo02-title">A junction is not a birth. <em>Test the distinction.</em></h2>
        <p>Compare holding, local transformation, exchanging existing tokens, and creating a child
          container by relocating one token from each parent. Every bit is accounted for.
          This is an exact finite graph analogy, never a simulated physical universe.</p>
      </div>
      <span className="cosmo02-flag">SIMULATED · AUTHORITY NONE</span>
    </div>
    <div className="cosmo02-controls">
      <div className="cosmo02-control">
        <strong>Operation</strong>
        <div className="cosmo02-buttonrow" role="group" aria-label="Choose operation">
          {COSMO02_OPERATIONS.map(x=><button key={x} type="button" onClick={()=>{setMode(x);setSteps(0);setShowMerge(false);}}
            className={mode===x?'chosen':''} aria-pressed={mode===x}>{labels[x]}</button>)}
        </div>
      </div>
      <div className="cosmo02-control">
        <strong>Interface gates (toy-model fixtures)</strong>
        <div className="cosmo02-checks">
          <label><input type="checkbox" checked={permit} onChange={e=>setPermit(e.target.checked)}/> Permission</label>
          <label><input type="checkbox" checked={contact} onChange={e=>setContact(e.target.checked)}/> Contact</label>
          <label><input type="checkbox" checked={compatible} onChange={e=>setCompatible(e.target.checked)}/> Compatibility</label>
          <label><input type="checkbox" checked={creationEnabled} onChange={e=>setCreationEnabled(e.target.checked)}/> Enable birth fixture</label>
          <label><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> Approve simulated birth</label>
        </div>
      </div>
      <div className="cosmo02-control">
        <strong>Input bits · click to flip the eight source tokens</strong>
        <div className="cosmo02-bitbuttons">{Array.from({length:8},(_,i)=><button key={i} type="button"
          className={(mask&(1<<i))?'active':''} aria-pressed={Boolean(mask&(1<<i))}
          aria-label={'Source '+(i<4?'A':'B')+(i%4)+', signal '+((mask>>>i)&1)}
          onClick={()=>setMask(value=>value^(1<<i))}>{i<4?'A':'B'}{i%4}: {(mask>>>i)&1}</button>)}</div>
        <div className="cosmo02-row">
          <label>Local evolution ticks
            <select value={steps} onChange={e=>setSteps(Number(e.target.value))}>
              {[0,1,2,3,4].map(i=><option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <button type="button" onClick={reset}>Reset experiment</button>
        </div>
        <div className="cosmo02-checks cosmo02-checks-small">
          <label><input type="checkbox" checked={showMerge} onChange={e=>setShowMerge(e.target.checked)}/> Preview child merge</label>
          <label><input type="checkbox" checked={mergeApproved} onChange={e=>setMergeApproved(e.target.checked)}/> Approve simulated merge</label>
        </div>
      </div>
    </div>
    <div className="cosmo02-graph">
      <div>
        <h3>Before · two bounded parents</h3>
        <div className="cosmo02-domain-grid">{start.domains.map(d=><Domain key={d.id} node={d} original/>)}</div>
      </div>
      <div className="cosmo02-middle" aria-hidden="true">→<small>{current.actionStatus}</small></div>
      <div>
        <h3>After · {effective.domains.length} addressable domains</h3>
        <div className="cosmo02-domain-grid">{effective.domains.map(d=><Domain key={d.id} node={d}/>)}</div>
      </div>
    </div>
    <div className="cosmo02-summary" aria-live="polite">
      <div><small>Final status</small><strong>{effective.actionStatus}</strong><span>Returned by deterministic operation</span></div>
      <div><small>Token budget</small><strong>{audit.totalTokens}/8</strong><span>Original token identities retained</span></div>
      <div><small>Active child</small><strong>{audit.childExists?'yes':'no'}</strong><span>No implicit spontaneous spawning</span></div>
      <div><small>Integrity audit</small><strong>{audit.ok?'PASS':'FAIL'}</strong><span>Unique tokens + signal tally</span></div>
    </div>
    <div className="cosmo02-study">
      <div>
        <div className="micro">EXACT 256-STATE CENSUS · UNIFORM PRIOR</div>
        <h3>Which operations really create a new container?</h3>
        <div className="cosmo02-tablewrap">
          <table><thead><tr><th>Mode</th><th>Changed signal arrangement</th><th>Child cases</th><th>Conservation failures</th></tr></thead>
            <tbody>{census.modes.map(r=><tr key={r.mode}><th>{labels[r.mode]}</th>
              <td>{r.changedParentSignals}/256</td><td>{r.childCases}/256</td><td>{r.conservationFailures}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="cosmo02-entropy">
        <div className="micro">THE CHILD KEYHOLE</div>
        <h3>Prediction from incomplete observations</h3>
        <p>When an approved birth occurs, the child inherits A3 and B0.
          How much uncertainty remains about the child's count of 1-valued signals?</p>
        <div><span>Parent totals only</span><strong>{obs.coarseEntropyBits.toFixed(4)} bits</strong></div>
        <div><span>Totals + A3</span><strong>{obs.oneDonorEntropyBits.toFixed(4)} bits</strong></div>
        <div><span>Totals + A3 + B0</span><strong>{obs.twoDonorEntropyBits.toFixed(4)} bits</strong></div>
        <p>Two extra known donor bits fully determine this deliberately specified child's initial
          signals. This is ordinary deterministic inheritance, not new physical information.</p>
        <button type="button" className="cosmo02-export" onClick={()=>download({
          authority:'SIMULATED / authority NONE',inputMask:mask,mode,gates,steps,showMerge,
          mergeApproved,initial:start,result:effective,audit,census
        })}>Export complete synthetic JSON</button>
      </div>
    </div>
    <div className="cosmo02-footer">
      <p><strong>Claim boundary:</strong> A new graph container is not a baby universe. Our eight
        original tokens are conserved by construction, and moving them does not imply physical
        energy conservation. No Einstein equations, spacetime metric, black-hole singularity,
        white hole, brane collision, or inflationary prediction is implemented. A UI approval
        check is only an in-browser demonstration, never operational authority.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/cosmo02.md"
        target="_blank" rel="noreferrer">COSMO-02 protocol ↗</a>
    </div>
  </section>;
}
