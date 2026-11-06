/**
 * R22 Horizon Duality — exactly solvable classical Schwarzschild baseline.
 * All quantities in geometrized units (G=c=1).
 * This module does NOT model a black-to-white-hole physical transition.
 */
export const SCHEMA='altermath-r22:horizon-duality:v1';
function finite(n,name){if(typeof n!=='number'||!Number.isFinite(n))throw new RangeError('Invalid '+name);}
function positive(n,name){finite(n,name);if(n<=0)throw new RangeError(name+' must be positive');}
function rhs(y){return (y-1)*Math.exp(y);}

/**
 * Solve X²-T² = (r/(2M)-1)exp(r/(2M)) for r>0.
 * Monotonicity of RHS on r>0 makes bisection deterministic.
 * Region r=0 (T²-X²=1) is excluded; its curvature diverges.
 */
export function arealRadius(T,X,M=1){
  finite(T,'T');finite(X,'X');positive(M,'M');
  const q=X*X-T*T;
  if(q<=-1)throw new RangeError('At or beyond Schwarzschild r=0 singularity');
  let lo=0,hi=2;
  while(rhs(hi)<q){hi*=2;if(hi>512)throw new RangeError('Kruskal coordinates beyond numerical range');}
  for(let i=0;i<90;i++){
    const mid=(lo+hi)/2;
    if(rhs(mid)<q)lo=mid;else hi=mid;
  }
  return M*(lo+hi);
}
export function region(T,X){
  finite(T,'T');finite(X,'X');
  if(Math.abs(Math.abs(T)-Math.abs(X))<1e-12)return 'HORIZON';
  if(T>Math.abs(X))return 'II · BLACK INTERIOR';
  if(-T>Math.abs(X))return 'IV · WHITE INTERIOR';
  return X>0?'I · RIGHT EXTERIOR':'III · LEFT EXTERIOR';
}
export function kretschmann(r,M=1){
  positive(r,'r');positive(M,'M');return 48*M*M/Math.pow(r,6);
}
export function kruskalCoefficient(r,M=1){
  positive(r,'r');positive(M,'M');return (32*M*M*M/r)*Math.exp(-r/(2*M));
}
export function horizonCoefficient(M=1){positive(M,'M');return 16*M*M/Math.E;}
export function timeReverse({T,X}){finite(T,'T');finite(X,'X');return {T:-T,X};}
export function kruskalBoost({T,X},eta){
  finite(T,'T');finite(X,'X');finite(eta,'eta');
  return {T:T*Math.cosh(eta)+X*Math.sinh(eta),X:X*Math.cosh(eta)+T*Math.sinh(eta)};
}
/** Restricted fixed-X=0, future-increasing-T experiment. */
export function runHorizonStudy({M=1,a=0.2,step=0.01,eta=0.4}={}){
  positive(M,'M');positive(a,'a');positive(step,'step');finite(eta,'eta');
  if(a>=1||step>=a||a+step>=1)throw new RangeError('Require step < a and a + step < 1');
  if(Math.abs(eta)>4)throw new RangeError('Rapidity out of lab bounds');
  const black={T:a,X:0},white=timeReverse(black);
  const rBlack=arealRadius(black.T,black.X,M);
  const rWhite=arealRadius(white.T,white.X,M);
  const futureBlack=arealRadius(a+step,0,M);
  const futureWhite=arealRadius(-a+step,0,M);
  const blackBoost=kruskalBoost(black,eta);
  const whiteBoost=kruskalBoost(white,eta);
  const K=kretschmann(rBlack,M);
  const residue=2*Math.sign(a);
  return {
    schema:SCHEMA, authority:'CLASSICAL GENERAL RELATIVITY / MATHEMATICAL DEMONSTRATION',
    limits:'Eternal maximally extended Schwarzschild spacetime; fixed-X=0 timelike curves. No matter, collapse, bounce, transition, quantum gravity, or observational claim.',
    parameters:{M,a,step,eta},
    black:{...black,region:region(a,0),initialRadius:rBlack,initialCurvature:K,futureRadius:futureBlack,deltaR:futureBlack-rBlack,boosted:blackBoost},
    white:{...white,region:region(-a,0),initialRadius:rWhite,initialCurvature:kretschmann(rWhite,M),futureRadius:futureWhite,deltaR:futureWhite-rWhite,boosted:whiteBoost},
    projection:{visible:['areal radius','Kretschmann curvature'],hidden:'time orientation sign(T) for this fixed-X benchmark',
      sameVisible:Math.abs(rBlack-rWhite)<=1e-11*M,
      oppositeEvolution:(futureBlack-rBlack)<0&&(futureWhite-rWhite)>0,
      signedResidue:residue},
    controls:{horizonRadius:2*M,horizonCurvature:3/(4*Math.pow(M,4)),
      horizonCoefficient:horizonCoefficient(M),
      boostInvariantRadiusBlack:arealRadius(blackBoost.T,blackBoost.X,M),
      boostInvariantRadiusWhite:arealRadius(whiteBoost.T,whiteBoost.X,M),
      signMatrixDeterminant:0,lorentzianMetricDeterminant:-1}
  };
}
