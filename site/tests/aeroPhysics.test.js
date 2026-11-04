import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAVITY,AERO_SCHEMA,wingForces,drivenResonance,momentumThrust,fluidBuoyancy} from '../src/aeroPhysics.js';

test('versioned public schema stays stable for exported experimental records',()=>{
  assert.equal(AERO_SCHEMA,'altermath.aero-alter.v1');
});
test('wing model: zero airspeed means zero aerodynamic lift and drag',()=>{
  const x=wingForces({massKg:1240,speedMs:0,areaM2:18,liftCoefficient:1});
  assert.equal(x.liftN,0);assert.equal(x.dragN,0);assert.equal(x.balancesWeight,false);
});
test('wing model obeys speed-squared scaling, and full load weight',()=>{
  const args={massKg:1240,areaM2:18,liftCoefficient:1};
  const a=wingForces({...args,speedMs:20});
  const b=wingForces({...args,speedMs:40});
  assert.equal(b.liftN,4*a.liftN);
  assert.equal(a.weightN,1240*GRAVITY);
  assert.ok(b.liftToWeight>a.liftToWeight);
});
test('wing model detects weight balance at high speed, no claim of stable flight',()=>{
  const x=wingForces({massKg:1240,speedMs:70,areaM2:30,liftCoefficient:1});
  assert.equal(x.balancesWeight,true);
});
test('resonance peak is stronger than off-resonance response for low damping',()=>{
  const args={naturalHz:40,dampingRatio:0.08,forceN:10,modalMassKg:1};
  const peak=drivenResonance({...args,driveHz:40});
  const off=drivenResonance({...args,driveHz:10});
  assert.ok(peak.amplification>off.amplification);
  assert.ok(peak.displacementMm>off.displacementMm);
  assert.equal(peak.netLiftN,0);
});
test('no forcing yields zero resonance response without NaN',()=>{
  const x=drivenResonance({naturalHz:40,driveHz:40,dampingRatio:0.1,forceN:0});
  assert.equal(x.displacementMm,0);assert.equal(x.amplification,0);
});
test('momentum thrust is flow times exhaust velocity',()=>{
  const x=momentumThrust({massKg:2450,massFlowKgS:8,exhaustSpeedMs:3200});
  assert.equal(x.thrustN,25600);
  assert.equal(x.propellantPerMinuteKg,480);
  assert.equal(x.balancesWeight,true);
});
test('no mass flow means no rocket thrust even with exhaust speed',()=>{
  const x=momentumThrust({massKg:2450,massFlowKgS:0,exhaustSpeedMs:3200});
  assert.equal(x.thrustN,0);assert.equal(x.balancesWeight,false);
});
test('same vessel displaces far more buoyant force in water than air',()=>{
  const args={massKg:2450,displacementM3:3};
  const a=fluidBuoyancy({...args,medium:'air'});
  const w=fluidBuoyancy({...args,medium:'freshwater'});
  assert.ok(w.buoyancyN>a.buoyancyN*800);
  assert.equal(a.balancesWeight,false);assert.equal(w.balancesWeight,true);
});
test('zero displacement gives zero buoyancy; seawater exceeds freshwater',()=>{
  assert.equal(fluidBuoyancy({massKg:10,displacementM3:0,medium:'air'}).buoyancyN,0);
  const args={massKg:10,displacementM3:1};
  assert.ok(fluidBuoyancy({...args,medium:'seawater'}).buoyancyN>fluidBuoyancy({...args,medium:'freshwater'}).buoyancyN);
});
test('invalid parameters and unknown medium fail closed',()=>{
  assert.throws(()=>wingForces({massKg:-1,speedMs:2,areaM2:3,liftCoefficient:1}),RangeError);
  assert.throws(()=>wingForces({massKg:1,speedMs:Infinity,areaM2:3,liftCoefficient:1}),RangeError);
  assert.throws(()=>drivenResonance({driveHz:4,naturalHz:0,dampingRatio:0.1}),RangeError);
  assert.throws(()=>drivenResonance({driveHz:4,naturalHz:40,dampingRatio:0}),RangeError);
  assert.throws(()=>momentumThrust({massKg:1,massFlowKgS:NaN,exhaustSpeedMs:3}),RangeError);
  assert.throws(()=>fluidBuoyancy({massKg:1,displacementM3:1,medium:'aether'}),RangeError);
});
