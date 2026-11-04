// Rung 10: deterministic, SI-unit textbook physics. Not a vimana flight model.
export const GRAVITY=9.80665;
export const AIR_DENSITY=1.225;
export const WATER_DENSITY={air:AIR_DENSITY,freshwater:1000,seawater:1025};
export const AERO_SCHEMA='altermath.aero-alter.v1';

function range(name,value,min,max){
  if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(name+' must be finite and in ['+min+', '+max+']');
  return value;
}

/** Idealized steady wing forces at a user-specified constant lift coefficient.
 * Does not model stall, trim, wing geometry, or stability. */
export function wingForces({massKg,speedMs,areaM2,liftCoefficient,dragCoefficient=0.08}){
  range('massKg',massKg,0.01,1e7);
  range('speedMs',speedMs,0,1e4);
  range('areaM2',areaM2,0.01,1e5);
  range('liftCoefficient',liftCoefficient,0,3);
  range('dragCoefficient',dragCoefficient,0,3);
  const dynamicPressurePa=0.5*AIR_DENSITY*speedMs**2;
  const liftN=dynamicPressurePa*areaM2*liftCoefficient;
  const dragN=dynamicPressurePa*areaM2*dragCoefficient;
  const weightN=massKg*GRAVITY;
  return {dynamicPressurePa,liftN,dragN,weightN,liftToWeight:liftN/weightN,balancesWeight:liftN>=weightN};
}

/** Driven damped oscillator: x=F/sqrt((k-m*w^2)^2+(c*w)^2).
 * A high oscillation amplitude does not imply lift or net force. */
export function drivenResonance({driveHz,naturalHz,dampingRatio,forceN=10,modalMassKg=1}){
  range('driveHz',driveHz,0,2e4);
  range('naturalHz',naturalHz,0.01,2e4);
  range('dampingRatio',dampingRatio,0.001,1);
  range('forceN',forceN,0,1e6);
  range('modalMassKg',modalMassKg,0.001,1e5);
  const omega0=2*Math.PI*naturalHz;
  const omega=2*Math.PI*driveHz;
  const stiffnessNPerM=modalMassKg*omega0**2;
  const dampingNsPerM=2*dampingRatio*modalMassKg*omega0;
  const displacementM=forceN/Math.hypot(stiffnessNPerM-modalMassKg*omega**2,dampingNsPerM*omega);
  const staticDisplacementM=forceN/stiffnessNPerM;
  return {displacementMm:displacementM*1000,amplification:forceN===0?0:displacementM/staticDisplacementM,netLiftN:0};
}

/** Ideal exhaust momentum thrust, omitting nozzle exit-pressure contribution. */
export function momentumThrust({massKg,massFlowKgS,exhaustSpeedMs}){
  range('massKg',massKg,0.01,1e7);
  range('massFlowKgS',massFlowKgS,0,1e5);
  range('exhaustSpeedMs',exhaustSpeedMs,0,1e5);
  const thrustN=massFlowKgS*exhaustSpeedMs;
  const weightN=massKg*GRAVITY;
  return {thrustN,weightN,thrustToWeight:thrustN/weightN,balancesWeight:thrustN>=weightN,
    propellantPerMinuteKg:massFlowKgS*60};
}

/** Archimedes' principle, full displacement assumed, before hydrodynamics or stability. */
export function fluidBuoyancy({massKg,displacementM3,medium}){
  range('massKg',massKg,0.01,1e7);
  range('displacementM3',displacementM3,0,1e5);
  if(!Object.hasOwn(WATER_DENSITY,medium))throw new RangeError('Unknown medium');
  const densityKgM3=WATER_DENSITY[medium];
  const buoyancyN=densityKgM3*GRAVITY*displacementM3;
  const weightN=massKg*GRAVITY;
  return {densityKgM3,buoyancyN,weightN,buoyancyToWeight:buoyancyN/weightN,
    balancesWeight:buoyancyN>=weightN};
}
