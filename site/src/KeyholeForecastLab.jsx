import {useMemo,useState} from 'react';
import {RULES} from './polyhedralRobustness.js';
import {
  FORECAST_SEEDS,FORECAST_BUDGETS,runForecastStudy,runForecastSweep,
} from './keyholeForecast.js';
import './keyholeForecast.css';

function downloadForecast(value){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='altermath-r27-poly04-heldout-forecast.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function percent(value){return (value*100).toFixed(1)+'%';}
function signed(value){
  return (value>0?'+':'')+(value*100).toFixed(1)+' pp';
}
function ScoreBar({name,accuracy,kind}){
  return <div className="r27-bar">
    <div className="r27-barlabel"><span>{name}</span><strong>{percent(accuracy)}</strong></div>
    <div className="r27-track"><div className={kind||''}
      style={{width:Math.max(0,Math.min(100,accuracy*100))+'%'}}/></div>
  </div>;
}
function Stat({name,value,description}){
  return <div className="r27-stat"><small>{name}</small><strong>{value}</strong><span>{description}</span></div>;
}

export default function KeyholeForecastLab(){
  const [rule,setRule]=useState('majority');
  const [budget,setBudget]=useState(1);
  const [seed,setSeed]=useState(369);
  const [graphId,setGraphId]=useState('cube');
  const study=useMemo(()=>runForecastStudy({rule,budget,seed}),[rule,budget,seed]);
  const sweep=useMemo(()=>runForecastSweep({rule,budget}),[rule,budget]);
  const selected=study.rows.find(row=>row.graphId===graphId);
  return <section className="r27-lab" id="keyhole-forecast" aria-labelledby="r27-title">
    <div className="r27-header">
      <div><div className="micro">RUNG 27 · NBG POLY-04 / HELD-OUT PREDICTION</div>
        <h2 id="r27-title">The Predictive <em>Keyhole Challenge</em></h2>
        <p>Can an additional one- or two-pocket observation improve forecasts of the
          next aggregate state? Train the same empirical predictor with different
          authorized views, select sensors using validation only, and score genuinely
          untouched holdout masks.</p></div>
      <span className="r27-status">SYNTHETIC HELDOUT · AUTHORITY NONE</span>
    </div>
    <div className="r27-method">
      <span><strong>128</strong> training states</span>
      <span className="r27-arrow">→</span>
      <span><strong>64</strong> validation states</span>
      <span className="r27-arrow">→</span>
      <span><strong>64</strong> holdout states</span>
      <small>Each binary state and its complement remain in the same split. The test states
        are neither fitted on nor used to choose sensors.</small>
    </div>
    <div className="r27-layout">
      <aside className="r27-controls">
        <h3>Benchmark configuration</h3>
        <label htmlFor="r27-rule">Deterministic pocket update</label>
        <select id="r27-rule" value={rule} onChange={e=>setRule(e.target.value)}>
          {RULES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div className="r27-field"><span className="r27-label">Additional raw pocket sensors</span>
          <div className="r27-group" role="group" aria-label="Extra sensor budget">
            {FORECAST_BUDGETS.map(b=><button key={b} type="button"
              aria-pressed={budget===b} className={budget===b?'active':''}
              onClick={()=>setBudget(b)}>{b}</button>)}
          </div>
        </div>
        <div className="r27-field"><span className="r27-label">Predeclared split seed</span>
          <div className="r27-group" role="group" aria-label="Train validation holdout seed">
            {FORECAST_SEEDS.map(s=><button key={s} type="button"
              aria-pressed={seed===s} className={seed===s?'active':''}
              onClick={()=>setSeed(s)}>{s}</button>)}
          </div>
        </div>
        <label htmlFor="r27-graph">Eight-pocket graph representative</label>
        <select id="r27-graph" value={graphId} onChange={e=>setGraphId(e.target.value)}>
          {study.rows.map(row=><option key={row.graphId} value={row.graphId}>{row.graphName}</option>)}
        </select>
        <button type="button" className="r27-export" onClick={()=>downloadForecast({
          study,sweep,record:{
            protocol:'POLY-04',source:'Altermath R27',authority:'NONE',
            note:'Five synthetic graph representatives, three predeclared split seeds. Test outcomes never used in sensor selection.',
          },
        })}>Export current study + all seeds</button>
        <p>Every model receives the current aggregate for free. The budget counts
          <strong> additional raw pocket signs</strong>, not bytes or physical sensor cost.
          Sensors are chosen from eight locations.</p>
      </aside>
      <div className="r27-results">
        <div className="micro">EXACT-MATCH HELDOUT ACCURACY · {selected.graphName.toUpperCase()}</div>
        <h3>How much does one more observation help?</h3>
        <ScoreBar name="Aggregate-only baseline · no extra sensors" accuracy={selected.baseline.accuracy}/>
        <ScoreBar name={'First '+budget+' pocket sensor(s) · fixed baseline'}
          accuracy={selected.fixed.accuracy} kind="fixed"/>
        <ScoreBar name="Seed-selected sensor locations · random baseline"
          accuracy={selected.random.accuracy} kind="random"/>
        <ScoreBar name="Validation-selected sensors · candidate"
          accuracy={selected.tuned.accuracy} kind="tuned"/>
        <div className="r27-stat-grid">
          <Stat name="Candidate vs aggregate" value={signed(selected.deltaAgainstAggregate)}
            description="Percentage-point heldout difference, can be negative"/>
          <Stat name="Candidate vs fixed" value={signed(selected.deltaAgainstFixed)}
            description="Equal raw-pocket sensor budget"/>
          <Stat name="Chosen pocket indices" value={selected.selectedSensors.length?
            selected.selectedSensors.map(i=>i+1).join(' + '):'None'} description="Optimized using validation only"/>
          <Stat name="Candidate absolute error" value={selected.tuned.mae.toFixed(3)}
            description="Mean absolute error in next aggregate units"/>
        </div>
        <p className="r27-negative">
          {selected.deltaAgainstFixed>0?
            'This holdout condition favors the selected sensor locations over fixed locations. This is not yet a practical routing advantage.':
            selected.deltaAgainstFixed<0?
            'Negative outcome: the validation-selected sensor locations did worse than the fixed control on untouched data. This result is preserved.':
            'No improvement over fixed sensing on this condition. Null results count, too.'}
        </p>
      </div>
    </div>
    <div className="r27-summary">
      <div className="r27-summary-head">
        <div className="micro">MULTI-SEED HOLDOUT · FIVE GRAPH REPRESENTATIVES</div>
        <h3>Predeclared replication across seeds 369 · 636 · 963</h3>
        <p>Each of the 15 graph-by-seed conditions has 64 holdout states.
          Means below are descriptive, not statistical claims about independent
          real-world deployments.</p>
      </div>
      <div className="r27-summary-stats">
        <Stat name="Total evaluated predictions" value={sweep.heldoutCases}
          description="15 conditions × 64 heldout masks"/>
        <Stat name="Aggregate-only mean" value={percent(sweep.means.aggregate)}
          description="No extra raw sensors"/>
        <Stat name="Fixed sensors mean" value={percent(sweep.means.fixed)}
          description="Same observation budget"/>
        <Stat name="Validation-selected mean" value={percent(sweep.means.tuned)}
          description="No test-set tuning"/>
      </div>
      <div className="r27-table-scroll">
        <table>
          <thead><tr><th>Network</th><th>Aggregate</th><th>Fixed</th>
            <th>Random</th><th>Selected</th><th>Selected − fixed</th></tr></thead>
          <tbody>{study.rows.map(row=><tr key={row.graphId}
            className={row.graphId===graphId?'selected':''}>
            <td><button type="button" onClick={()=>setGraphId(row.graphId)}>{row.graphName}</button></td>
            <td>{percent(row.baseline.accuracy)}</td>
            <td>{percent(row.fixed.accuracy)}</td>
            <td>{percent(row.random.accuracy)}</td>
            <td>{percent(row.tuned.accuracy)}</td>
            <td>{signed(row.deltaAgainstFixed)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="r27-boundary">
      <p><strong>Evidence boundary:</strong> All 256 states per graph come from a
        known toy update law. Holdout means only states were withheld from
        training and sensor selection, not that the data came from an independent
        physical or neural system. The selected sensor is not proven superior;
        validation may overfit, especially with only 64 cases. Accuracy is
        exact-match for one-step aggregate forecasts, not a measure of intelligence
        or a reason to authorize a PocketMesh task.</p>
      <a href="https://github.com/MichaelWave369/Altermath/blob/main/docs/keyhole-forecast-r27.md"
        target="_blank" rel="noreferrer">POLY-04 protocol ↗</a>
    </div>
  </section>;
}
