"""Finite switching-law experiment. Python 3 standard library only."""
import random, json, math
from pathlib import Path
from statistics import mean
from itertools import permutations
SEED=369
TRIALS=369
N=8
SEG=90
NOISE=.08
HAZARD=.04
RULES=[tuple((x+1)%N for x in range(N)),tuple((x+3)%N for x in range(N)),tuple(x^4 for x in range(N)),tuple((x+5)%N for x in range(N))]
SCHEDULE=[0,1,0,2,3,0]
# Last filter state is a broad unknown model, not the actual unseen rule.
def likelihood(k,x,y):
    return 1/N if k==3 else (1-NOISE if RULES[k][x]==y else NOISE/(N-1))
def run():
    rng=random.Random(SEED)
    stats={m:{'correct':0,'clean_correct':0,'n':0,'known_n':0,'known_clean':0,'known_correct':0,'unknown_n':0,'unknown_flag':0,'false_unknown':0,'stable_n':0,'stable_wrong':0,'delays':{},'switches':0} for m in ['fixed','reactive','filter']}
    for trial in range(TRIALS):
        # Known initial law for each strategy; later schedule is hidden.
        p=[1.,0.,0.,0.]; reactive=0; prev={'fixed':0,'reactive':0,'filter':0}
        delays={m:{} for m in stats}
        for t in range(SEG*len(SCHEDULE)):
            seg=t//SEG; age=t%SEG; k=SCHEDULE[seg]
            x=rng.randrange(N); clean=RULES[k][x]; y=clean if rng.random()>=NOISE else rng.choice([v for v in range(N) if v!=clean])
            # Forecast current observation BEFORE seeing it.
            prior=[(1-HAZARD)*v+HAZARD*(1-v)/3 for v in p]
            choices={'fixed':0,'reactive':reactive,'filter':max(range(4),key=prior.__getitem__)}
            for m,s in stats.items():
                pred=choices[m]; s['n']+=1
                if k==3:
                    s['unknown_n']+=1; s['unknown_flag']+=pred==3
                else:
                    s['known_n']+=1; s['false_unknown']+=pred==3
                    s['known_correct']+=pred<3 and RULES[pred][x]==y
                    s['known_clean']+=pred<3 and RULES[pred][x]==clean
                s['correct']+=pred==k
                if age>=20:
                    s['stable_n']+=1; s['stable_wrong']+=pred!=k
                if seg>0 and pred==k and seg not in delays[m]: delays[m][seg]=age
                s['switches']+=pred!=prev[m]; prev[m]=pred
            matching=[j for j in range(3) if RULES[j][x]==y]
            reactive=matching[0] if matching else 3
            weights=[prior[j]*likelihood(j,x,y) for j in range(4)]; total=sum(weights); p=[v/total for v in weights]
        for m,s in stats.items():
            for seg in range(1,len(SCHEDULE)):
                s['delays'].setdefault(str(seg),[]).append(delays[m].get(seg,SEG))
    # Separate control: fixed law A for all observations, same noise level.
    control={m:0 for m in stats}; control_n=TRIALS*SEG*len(SCHEDULE)
    for _ in range(TRIALS):
        p=[1.,0.,0.,0.]; reactive=0
        for t in range(SEG*len(SCHEDULE)):
            x=rng.randrange(N); clean=RULES[0][x]; y=clean if rng.random()>=NOISE else rng.choice([v for v in range(N) if v!=clean])
            prior=[(1-HAZARD)*v+HAZARD*(1-v)/3 for v in p]
            for m,pred in [('fixed',0),('reactive',reactive),('filter',max(range(4),key=prior.__getitem__))]: control[m]+=pred!=0
            matching=[j for j in range(3) if RULES[j][x]==y]; reactive=matching[0] if matching else 3
            weights=[prior[j]*likelihood(j,x,y) for j in range(4)]; total=sum(weights); p=[v/total for v in weights]
    out={}
    for m,s in stats.items():
        out[m]={'regime_accuracy':s['correct']/s['n'],'known_clean_forecast_accuracy':s['known_clean']/s['known_n'],'known_observed_forecast_accuracy':s['known_correct']/s['known_n'],'unknown_recall':s['unknown_flag']/s['unknown_n'],'known_false_unknown':s['false_unknown']/s['known_n'],'stable_wrong_rate':s['stable_wrong']/s['stable_n'],'control_wrong_rate':control[m]/control_n,'mean_first_correct_delay_capped':{k:mean(v) for k,v in s['delays'].items()},'never_correct':{k:sum(x==SEG for x in v) for k,v in s['delays'].items()}}
    # Boundary translation: h f = g h, for every state, enumerate bijections.
    f=RULES[0]; g=tuple((x-1)%N for x in range(N)); c=RULES[2]
    counts=[0,0]
    for h in permutations(range(N)):
        for j,target in enumerate([g,c]):
            counts[j]+=all(h[f[x]]==target[h[x]] for x in range(N))
    return {'seed':SEED,'trials':TRIALS,'observations_per_trial':SEG*len(SCHEDULE),'switching_observations':TRIALS*SEG*len(SCHEDULE),'control_observations':control_n,'noise':NOISE,'hazard':HAZARD,'schedule':SCHEDULE,'metrics':out,'boundary_bijections_tested':math.factorial(N),'boundary_conjugacies':{'increment_to_decrement':counts[0],'increment_to_xor4':counts[1]}}
if __name__=='__main__':
    result=run(); path=Path(__file__).with_name('phi_regime_results.json'); path.write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
