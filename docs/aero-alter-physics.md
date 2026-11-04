# Aero-Alter Physics Department — Rung 10

> **Four old names. Four testable questions.**
> Research-first interactive teaching experiments inspired by the four craft names
> in the twentieth-century *Vymanika/Vaimānika Shāstra* literature and by modern
> fictional "Victorist Collective" blueprint artwork.

## Provenance: three layers that must not be conflated

1. **Historical literary context:** the names Shakuna, Rukma, Sundara and Tripura
   appear in the *Vymanika Shastra*. They should not be mistaken for
   independently verified ancient aircraft specifications. The work is associated
   with Subbaraya Shastry and twentieth-century manuscript history.
2. **Modern illustrative speculation:** the social-media "Victorist Collective"
   diagrams add dates in the 1800s, aether coils, quartz power plants, invented
   materials and performance figures. These labels are **not historical evidence**
   or engineering validation. Our own SVG drawings are new, schematic, non-scale
   abstractions, not reproductions of the social-media images.
3. **Established physics:** the formulas below are ordinary textbook models.
   They are independent from the claimed craft's supposed engineering.

A 1974 technical review by H. S. Mukunda, S. M. Deshpande, H. R. Nagendra,
A. Prabhu and S. P. Govindaraju of the Indian Institute of Science rejected
the technical feasibility of the craft as described. Its review explicitly covers
all four names.

**Primary critical source:** [*A Critical Study of the Work "Vymanika Shastra"*
(IISc, 1974)](https://www.rarebooksocietyofindia.org/book_archive/196174216674_10152962830606675.pdf).
See also the [National Digital Library of India catalogue](https://ndl.iitkgp.ac.in/ch_document/rbsi/rbsi/articlesessays_196174216674_10152962826526675).
The PDF is an external research reference, not a dataset ingested by the model.

## Four stations and exact assumptions

| Station | Hypothesis translated into a measurable question | Formula | Important exclusion |
| --- | --- | --- | --- |
| **Shakuna / wing** | Can an assumed wing configuration produce upward force equal to weight? | `q = 0.5 rho_air v²; L = q S CL; D = q S CD; W = mg` | No stall curve, airfoil, control, trim, true flight envelope or structural sizing. Constant `CD=0.08`. |
| **Rukma / bell** | How does a damped mechanical mode respond to a frequency sweep? | `x = F/sqrt((k-mω²)² + (cω)²)`; `k=mω₀²`; `c=2ζmω₀` | **No net levitation thrust** is computed. Forced vibration is not antigravity. |
| **Sundara / rocket** | What mass flow and exhaust velocity would balance vehicle weight in an ideal thrust comparison? | `T = ṁ v_e`; `W=mg` | Exit-pressure term excluded; no fuel duration, chamber performance, trajectory, heat or flight control. |
| **Tripura / multi-medium** | How does displaced-fluid buoyancy change between air, fresh water and sea water? | `B = ρ_fluid g V`; `W=mg` | Assumes full fluid displacement; no vessel integrity, center-of-buoyancy stability, ground locomotion or drag. |

### Constants

- `g = 9.80665 m/s²`, standard gravity (not location specific).
- Air at a representative sea-level density: `1.225 kg/m³`.
- Fresh water: `1000 kg/m³`; seawater: `1025 kg/m³`.
- Rukma default forcing: `10 N`; participating modal mass: `1 kg`.
- All controls and physics calculations are SI. Values such as `1240 kg`
  and `2450 kg` were selected to explore the **fictional** social-media
  picture annotations, not accepted as historical or verified specifications.
- Numerically passing a one-axis force-to-weight check is **not evidence of
  an aircraft able to fly**. Mechanical resonance can increase amplitude
  without producing translational net force.

## Reproducibility and export

The browser's Rung 10 component reads a pure deterministic model:
[`site/src/aeroPhysics.js`](../site/src/aeroPhysics.js).
Each station retains its own parameter values while browsing others.
Exported JSON includes `schema: altermath.aero-alter.v1`, station ID,
parameters, calculated outputs and epistemic disclaimer. Export dates are
file metadata, not physical experiment inputs. No network requests are made.

### Run

```bash
npm run test --prefix site
npm run build --prefix site
```

The first command includes `site/tests/aeroPhysics.test.js` alongside
existing React research-core tests. The second builds the existing Pages site.
The department is anchored at `#aero-alter` in the React front door.

## Future experimental rungs (not built here)

- Aerodynamic `C_L(α)` and stall envelope with explicit airfoil assumptions.
- Bench-measurable driven vibration, frequency response and damping plots.
- Rocket equation mass depletion and nozzle pressure terms.
- Coupled modes and numerical stability checks with same-energy baselines.
- XR observatory that shows assumptions and equations before speculative designs.

There is no hidden propulsion discovery, evidence of 1897 technology,
etheric energy, free energy, or validated antigravity mechanism in this rung.
