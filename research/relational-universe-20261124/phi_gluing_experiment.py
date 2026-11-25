"""Exact finite-grid XOR constraint experiments, no dependencies."""
from collections import Counter, defaultdict, deque
from itertools import combinations
import json
from pathlib import Path


def grid(n):
    edges = [(r*n+c,r*n+c+1) for r in range(n) for c in range(n-1)]
    edges += [(r*n+c,(r+1)*n+c) for r in range(n-1) for c in range(n)]
    ids = {e:i for i,e in enumerate(edges)}
    faces = []
    for r in range(n-1):
        for c in range(n-1):
            a=r*n+c; b=a+1; d=a+n; e=d+1
            faces.append(sum(1<<ids[p] for p in [(a,b),(a,d),(b,e),(d,e)]))
    signatures = [sum(1<<j for j,f in enumerate(faces) if f>>i&1) for i in range(len(edges))]
    return edges,faces,signatures


def syndrome(mask,faces):
    return sum(((mask&f).bit_count()%2)<<j for j,f in enumerate(faces))


def assignment_mask(x, edges):
    return sum((((x>>u)^(x>>v))&1)<<i for i,(u,v) in enumerate(edges))


def run():
    edges,faces,sig=grid(3)
    valid=Counter(assignment_mask(x,edges) for x in range(1<<9))
    hist=Counter(); solution_counts=Counter(); ambiguous=0
    for m in range(1<<len(edges)):
        s=syndrome(m,faces)
        assert (s==0)==(m in valid)
        solution_counts[valid[m]]+=1
        distances=[(m^v).bit_count() for v in valid]
        d=min(distances); hist[d]+=1
        if d and distances.count(d)>1: ambiguous+=1
    e,f,s=grid(9)
    groups=defaultdict(list)
    for i,v in enumerate(s): groups[v].append(i)
    assert all(s)
    pairs=list(combinations(range(len(e)),2))
    undetected=[(i,j) for i,j in pairs if s[i]==s[j]]
    # All possible single errors relative to a known consistent constraint set.
    ambiguous_groups=[g for g in groups.values() if len(g)>1]
    unique=sum(len(g) for g in groups.values() if len(g)==1)
    # Construct two dynamics on the same 16-state space: direct product and carry.
    def cycles(fn):
        unseen=set(range(16)); lengths=[]
        while unseen:
            start=min(unseen); v=start; n=0
            while v in unseen:
                unseen.remove(v); n+=1; v=fn(v)
            assert v==start
            lengths.append(n)
        return sorted(lengths)
    product=lambda s: ((s%8+1)%8)+8*(1-s//8)
    carry=lambda s: (s+1)%16
    return {'grid3':{'vertices':9,'edges':len(edges),'faces':len(faces),'constraint_patterns':1<<len(edges),'consistent_patterns':len(valid),'solution_count_histogram':dict(solution_counts),'minimum_edge_flips_histogram':dict(sorted(hist.items())),'inconsistent_patterns_with_multiple_minimum_repairs':ambiguous},'grid9':{'vertices':81,'edges':len(e),'faces':len(f),'single_errors_detected':len(s),'single_errors_uniquely_localized':unique,'ambiguous_single_error_groups':[[e[i] for i in g] for g in ambiguous_groups],'double_errors_tested':len(pairs),'double_errors_detected':len(pairs)-len(undetected),'undetected_double_errors':[[e[i],e[j]] for i,j in undetected]},'composite_dynamics':{'independent_simultaneous_increment_cycles':cycles(product),'carry_increment_cycles':cycles(carry)}}

if __name__=='__main__':
    results=run()
    out=Path(__file__).with_name('phi_gluing_results.json')
    out.write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))
