# Altermath R22 — Horizon Duality: A Causal Projection Counterexample

## Status
A reproducible **classical general-relativity educational benchmark**. This is not new physics, a theory of consciousness, a black-to-white-hole transition, or evidence for cosmological nesting. R21 Unknown Structure Challenge remains a separate proposed experiment.

## Question
Can a coarse representation of a spacetime state preserve local scalar quantities while losing predictive information about a specified future-directed trajectory?

**Yes, under the explicit restricted conditions below.** That is a known consequence of coarse-graining, not a new physical discovery.

## Frozen classical baseline
Geometrized units G=c=1, M>0. Maximally analytically extended Schwarzschild spacetime in standard Kruskal T,X coordinates:

    X² - T² = (r/(2M)-1)exp(r/(2M))
    ds² = [32 M³ exp(-r/(2M))/r](-dT²+dX²) + r²dΩ²
    K = R_abcd R^abcd = 48M²/r⁶

At r=2M the Kruskal coefficient is 16M²/e (finite). At r=0 the invariant K diverges. Classical maximal extension includes two exteriors (I,III), a future black-hole interior (II) and a past white-hole interior (IV). A realistic stellar collapse geometry is **not** this full four-sector extension.

## Predeclared demonstration
Choose two fixed-X=0 points in the interior, T=+a and T=-a with 0<a<1. Both possess identical r and K (time-reversal partner points). Apply the same future-increasing Kruskal coordinate step h with 0<h<a and a+h<1.

Default: M=1, a=.2, h=.01, eta=.4
- r0 = 1.9701267551996184
- K0 = 0.8208734771579491
- black Δr = -0.0031133164483567
- white Δr = +0.0029524114029412

Thus the coarse projection π=(r,K) identifies the two points, but the chosen future radius change is different. The restricted compensator Q=sign(T) distinguishes the two cases. For a general future evolution, position, trajectory and time orientation must be specified; Q alone is **not** a universal closure variable.

## Null and representation controls
1. Validate r=2M horizon regularity and K=3/(4M⁴).
2. Validate r=0 singularity remains and invalid coordinates fail closed.
3. Verify time reversal T→-T swaps black and white interiors in the *eternal solution*. It does **not** create a physical transition.
4. Verify boosts T'=T cosh eta+X sinh eta, X'=X cosh eta+T sinh eta preserve X²-T², r, K. These are exact isometries, not newly discovered symmetries.
5. Check the social-media +/- matrix A=[[1,-1],[-1,1]] has determinant zero. It cannot be a nondegenerate Lorentzian metric with signature (-,+). Keep the symbolism separate from the equations.

## Interpretation / falsifiers
If r differs between time-reversal partners, numerical or analytic implementation is faulty. If both selected future increments have the same radial sign, the specified counterexample fails. If the coordinate coefficient diverges at r=2M, the coordinate transform is wrong. If someone calls this result an actual black-to-white conversion, that claim exceeds the model.

Do not add a bounce parameter until a complete metric, stress-energy tensor, curvature behavior, junction conditions, and causal diagram are specified. Do not claim energy-condition satisfaction or observational viability without calculation.

## Reproduce
    node --test site/tests/horizonDuality.test.js
    npm run test --prefix site
    npm run build --prefix site

React demo at #horizon-duality. Export JSON for each parameter setting.

## Primary references
- H. S. Reall, Black Holes, Mathematical Tripos Part III lecture notes, 2024, section 2.10: https://www.damtp.cam.ac.uk/user/hsr1000/black_holes_lectures_2024.pdf
- S. Hergott, V. Husain, S. Rastgoo, Dynamical model for black hole to white hole transitions, Phys. Rev. D 113, 024049 (2026): https://doi.org/10.1103/8m7g-zz3k (distinct research hypothesis, NOT implemented here).
- R. Gaur and M. Visser, Black holes, white holes, and near-horizon physics, JHEP 05 (2024) 172: https://doi.org/10.1007/JHEP05(2024)172 (distinct transition proposal, NOT implemented here).
