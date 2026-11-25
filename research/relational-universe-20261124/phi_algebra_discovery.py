#!/usr/bin/env python3
"""Finite model discovery benchmark. Python standard library only."""
import itertools as it
import random, math, json
from collections import defaultdict, Counter
from pathlib import Path

N=8
X=range(N)
SEED=369
TRIALS=369

def modular(a,b): return tuple((a*x+b)%8 for x in X)
def affine(b,u,v,w):
    return tuple(b ^ (u if x&1 else 0) ^ (v if x&2 else 0) ^ (w if x&4 else 0) for x in X)
def ca(rule):
    return tuple(sum(((rule >> ((((x>>((i-1)%3))&1)<<2) | (((x>>i)&1)<<1) | ((x>>((i+1)%3))&1)))&1)<<i for i in range(3)) for x in X)

def library():
    families={'modular':{modular(a,b) for a,b in it.product(X,repeat=2)},
              'bit_affine':{affine(*p) for p in it.product(X,repeat=4)},
              'cellular_automaton':{ca(r) for r in range(256)}}
    labels=defaultdict(set)
    for family, maps in families.items():
        for m in maps: labels[m].add(family)
    maps=sorted(labels)
    index={(x,y):{i for i,m in enumerate(maps) if m[x]==y} for x in X for y in X}
    return families, labels, maps, index

def fit(oracle, maps, index, order=None):
    candidates=set(range(len(maps))); remaining=set(X); observed={}
    while len(candidates)>1 and remaining:
        if order is None:
            def entropy(x):
                counts=Counter(maps[i][x] for i in candidates)
                return -sum((c/len(candidates))*math.log2(c/len(candidates)) for c in counts.values())
            x=max(sorted(remaining),key=entropy)
        else: x=next(x for x in order if x in remaining)
        y=oracle(x); observed[x]=y; remaining.remove(x); candidates &= index[x,y]
    guess=maps[next(iter(candidates))] if len(candidates)==1 else None
    return observed, guess

def run():
    rng=random.Random(SEED)
    families, labels, maps, index=library()
    results={}
    generators={
      'modular':lambda:modular(rng.randrange(8),rng.randrange(8)),
      'bit_affine':lambda:affine(*(rng.randrange(8) for _ in range(4))),
      'cellular_automaton':lambda:ca(rng.randrange(256)),
      'random_permutation':lambda:tuple(rng.sample(list(X),8)),
      'random_many_to_one':lambda:tuple(rng.randrange(4) for _ in X),
      'state_dependent':lambda:tuple((x+1)%8 if x<4 else (x*2+rng_offset)%8 for x in X),
    }
    # State-dependent generator uses a fixed offset chosen per world, not per query.
    for family,gen in generators.items():
        stats=Counter()
        for _ in range(TRIALS):
            rng_offset=rng.randrange(8)
            truth=gen(); oracle=lambda x:truth[x]
            order=list(X); rng.shuffle(order)
            obs,guess=fit(oracle,maps,index)
            robs,rguess=fit(oracle,maps,index,order)
            stats['active_probes']+=len(obs);stats['random_probes']+=len(robs)
            stats['in_library']+=truth in labels
            stats['multiple_compatible_families']+=len(labels.get(truth,()))>1
            stats['reversible']+=len(set(truth))==8
            if guess is not None:
                stats['provisional_models']+=1
                stats['provisional_correct']+=guess==truth
                stats['withheld_predictions']+=8-len(obs)
                stats['withheld_correct']+=sum(guess[x]==truth[x] for x in X if x not in obs)
            # Verify every withheld transition; on counterexample or no model, retain full table.
            verified=tuple(obs[x] if x in obs else oracle(x) for x in X)
            stats['counterexample_models']+=guess is not None and guess!=verified
            stats['final_structured']+=verified in labels
            stats['final_table_fallback']+=verified not in labels
            stats['final_correct']+=verified==truth
        results[family]=dict(stats)
    noise={}
    for p in (0.0,0.01,0.10,0.25):
        stats=Counter()
        for _ in range(TRIALS):
            base=modular(1,rng.randrange(8)); hot=rng.randrange(8)
            seen=[set() for _ in X]
            for k in range(96):
                for x in X:
                    y=(base[x]+1)%8 if x==hot and rng.random()<p else base[x]
                    seen[x].add(y)
                if k+1 in (24,96): stats[str(k+1)]+=any(len(s)>1 for s in seen)
        noise[str(p)]={'detected_24':stats['24'],'detected_96':stats['96'],
                       'theory_24':1-(1-p)**24-p**24,'theory_96':1-(1-p)**96-p**96}
    return {'seed':SEED,'trials_per_family':TRIALS,'candidate_counts':{k:len(v) for k,v in families.items()},'unique_maps':len(maps),'deterministic':results,'noise':noise}

if __name__=='__main__':
    result=run()
    output=Path(__file__).with_name('phi_algebra_results.json')
    output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
