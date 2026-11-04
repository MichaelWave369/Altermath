import {useState} from 'react';
import {runReplications,BASELINES} from './replications.js';
import './replications.css';

const signed=value=>(value>=0?'+':'')+(value*100).toFixed(3)+' pp';
const pct=value=>(value*100).toFixed(1)+'%';

function exportJson(report){
  const data={...report,exportedAt:new Date().toISOString(),
    provenance:'Altermath Rung 12, deterministic disjoint synthetic partitions'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;
  a.download='altermath-r12-repeated-splits.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function ReplicationLab(){
  const [startSeed,setStartSeed]=useState(369);
  const [splitCount,setSplitCount]=useState(3);
  const [seedCount,setSeedCount]=useState(3);
  const [budget,setBudget]=useState(6);
  const [baseline,setBaseline]=useState('adaptiveVsFrozen');
  const [report,setReport]=useState(()=>runReplications());
  const [runNumber,setRunNumber]=useState(1);
  const chosen=report.baselines.find(x=>x.key===baseline)||report.baselines[0];
  const referenceFee=report.summary.referenceFee;
  const summaryRows=chosen.profiles.map(profile=>({
    ...profile,primary:profile.fees.find(x=>x.fee===referenceFee)
  }));
  const primary=chosen.key==='adaptiveVsFrozen'?report.summary:null;
  const total=summaryRows.flatMap(x=>x.primary.bySplit.map(z=>z.delta));
  const combinedMean=total.reduce((sum,x)=>sum+x,0)/total.length;
  const positive=total.filter(x=>x>1e-12).length;
  const negative=total.filter(x=>x< -1e-12).length;
  const conduct=()=>{
    const result=runReplications({startSeed,splitCount,trainingSeeds:seedCount,
      holdoutSeeds:seedCount,budget});
    setReport(result);setRunNumber(n=>n+1);
  };
  return <section className="replication-section" id="replications">
    <div className="section-head">
      <div><span className="micro">RUNG 12 · REPEATED OUT-OF-SAMPLE EVALUATION</span>
        <h2>Does the controller's advantage survive a new world?</h2></div>
      <p>Repeat the complete stress experiment with globally disjoint train and test seeds. Keep the methods fixed; expose every win, loss, and tie.</p>
    </div>
    <div className="replication-panel">
      <div className="replication-tools">
        <label>Independent splits<select value={splitCount}
          onChange={e=>setSplitCount(Number(e.target.value))}>
          {[3,6,9].map(x=><option key={x} value={x}>{x} splits</option>)}
        </select></label>
        <label>Seeds per train/test<select value={seedCount}
          onChange={e=>setSeedCount(Number(e.target.value))}>
          {[3,6,9].map(x=><option key={x} value={x}>{x} + {x} seeds</option>)}
        </select></label>
        <label>Junction budget<select value={budget}
          onChange={e=>setBudget(Number(e.target.value))}>
          {[0,3,6,9,12].map(x=><option key={x} value={x}>{x} of 12</option>)}
        </select></label>
        <label>Starting seed<input type="number" step="1" min="-999999" max="999999"
          value={startSeed} onChange={e=>setStartSeed(Number(e.target.value))}/></label>
        <label>Compare adaptive against<select value={baseline}
          onChange={e=>setBaseline(e.target.value)}>
          {BASELINES.map(b=><option key={b.key} value={b.key}>{b.name}</option>)}
        </select></label>
        <button type="button" className="replication-primary" onClick={conduct}>Repeat evaluation</button>
        <button type="button" onClick={()=>exportJson(report)}>Export all evidence</button>
      </div>
      <div className="replication-sub">
        <span>Experiment #{runNumber}</span>
        <span>{report.parameters.splitCount} global-disjoint splits</span>
        <span>{report.parameters.splitCount*report.parameters.holdoutSeeds} unique holdout seeds</span>
        <span>Same 5 stress profiles and 3 fees in every split</span>
      </div>
      <div className="replication-kpis">
        <div><small>Mean delta across split × profile cells</small>
          <strong className={combinedMean>=0?'up':'down'}>{signed(combinedMean)}</strong>
          <span>Adaptive minus {chosen.label}, fee {referenceFee.toFixed(3)}</span></div>
        <div><small>Favorable / adverse stress cells</small>
          <strong>{positive} / {negative}</strong>
          <span>{total.length-positive-negative} near-zero ties included</span></div>
        <div><small>Mean selected-link overlap</small>
          <strong>{pct(report.selectionStability.meanPairwiseJaccard)}</strong>
          <span>Jaccard across independently trained subsets</span></div>
      </div>
      <div className="replication-matrix-scroll">
        <table className="replication-matrix">
          <thead><tr><th scope="col">Prespecified stress</th>
            {report.baselines[0].profiles[0].fees.map(cell=>
              <th scope="col" key={cell.fee}>Switch fee {cell.fee.toFixed(3)}</th>)}
          </tr></thead>
          <tbody>{chosen.profiles.map(row=><tr key={row.id}>
            <th scope="row"><b>{row.label}</b>
              <small>{report.parameters.splitCount} separate train/test partitions</small></th>
            {row.fees.map(cell=><td key={cell.fee} className={cell.meanDelta>=0?'replication-up':'replication-down'}>
              <strong>{signed(cell.meanDelta)}</strong>
              <small>{cell.wins} wins · {cell.losses} losses · {cell.ties} ties</small>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="replication-splits">
        <div className="replication-splits-title"><b>Unseen worlds, one partition at a time</b>
          <span>Each split has a new trained link selection and a distinct test block.</span></div>
        <div className="replication-split-grid">
          {report.splits.map(split=><article key={split.split}>
            <b>Split {split.split}</b>
            <small>Training: {split.trainingSeeds[0]}–{split.trainingSeeds.at(-1)}</small>
            <small>Holdout: {split.holdoutSeeds[0]}–{split.holdoutSeeds.at(-1)}</small>
            <span>{split.selection.length} selected links</span>
            <div className="replication-links">{split.selection.length?
              split.selection.map(id=><i key={id}>{id}</i>):<i>No links</i>}</div>
          </article>)}
        </div>
      </div>
      <p className="replication-disclaimer">The comparisons are deterministic oscillator simulations. Different seeded partitions do not represent independent real-world systems. Stress profiles reuse their holdout seeds, so the individual cells are correlated. There are no inferential confidence intervals or claims about consciousness, physical energy or extra dimensions. Nothing in this lab grants network or PhiKernel authority.</p>
    </div>
  </section>;
}
