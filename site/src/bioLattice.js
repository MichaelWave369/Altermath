// Educational 13-protofilament lattice transport comparison.
// NOT a molecular dynamics/QED solver, quantum biology inference, or consciousness test.
export const BIO_LATTICE_SCHEMA='altermath.bio-lattice.v1';

function bounded(name,v,min,max){
  if(!Number.isFinite(v)||v<min||v>max) throw new RangeError(name+' must be finite in ['+min+', '+max+']');
  return v;
}
function noise(seed,count){
  let state=(seed>>>0)||1;const out=new Float64Array(count);
  for(let i=0;i<count;i++){state^=state<<13;state^=state>>>17;state^=state<<5;out[i]=(state>>>0)/4294967296;}
  return out;
}
function edgesFor(rings,protofilaments){
  const axial=[[],[]],hoop=[[],[]];
  const idx=(r,p)=>r*protofilaments+p;
  for(let r=0;r<rings-1;r++)for(let p=0;p<protofilaments;p++)
    axial[r%2].push([idx(r,p),idx(r+1,p)]);
  for(let r=0;r<rings;r++)for(let p=0;p<protofilaments;p++)
    hoop[p%2].push([idx(r,p),idx(r,(p+1)%protofilaments)]);
  return [...axial,...hoop];
}
export function simulateBioLattice({
  mode='hopping',rings=18,protofilaments=13,coupling=0.38,
  disorder=0.15,loss=0.008,steps=32,seed=369
}={}){
  if(!['hopping','amplitude'].includes(mode))throw new RangeError('Unknown mode');
  if(!Number.isInteger(rings)||rings<4||rings>30)throw new RangeError('rings must be integer 4..30');
  if(!Number.isInteger(protofilaments)||protofilaments<3||protofilaments>20)throw new RangeError('protofilaments must be integer 3..20');
  bounded('coupling',coupling,0,1);bounded('disorder',disorder,0,1);bounded('loss',loss,0,0.2);
  if(!Number.isInteger(steps)||steps<0||steps>120)throw new RangeError('steps must be integer 0..120');
  if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw new RangeError('seed must be integer 0..2147483647');
  const size=rings*protofilaments,source=2*protofilaments+Math.floor(protofilaments/2);
  const fields=noise(seed,size),edgeGroups=edgesFor(rings,protofilaments);
  const population=new Float64Array(size),real=new Float64Array(size),imag=new Float64Array(size);
  population[source]=1;real[source]=1;
  // Each pair gate conserves population (hopping) or squared amplitude (amplitude).
  // Both are toy models with arbitrary dimensionless per-tick coefficients.
  for(let tick=0;tick<steps;tick++){
    if(mode==='amplitude'){
      for(let i=0;i<size;i++){
        const phase=disorder*(fields[i]-.5)*1.8;
        const c=Math.cos(phase),s=Math.sin(phase),a=real[i],b=imag[i];
        real[i]=c*a-s*b;imag[i]=s*a+c*b;
      }
    }
    for(const group of edgeGroups)for(const [a,b] of group){
      const suppression=1-0.65*disorder*Math.abs(fields[a]-fields[b]);
      const theta=0.42*coupling*suppression;
      if(mode==='hopping'){
        const rate=Math.sin(theta)**2,transfer=rate*(population[a]-population[b]);
        population[a]-=transfer;population[b]+=transfer;
      } else {
        const c=Math.cos(theta),s=Math.sin(theta);
        const ar=real[a],ai=imag[a],br=real[b],bi=imag[b];
        real[a]=c*ar+s*bi;imag[a]=c*ai-s*br;
        real[b]=c*br+s*ai;imag[b]=c*bi-s*ar;
      }
    }
    if(mode==='hopping'){
      for(let i=0;i<size;i++)population[i]*=(1-loss);
    }else{
      const attenuation=Math.sqrt(1-loss);
      for(let i=0;i<size;i++){real[i]*=attenuation;imag[i]*=attenuation;}
    }
  }
  if(mode==='amplitude')for(let i=0;i<size;i++)population[i]=real[i]**2+imag[i]**2;
  let survival=0,meanRing=0,second=0,concentration=0;
  for(let i=0;i<size;i++){const p=population[i];survival+=p;meanRing+=p*Math.floor(i/protofilaments);}
  if(survival>0)meanRing/=survival;
  for(let i=0;i<size;i++){
    const w=population[i]/survival;
    second+=w*(Math.floor(i/protofilaments)-meanRing)**2;
    concentration+=w*w;
  }
  return {
    schema:BIO_LATTICE_SCHEMA,mode,parameters:{rings,protofilaments,coupling,disorder,loss,steps,seed},
    source,probabilities:Array.from(population),
    metrics:{
      survival,axialSpreadSites:Math.sqrt(second),
      effectiveSites:concentration?1/concentration:0,
      meanRing,lossFraction:Math.max(0,1-survival)
    },
    disclaimer:'Dimensionless illustrative paired-gate models. No calibration to molecular rates, quantum coherence times, or consciousness.'
  };
}
