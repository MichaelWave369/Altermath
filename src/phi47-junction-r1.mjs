// PHI47-JUNC-R1: isolated, scalar-only demonstration; no production execution authority.
export const PHI47_JUNCTION_SCHEMA='phi47-junction-r1';
const N=47, STEPS=[8,9,12,16];
export function permitted(policy){
  if(!policy || typeof policy!=='object' || Array.isArray(policy)) return false;
  return policy.outbound===true && policy.inbound===true &&
    policy.channelA==='scalar.v1' && policy.channelB==='scalar.v1' &&
    policy.privacy==='synthetic-public';
}
export function initial(){
  const A=Array.from({length:N},(_,i)=>0.1+0.8*((i*9)%N)/(N-1));
  const B=Array.from({length:N},(_,i)=>0.2+0.38*((i*13+5)%N)/(N-1));
  return {A,B};
}
export function links({mode='fixed',tick=0,policy}={}){
  if(!['isolated','fixed','adaptive'].includes(mode)||!Number.isInteger(tick)||tick<0) throw Error('Invalid junction settings');
  if(mode==='isolated'||!permitted(policy)) return [];
  const shift=mode==='fixed'?0:Math.floor(tick/4)%N;
  return Array.from({length:9},(_,k)=>{
    const i=(8*k)%N;
    return [i,(i+shift)%N];
  });
}
export function exchange(state,{mode='fixed',tick=0,policy}={}){
  if(!state||!Array.isArray(state.A)||!Array.isArray(state.B) ||
    state.A.length!==N||state.B.length!==N||
    [...state.A,...state.B].some(x=>!Number.isFinite(x)||x<0||x>1)) throw Error('Invalid bounded state');
  const da=Array(N).fill(0),db=Array(N).fill(0),gain=.14;
  for(const [nodes,deltas] of [[state.A,da],[state.B,db]]){
    for(let i=0;i<N;i++) for(const step of STEPS){
      const j=(i+step)%N;
      const flow=gain*(nodes[j]-nodes[i])/8;
      deltas[i]+=flow;
      deltas[j]-=flow;
    }
  }
  const active=links({mode,tick,policy});
  let transfer=0;
  for(const [i,j] of active){
    const flow=gain*(state.B[j]-state.A[i])/9;
    da[i]+=flow; db[j]-=flow;
    transfer+=Math.abs(flow);
  }
  const next={A:state.A.map((v,i)=>v+da[i]),B:state.B.map((v,i)=>v+db[i])};
  if([...next.A,...next.B].some(x=>x<0||x>1||!Number.isFinite(x))) throw Error('State bounds violated');
  return {next,active:active.length,transfer};
}
export function metrics(state){
  const sum=x=>x.reduce((s,v)=>s+v,0), a=sum(state.A),b=sum(state.B);
  return {total:a+b,meanGap:Math.abs(a-b)/N};
}
export function simulate({mode='fixed',ticks=40,policy={outbound:true,inbound:true,channelA:'scalar.v1',channelB:'scalar.v1',privacy:'synthetic-public'}}={}){
  if(!Number.isInteger(ticks)||ticks<1||ticks>10000) throw Error('Invalid tick count');
  let state=initial();const start=metrics(state);let exchangeMagnitude=0,activeSteps=0;
  for(let tick=0;tick<ticks;tick++){
    const r=exchange(state,{mode,tick,policy});
    state=r.next; exchangeMagnitude+=r.transfer; if(r.active)activeSteps++;
  }
  const end=metrics(state);
  return {schema:PHI47_JUNCTION_SCHEMA,origin:'SIMULATED',authority:'NONE',nodesPerBubble:N,
    ticks,mode,authorized:permitted(policy),activeSteps,exchangeMagnitude,
    initialTotal:start.total,finalTotal:end.total,finalMeanGap:end.meanGap,conservationError:Math.abs(start.total-end.total)};
}
