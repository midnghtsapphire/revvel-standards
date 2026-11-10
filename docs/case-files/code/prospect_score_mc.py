"""Four-gate prospect score: independent MC, Metropolis-Hastings, HMC."""

import numpy as np

RNG = np.random.default_rng(11)
ASSAYS = np.array([0.18, 0.41, 0.09, 0.55, 0.22])
SIGMA = 0.7
LOG_A = np.log(ASSAYS)


def score_row(legal, geo, assay, risk):
    """legal in {0, 50, 100}. assay 0 forces LEAD cap."""
    if legal == 0:
        return 0.0, "BLOCKED"
    if legal == 50:
        return np.nan, "WITHHOLD"
    raw = 0.45 * geo + 0.45 * assay + 0.10 * risk
    if assay == 0:
        return min(40.0, raw), "LEAD"
    label = "TARGET" if assay == 100 else "ASSAYED"
    return raw, label


def independent_mc(n=20000):
    legal = RNG.choice([0, 50, 100], size=n, p=[0.55, 0.25, 0.20])
    geo = RNG.triangular(20, 45, 70, n)
    assay = np.zeros(n)
    risk = RNG.triangular(30, 55, 80, n)
    labels = np.empty(n, dtype=object)
    scores = np.empty(n)
    for i in range(n):
        scores[i], labels[i] = score_row(legal[i], geo[i], assay[i], risk[i])
    lead = labels == "LEAD"
    pub = scores[lead]
    print("INDEPENDENT MC  unchecked lead")
    print(f"  P(BLOCKED)  {np.mean(labels == 'BLOCKED'):.3f}")
    print(f"  P(WITHHOLD) {np.mean(labels == 'WITHHOLD'):.3f}")
    print(f"  P(LEAD)     {np.mean(lead):.3f}")
    print(f"  P(TARGET)   {np.mean(labels == 'TARGET'):.3f}")
    print(f"  LEAD p10/p50/p90 {np.percentile(pub, [10, 50, 90])}")


def log_post(mu):
    lp = -0.5 * ((mu + 1.0) / 1.0) ** 2
    lp += -0.5 * np.sum((LOG_A - mu) ** 2) / SIGMA ** 2
    return lp


def metropolis(steps=20000, burn=5000, prop=0.35):
    mu = -1.0
    lp = log_post(mu)
    chain = np.empty(steps)
    acc = 0
    for i in range(steps):
        cand = mu + RNG.normal(0, prop)
        lc = log_post(cand)
        if np.log(RNG.random()) < lc - lp:
            mu, lp = cand, lc
            acc += 1
        chain[i] = mu
    post = chain[burn:]
    thin = post[::5]
    x = thin - thin.mean()
    ac1 = np.dot(x[:-1], x[1:]) / np.dot(x, x)
    neff = len(thin) * (1 - ac1) / (1 + ac1)
    au = np.exp(thin)
    print("METROPOLIS-HASTINGS  grade posterior")
    print(f"  accept {acc / steps:.3f}  lag1 {ac1:.3f}  n_eff {neff:.0f} of {len(thin)}")
    print(f"  mu p10/p50/p90 {np.percentile(thin, [10, 50, 90])}")
    print(f"  Au p10/p50/p90 {np.percentile(au, [10, 50, 90])}")
    return au


def U(mu):
    return 0.5 * ((mu + 1.0) / 1.0) ** 2 + 0.5 * np.sum((LOG_A - mu) ** 2) / SIGMA ** 2


def dU(mu):
    return (mu + 1.0) + np.sum(mu - LOG_A) / SIGMA ** 2


def leapfrog(mu, p, eps, ell):
    p = p - 0.5 * eps * dU(mu)
    for _ in range(ell - 1):
        mu = mu + eps * p
        p = p - eps * dU(mu)
    mu = mu + eps * p
    p = p - 0.5 * eps * dU(mu)
    return mu, -p


def hmc(steps=4000, burn=1000, eps=0.15, ell=8):
    mu = -1.0
    chain = np.empty(steps)
    acc = 0
    for i in range(steps):
        p = RNG.normal()
        mu2, p2 = leapfrog(mu, p, eps, ell)
        if np.log(RNG.random()) < -(U(mu2) + 0.5 * p2 * p2 - U(mu) - 0.5 * p * p):
            mu = mu2
            acc += 1
        chain[i] = mu
    post = chain[burn:]
    x = post - post.mean()
    ac1 = np.dot(x[:-1], x[1:]) / np.dot(x, x)
    au = np.exp(post)
    print("HAMILTONIAN MC  grade posterior")
    print(f"  accept {acc / steps:.3f}  lag1 {ac1:.3f}")
    print(f"  mu p10/p50/p90 {np.percentile(post, [10, 50, 90])}")
    print(f"  Au p10/p50/p90 {np.percentile(au, [10, 50, 90])}")
    return au


def gate_from_grade(au, geo=70.0, risk=60.0):
    assay = np.where(au < 0.2, 40, np.where(au < 1.0, 70, 100)).astype(float)
    s = 0.45 * geo + 0.45 * assay + 0.10 * risk
    print("CLEARED PARCEL  legal=100")
    print(f"  score p10/p50/p90 {np.percentile(s, [10, 50, 90])}")
    print(f"  P(assay gate 100) {np.mean(assay == 100):.3f}")
    print(f"  P(S>=70) {np.mean(s >= 70):.3f}")


if __name__ == "__main__":
    independent_mc()
    print()
    au_mh = metropolis()
    gate_from_grade(au_mh)
    print()
    au_hmc = hmc()
    gate_from_grade(au_hmc)
