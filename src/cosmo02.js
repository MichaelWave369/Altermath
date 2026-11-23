/**
 * COSMO-02 / R30: exact synthetic lineage and conservation audit.
 * No spacetime geometry, physics claim, network execution, or automatic birth.
 * Eight original 0/1 signal tokens are rearranged, never created or destroyed.
 */
export const COSMO02_AUTHORITY = 'SIMULATED / authority NONE';
export const COSMO02_OPERATIONS = Object.freeze(['hold','transform','transfer','birth']);
export const COSMO02_TOKEN_BUDGET = 8;

const boolKeys = ['permit','contact','compatible','operatorApproved','creationEnabled'];
function options(raw={}) {
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw new TypeError('options object required');
  const out={ permit:true, contact:true, compatible:true,
    operatorApproved:false, creationEnabled:false, ...raw };
  for (const k of boolKeys) if(typeof out[k]!=='boolean') throw new TypeError('invalid boolean gate: '+k);
  for (const k of Object.keys(raw)) if(!boolKeys.includes(k)) throw new TypeError('unknown gate: '+k);
  return out;
}
function checkedMask(mask){
  if(!Number.isInteger(mask)||mask<0||mask>255) throw new RangeError('mask must be an 8-bit integer');
  return mask;
}
function token(id, signal, origin){return {id,signal,origin};}
export function cosmo02Initial(mask){
  checkedMask(mask);
  const bits=Array.from({length:8},(_,i)=>(mask>>>i)&1);
  return {
    authority:COSMO02_AUTHORITY, mask, tick:0, initialOnes:bits.reduce((a,b)=>a+b,0),
    capacityBudget:COSMO02_TOKEN_BUDGET,
    domains:[
      {id:'A',parentIds:[],tokens:bits.slice(0,4).map((x,i)=>token('A'+i,x,'A'))},
      {id:'B',parentIds:[],tokens:bits.slice(4,8).map((x,i)=>token('B'+i,x,'B'))}
    ],
    ancestry:[], events:[], actionStatus:'initial'
  };
}
function copy(world) {
  return { ...world, domains:world.domains.map(d=>({...d,parentIds:d.parentIds.slice(),
    tokens:d.tokens.map(t=>({...t}))})),
    ancestry:world.ancestry.map(a=>({...a,parents:a.parents.slice()})),
    events:world.events.map(e=>({...e})) };
}
function countOnes(world){return world.domains.reduce((s,d)=>s+d.tokens.reduce((a,t)=>a+t.signal,0),0);}
function countTokens(world){return world.domains.reduce((s,d)=>s+d.tokens.length,0);}
function domain(world,id){return world.domains.find(d=>d.id===id);}
function snapshot(world){return world.domains.map(d=>({id:d.id,parents:d.parentIds.slice(),
  tokenIds:d.tokens.map(t=>t.id), signals:d.tokens.map(t=>t.signal)}));}

export function cosmo02Audit(world){
  if(!world || !Array.isArray(world.domains)) return {ok:false,errors:['invalid world']};
  const errors=[];
  const ids=new Set();
  const domainIds=new Set();
  for(const d of world.domains){
    if(domainIds.has(d.id))errors.push('duplicate domain');
    domainIds.add(d.id);
    for(const t of d.tokens){
      if(ids.has(t.id))errors.push('duplicate token '+t.id);
      ids.add(t.id);
      if(t.signal!==0 && t.signal!==1)errors.push('invalid signal '+t.id);
      if(t.origin!=='A' && t.origin!=='B')errors.push('invalid provenance '+t.id);
    }
  }
  const required=['A0','A1','A2','A3','B0','B1','B2','B3'];
  if(required.some(id=>!ids.has(id))||ids.size!==8)errors.push('token census mismatch');
  if(countTokens(world)!==COSMO02_TOKEN_BUDGET)errors.push('token budget violation');
  if(countOnes(world)!==world.initialOnes)errors.push('signal-count violation');
  if(!domainIds.has('A')||!domainIds.has('B'))errors.push('parent domain missing');
  if(domainIds.has('C@1')){
    const c=domain(world,'C@1');
    if(c.parentIds.join(',')!=='A,B')errors.push('invalid parent lineage');
    if(c.tokens.length!==2)errors.push('child capacity mismatch');
    if(!world.ancestry.some(a=>a.child==='C@1'&&a.status==='active'))errors.push('missing active birth lineage');
  }
  if(world.ancestry.length>1)errors.push('unbounded ancestry');
  return {ok:errors.length===0, errors, totalTokens:countTokens(world),
    ones:countOnes(world), domainCount:world.domains.length, childExists:domainIds.has('C@1')};
}

