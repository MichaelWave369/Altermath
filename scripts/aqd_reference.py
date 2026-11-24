"""Independent dense matrix oracle for E2 JSON evidence; requires NumPy."""
import argparse
import json
import numpy as np

I = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], complex)
Y = np.array([[0, -1j], [1j, 0]], complex)
Z = np.diag([1, -1]).astype(complex)
PAULI = {'X': X, 'Z': Z}


def tensor(n, ops):
    result = np.ones((1, 1), complex)
    for q in reversed(range(n)):
        result = np.kron(result, ops.get(q, I))
    return result


def exp_pauli(p, angle):
    return np.cos(angle / 2) * np.eye(len(p)) - 1j * np.sin(angle / 2) * p


def layer(n, axis, j, d, no_aklt=False):
    result = np.eye(2**n, dtype=complex)
    p = PAULI[axis]
    for q in range(0, n - 1, 2):
        result = exp_pauli(tensor(n, {q: p, q+1: p}), j) @ result
    if not no_aklt:
        for q in range(1, n-1, 2):
            result = exp_pauli(tensor(n, {q: p, q+1: p}), d['K'][(q-1)//2]) @ result
    for q, v in enumerate(d['B']):
        theta = np.linalg.norm(v)
        if theta:
            p = tensor(n, {q: (v[0]*X+v[1]*Y+v[2]*Z)/theta})
            result = exp_pauli(p, theta) @ result
    return result


def audit(run):
    n = run['n']
    if not 4 <= n <= 6:
        raise ValueError('Dense audit supports 4–6 qubits only')
    dim = 2**n
    H = (X+Z)/np.sqrt(2)
    bases = {'Z': np.eye(dim), 'X': tensor(n, dict.fromkeys(range(n), H))}
    bits = np.asarray(run['bits'], dtype=int)
    errors, exact_rows = [], []
    for row in run['rows']:
        layers = {a: layer(n, a, run['J']*np.pi, run['disorder'][a], row['name']=='noAKLT') for a in 'XZ'}
        u = np.eye(dim, dtype=complex)
        exact = {'name': row['name'], 'byAxis': {'X': [], 'Z': []}}
        for t, axis in enumerate(row['sequence'], 1):
            u = layers[axis] @ u
            if t not in run['times']:
                continue
            k = run['times'].index(t)
            for a, p in PAULI.items():
                psi = u @ bases[a]
                sites, sampled = [], []
                for q in range(n):
                    sign = 1-2*((np.arange(dim)>>q)&1)
                    obs = tensor(n, {q:p})
                    values = sign * np.sum(psi.conj()*(obs@psi), axis=0).real
                    sites.append(float(values.mean()))
                    sampled.append(float(values[bits].mean()))
                errors.extend(abs(np.asarray(sampled)-row['byAxis'][a][k]['sites']))
                exact['byAxis'][a].append({'t': t, 'sites': sites})
        exact_rows.append(exact)
    return {'seed': run['seed'], 'n': n, 'max_site_error': float(max(errors)), 'site_comparisons': len(errors), 'exact_rows': exact_rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('evidence')
    args = parser.parse_args()
    with open(args.evidence, encoding='utf-8') as f:
        data = json.load(f)
    results = [audit(r) for r in data.get('runs', [data])]
    print(json.dumps({'schema': 'aqd-e21-python-audit-v1', 'runs': results}, indent=2))
    if any(r['max_site_error'] > 1e-10 for r in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
