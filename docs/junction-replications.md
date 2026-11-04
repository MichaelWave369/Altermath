# Rung 12: repeated disjoint-split junction evaluation

## Research question
The Rung 11 robustness matrix tested one fixed training seed set against one
holdout seed set. Does the reported adaptive-versus-control difference
**change substantially** when the training and holdout seeds both change?

Repeated synthetic partitions can reveal sensitivity to initial states and
selected junctions. They are **not external validation**, true k-fold
cross-validation, an independent physical experiment or proof of a mechanism.

## Prespecified design

1. Use exactly the Rung 11 stress profiles: reference, lower and higher
   coupling, earlier and later permission revocations.
2. Use the same fixed three switching fees: 0, 0.002 and 0.01.
3. For each split, train a new starting k-link subset **only on its training
   seeds** using the prior Rung 8 ablation heuristic. Evaluate all four
   maximum-budget methods on a fresh holdout block.
4. Use distinct blocks for every split. Defaults for split 1 start at 369
   (training) and 10369 (holdout). Split 2 begins at 20380 and 30380,
   respectively. The stride is **20,011**, which prevents overlap for any
   supported 3/6/9-seed block. Split 3 begins at 40391 and 50391.
5. Freeze the stress matrix, the heuristic, the seed-generation rule and
   all switching fees **before seeing** the data. Never select the most
   favorable fee or scenario after observing the holdouts.
6. Record complete signed adaptive-minus-frozen, -rotating and -shuffled
   outcomes, with paired per-seed results, average differences, worse-case
   split-profile cell, and counts of favorable/adverse/tied split outcomes.
7. Describe selection stability using the **Jaccard overlap** of the chosen
   k-link sets between splits; this ranges from zero (no shared selected
   links) to one (identical sets).

## Core invariant
Each stress profile uses the same seeded state between arms. No test seed may
appear in training, or in another split's training or test set. Rung 12 verifies
global uniqueness at runtime and tests it in CI.

## Reporting
For every baseline, profile and fee, display:
- mean signed paired difference across splits,
- min/max **split-level** difference, counts of split wins/losses/ties,
- full by-split and by-seed differences for audit.

The headline uses the **prespecified fee 0.002** and equally weights the five
stress scenarios. All signed differences are retained, even when negative.

These results are descriptive; there are no p-values, confidence intervals or
claims of independent samples from real systems. The five scenarios reuse
holdout seed states within splits and thus are correlated.

## Commands

    npm run test --prefix site
    npm run junction:replications -- 369 3 3 3 6
    npm run build --prefix site

The live React panel offers 3/6/9 splits, 3/6/9 seeds per train/test block,
a 0/3/6/9/12-link budget, baseline selection and JSON export.

## Boundaries
No runtime connectivity, network messaging or permission changes are made by
the study. Synthetic Horos rules cannot grant PhiKernel authority. Aero-Alter
Physics remains an independent department and its equations are unchanged.
