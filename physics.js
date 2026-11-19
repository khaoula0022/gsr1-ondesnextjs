// GSR1 — Physique exacte (même calcul que app.py Python et GSR1_Simulation.m MATLAB)
// Convention exp(+jwt), incidence normale, propagation +z.
// k2 = w*sqrt(mu*(eps - j*sigma/w)) = beta - j*alpha ; eta2 = w*mu/k2
// Gamma = (eta2-eta0)/(eta2+eta0) ; tau = 1+Gamma ; delta = 1/alpha

export const C0 = 299792458;
export const MU0 = 4 * Math.PI * 1e-7;
export const EPS0 = 8.854187817e-12;
export const ETA0 = Math.sqrt(MU0 / EPS0); // ~377 ohm

function csqrt(re, im) {
  const r = Math.hypot(re, im);
  return {
    re: Math.sqrt((r + re) / 2),
    im: (im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - re) / 2)),
  };
}

function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
}

export function compute(f, sigma, epsr) {
  const w = 2 * Math.PI * f;
  const eps = epsr * EPS0;
  const mu = MU0;
  const s = csqrt(mu * eps, (-mu * sigma) / w); // sqrt(mu*eps_c)
  const k2 = { re: w * s.re, im: w * s.im }; // k2 = beta - j*alpha
  const beta = k2.re;
  const alpha = -k2.im;
  const eta2 = cdiv({ re: w * mu, im: 0 }, k2);
  const den = { re: eta2.re + ETA0, im: eta2.im };
  const Gamma = cdiv({ re: eta2.re - ETA0, im: eta2.im }, den);
  const tau = cdiv({ re: 2 * eta2.re, im: 2 * eta2.im }, den);
  return {
    f, alpha, beta, eta2, Gamma, tau,
    delta: 1 / alpha,
    delta_gc: Math.sqrt(2 / (w * mu * sigma)),
    att_db: 8.686 * alpha,
    lambda2: (2 * Math.PI) / beta,
  };
}

export function fmtF(f) {
  if (f < 1000) return f.toFixed(1) + " Hz";
  if (f < 1e6) return (f / 1000).toFixed(2) + " kHz";
  return (f / 1e6).toFixed(2) + " MHz";
}

export function fmtM(x) {
  if (x >= 1000) return (x / 1000).toFixed(2) + " km";
  if (x >= 1) return x.toFixed(2) + " m";
  if (x >= 0.01) return (x * 100).toFixed(1) + " cm";
  return (x * 1000).toFixed(2) + " mm";
}
