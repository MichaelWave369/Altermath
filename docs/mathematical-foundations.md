# Minimal mathematical model

Each bubble B_i carries state s_i∈[0,1], position p_i∈R², radius r_i>0, parent h_i, permissions P_i, compatible channels C_i and permeability q_i∈[0,1].

An edge (i,j) may exist at tick t when structural relation, mutual permissions, shared channel, and (when appropriate) geometric contact allow it. The result is a dynamic graph G_t=(V,E_t).

For an active edge, let d_i and d_j be vertex degrees and let g∈[0,1] be the exchange gain. The signed flow **into i** is:

    f_ij = g · min(q_i,q_j) · (s_j - s_i) / max(1,d_i,d_j)

All flows are calculated from the previous state, then applied simultaneously:

    s_i(t+1) = s_i(t) + Σ_j f_ij

Because f_ji = -f_ij, total signal Σ_i s_i is conserved in the absence of explicit injections (up to floating-point error). Degree-based normalization avoids overshoot from many simultaneous connections. A completed Altermath event requires |f_ij| > 1e-10.

## Three controls

- **Adaptive:** recompute eligible contact-sensitive edges at every tick.
- **Fixed:** freeze the eligible edge identifiers at mode selection.
- **Isolated:** disable coupling.

A new graph edge is an extra **relationship variable**, not evidence of an additional physical spatial dimension. The model is a toy diffusion simulation, not a description of gravity, quantum fields, the human body, or subjective awareness.