function denied(world,mode,reason){
  const next=copy(world);
  next.actionStatus='refused:'+reason;
  next.events.push({tick:next.tick,type:'refusal',mode,reason});
  return next;
}
export function cosmo02Transition(mask,mode='hold',raw={}){
  if(!COSMO02_OPERATIONS.includes(mode))throw new TypeError('unknown operation');
  const o=options(raw);
  const world=cosmo02Initial(mask);
  if(mode==='hold'){
    world.actionStatus='held';
    return world;
  }
  if(mode==='transform'){
    const a=domain(world,'A'), b=domain(world,'B');
    a.tokens.unshift(a.tokens.pop());
    b.tokens.push(b.tokens.shift());
    world.events.push({tick:0,type:'transform',note:'local rotations; zero new domains'});
    world.actionStatus='transformed';
    return world;
  }
  const failed= !o.permit?'permission':!o.contact?'contact':!o.compatible?'compatibility':null;
  if(failed)return denied(world,mode,failed);
  const a=domain(world,'A'),b=domain(world,'B');
  if(mode==='transfer'){
    const fromA=a.tokens.pop(),fromB=b.tokens.shift();
    a.tokens.push(fromB);b.tokens.unshift(fromA);
    world.events.push({tick:0,type:'transfer',aToken:fromA.id,bToken:fromB.id,
      note:'endpoint swap without domain creation'});
    world.actionStatus='transferred';
  } else {
    if(!o.operatorApproved)return denied(world,mode,'operator_approval');
    if(!o.creationEnabled)return denied(world,mode,'creation_disabled');
    const donorA=a.tokens.pop(), donorB=b.tokens.shift();
    world.domains.push({id:'C@1',parentIds:['A','B'],tokens:[donorA,donorB]});
    world.ancestry.push({child:'C@1',parents:['A','B'],tick:0,status:'active'});
    world.events.push({tick:0,type:'birth',child:'C@1',parentIds:['A','B'],
      tokenIds:[donorA.id,donorB.id],note:'two pre-existing tokens rehomed'});
    world.actionStatus='born';
  }
  return world;
}
export function cosmo02Advance(world,steps=1){
  if(!Number.isInteger(steps)||steps<0||steps>16)throw new RangeError('steps must be 0–16');
  if(!cosmo02Audit(world).ok)throw new Error('cannot advance invalid world');
  const next=copy(world);
  for(let i=0;i<steps;i++){
    for(const d of next.domains)if(d.tokens.length>1)d.tokens.unshift(d.tokens.pop());
    next.tick++;
  }
  next.events.push({tick:next.tick,type:'advance',steps,
    note:'local permutation only; no physical dynamics'});
  return next;
}
export function cosmo02Merge(world,raw={}){
  const o=options(raw);
  if(!cosmo02Audit(world).ok)throw new Error('invalid world');
  const child=domain(world,'C@1');
  if(!child)return denied(world,'merge','no_child');
  const failed=!o.permit?'permission':!o.contact?'contact':!o.compatible?'compatibility':
    !o.operatorApproved?'operator_approval':null;
  if(failed)return denied(world,'merge',failed);
  if(child.tokens.length!==2 || !child.tokens.some(t=>t.origin==='A') ||
     !child.tokens.some(t=>t.origin==='B'))return denied(world,'merge','invalid_donors');
  const next=copy(world);
  const c=domain(next,'C@1'),a=domain(next,'A'),b=domain(next,'B');
  const fromA=c.tokens.find(t=>t.origin==='A');
  const fromB=c.tokens.find(t=>t.origin==='B');
  a.tokens.push(fromA);b.tokens.unshift(fromB);
  next.domains=next.domains.filter(d=>d.id!=='C@1');
  next.ancestry=next.ancestry.map(x=>x.child==='C@1'?{...x,status:'retired',retiredAt:next.tick}:x);
  next.events.push({tick:next.tick,type:'merge',child:'C@1',
    restoredOrigins:['A','B'],note:'child container retired; provenance retained'});
  next.actionStatus='merged';
  return next;
}
function entropy(rows,key){
  const groups=new Map();
  for(const row of rows){
    const group=key(row);
    if(!groups.has(group))groups.set(group,new Map());
    const counts=groups.get(group),y=row.childOnes;
    counts.set(y,(counts.get(y)||0)+1);
  }
  let h=0;
  for(const counts of groups.values()){
    const total=[...counts.values()].reduce((a,b)=>a+b,0);
    for(const n of counts.values()){const p=n/total;h-=(total/rows.length)*p*Math.log2(p);}
  }
  return h;
}
export function cosmo02Census(){
  const modes=[];
  for(const mode of COSMO02_OPERATIONS){
    let born=0,changedTokenArrangement=0,changedParentSignals=0,conservationFailures=0,refusals=0;
    for(let mask=0;mask<256;mask++){
      const initial=cosmo02Initial(mask);
      const result=cosmo02Transition(mask,mode,{operatorApproved:true,creationEnabled:true});
      if(!cosmo02Audit(result).ok)conservationFailures++;
      if(result.actionStatus.startsWith('refused'))refusals++;
      if(domain(result,'C@1'))born++;
      if(JSON.stringify(snapshot(initial))!==JSON.stringify(snapshot(result)))changedTokenArrangement++;
      if(['A','B'].some(id=>{
        const initialSignals=domain(initial,id).tokens.map(t=>t.signal);
        const resultSignals=domain(result,id).tokens.map(t=>t.signal);
        return JSON.stringify(initialSignals)!==JSON.stringify(resultSignals);
      }))changedParentSignals++;
    }
    modes.push({mode,states:256,childCases:born,changedTokenArrangement,
      changedParentSignals,conservationFailures,refusals});
  }
  const records=Array.from({length:256},(_,mask)=>{
    const result=cosmo02Transition(mask,'birth',{operatorApproved:true,creationEnabled:true});
    return {mask,coarse:[mask&15,(mask>>>4)&15].map(x=>x.toString(2).split('1').length-1),
      donorA:(mask>>>3)&1,donorB:(mask>>>4)&1,
      childOnes:domain(result,'C@1').tokens.reduce((s,t)=>s+t.signal,0)};
  });
  const keyCoarse=r=>r.coarse.join(':');
  const keyOne=r=>keyCoarse(r)+':'+r.donorA;
  const keyBoth=r=>keyOne(r)+':'+r.donorB;
  let witness=null;
  const seen=new Map();
  for(const r of records){
    const key=keyCoarse(r),prior=seen.get(key);
    if(prior&&prior.childOnes!==r.childOnes){witness={observed:r.coarse,
      a:{mask:prior.mask,childOnes:prior.childOnes},
      b:{mask:r.mask,childOnes:r.childOnes}};break;}
    if(!prior)seen.set(key,r);
  }
  return {authority:COSMO02_AUTHORITY,prior:'exact uniform 256 input states',
    modes,childObservation:{
      observable:'child count of 1-valued inherited signals, conditional on authorized birth',
      coarseEntropyBits:entropy(records,keyCoarse),
      oneDonorEntropyBits:entropy(records,keyOne),
      twoDonorEntropyBits:entropy(records,keyBoth),
      witness,
    }};
}
