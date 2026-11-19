"use client";
// GSR1 — Simulateur Next.js (React) : design moderne sombre, cartes métriques,
// bilan énergétique, graphiques canvas et animation scène avion/mer/sous-marin.
// La physique est dans lib/physics.js (identique à app.py / MATLAB).

import { useEffect, useRef, useState } from "react";
import { compute, fmtF, fmtM } from "../lib/physics";

export default function Home() {
  const [logf, setLogf] = useState(4); // log10(f), défaut 10 kHz
  const [sigma, setSigma] = useState(4);
  const [epsr, setEpsr] = useState(80);
  const [z, setZ] = useState(15);
  const [playing, setPlaying] = useState(true);

  const f = Math.pow(10, logf);
  const R = compute(f, sigma, epsr);
  const gAbs = Math.hypot(R.Gamma.re, R.Gamma.im);
  const tAbs = Math.hypot(R.tau.re, R.tau.im);
  const recv = Math.exp(-R.alpha * z);
  const eRel = tAbs * recv;
  const dbTot = 20 * Math.log10(eRel);
  const Rpow = gAbs * gAbs * 100; // % puissance réfléchie
  const Tpow = 100 - Rpow; // % puissance transmise

  const cGamma = useRef(null);
  const cDelta = useRef(null);
  const cAtten = useRef(null);
  const cScene = useRef(null);
  const phaseRef = useRef(0);

  // ---------- graphiques statiques ----------
  useEffect(() => {
    const pad = { l: 48, r: 10, t: 26, b: 30 };
    const INK = "#cfe8ff", GRID = "rgba(140,200,255,0.14)";
    function axes(ctx, W, H) {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = GRID; ctx.lineWidth = 1;
      ctx.strokeRect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b);
      ctx.fillStyle = INK; ctx.font = "11px system-ui";
    }
    function curve(ctx, W, H, xs, ys, color, xlog, ylog, x0, x1, y0, y1, fill) {
      const X = (v) => pad.l + ((xlog ? Math.log10(v) : v) - x0) / (x1 - x0) * (W - pad.l - pad.r);
      const Y = (v) => pad.t + (y1 - (ylog ? Math.log10(Math.max(v, 1e-4)) : v)) / (y1 - y0) * (H - pad.t - pad.b);
      if (fill) {
        ctx.beginPath();
        xs.forEach((x, j) => { const px = X(x), py = Y(ys[j]); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.lineTo(X(xs[xs.length - 1]), Y(y0)); ctx.lineTo(X(xs[0]), Y(y0)); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
      xs.forEach((x, j) => { const px = X(x), py = Y(ys[j]); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
    }
    const fs = []; for (let i = 0; i <= 300; i++) fs.push(Math.pow(10, (7 * i) / 300));

    let ctx = cGamma.current?.getContext("2d");
    if (ctx) {
      const W = 560, H = 270; axes(ctx, W, H);
      const G = fs.map((v) => Math.hypot(compute(v, sigma, epsr).Gamma.re, compute(v, sigma, epsr).Gamma.im));
      const T = fs.map((v) => Math.hypot(compute(v, sigma, epsr).tau.re, compute(v, sigma, epsr).tau.im));
      curve(ctx, W, H, fs, G, "#f87171", true, false, 0, 7, 0, 1.05, "rgba(248,113,113,0.12)");
      curve(ctx, W, H, fs, T, "#34d399", true, false, 0, 7, 0, 1.05, "rgba(52,211,153,0.12)");
      ctx.fillStyle = INK; ctx.fillText("f (Hz) — rouge: |Γ|  vert: |τ|", pad.l + 6, 14);
    }
    ctx = cDelta.current?.getContext("2d");
    if (ctx) {
      const W = 560, H = 270; axes(ctx, W, H);
      const dEx = fs.map((v) => compute(v, sigma, epsr).delta);
      const dGc = fs.map((v) => compute(v, sigma, epsr).delta_gc);
      curve(ctx, W, H, fs, dEx, "#22d3ee", true, true, 0, 7, -3, 3, "rgba(34,211,238,0.12)");
      curve(ctx, W, H, fs, dGc, "#fbbf24", true, true, 0, 7, -3, 3);
      ctx.fillStyle = INK; ctx.fillText("δ(f) (m) — cyan: exact  jaune: bon conducteur", pad.l + 6, 14);
    }
    ctx = cAtten.current?.getContext("2d");
    if (ctx) {
      const W = 560, H = 270; axes(ctx, W, H);
      const zz = []; for (let i = 0; i <= 400; i++) zz.push((50 * i) / 400);
      curve(ctx, W, H, zz, zz.map((v) => Math.exp(-R.alpha * v)), "#22d3ee", false, false, 0, 50, 0, 1, "rgba(34,211,238,0.12)");
      ctx.fillStyle = "#f87171"; ctx.beginPath();
      ctx.arc(pad.l + (z / 50) * (W - pad.l - pad.r), pad.t + (1 - Math.exp(-R.alpha * z)) * (H - pad.t - pad.b), 5, 0, 7);
      ctx.fill();
      ctx.fillStyle = INK; ctx.fillText("Profondeur z (m) — |E(z)|/|E(0+)|", pad.l + 6, 14);
    }
  }, [logf, sigma, epsr, z, R.alpha]);

  // ---------- animation scène ----------
  useEffect(() => {
    let raf;
    const draw = () => {
      const cv = cScene.current;
      if (cv) {
        const ctx = cv.getContext("2d");
        const W = 560, H = 270;
        const t = phaseRef.current;
        const ySurf = H * 0.48;
        const ySub = ySurf + Math.min(z, 50) / 50 * (H * 0.42);
        const yDelta = ySurf + Math.min(R.delta, 50) / 50 * (H * 0.42);
        const sky = ctx.createLinearGradient(0, 0, 0, ySurf);
        sky.addColorStop(0, "#7dd3fc"); sky.addColorStop(1, "#e0f2fe");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ySurf);
        const sea = ctx.createLinearGradient(0, ySurf, 0, H);
        sea.addColorStop(0, "#0369a1"); sea.addColorStop(1, "#082f49");
        ctx.fillStyle = sea; ctx.fillRect(0, ySurf, W, H - ySurf);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, ySurf - 1, W, 2);
        ctx.fillStyle = "#0c4a6e"; ctx.font = "bold 12px system-ui";
        ctx.fillText("AIR", 10, 18);
        ctx.fillStyle = "#fff"; ctx.fillText("EAU DE MER", 10, ySurf + 16);
        for (let k = 0; k < 3; k++) {
          const r = ((t * 30 + k * 40) % 120) + 8;
          ctx.strokeStyle = `rgba(34,211,238,${Math.max(0, 1 - r / 130) * 0.7})`;
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.ellipse(W / 2, 26, r * 1.7, r, 0, 0, Math.PI * 2); ctx.stroke();
        }
        const bob = Math.sin(t * 2) * 2;
        ctx.fillStyle = "#f1f5f9"; ctx.strokeStyle = "#0b3d66"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(W / 2, 26 + bob, 34, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W / 2 - 4, 22 + bob); ctx.lineTo(W / 2 + 8, 8 + bob);
        ctx.lineTo(W / 2 + 18, 8 + bob); ctx.lineTo(W / 2 + 8, 22 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.moveTo(W / 2 + 32, 22 + bob); ctx.lineTo(W / 2 + 40, 16 + bob);
        ctx.lineTo(W / 2 + 40, 30 + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#0b3d66"; ctx.font = "bold 11px system-ui";
        ctx.fillText("✈ AVION", W / 2 - 24, 8);
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath();
        for (let y = 4; y < ySurf; y += 2) {
          const x = 70 + 10 * Math.cos(t * 3 - 0.08 * (26 - y));
          y === 4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = "#4ade80"; ctx.beginPath();
        for (let y = ySurf; y < H - 4; y += 2) {
          const amp = 0.45 * Math.exp(-(y - ySurf) / 45);
          const x = 70 + 10 * amp * Math.cos(t * 3 - 0.08 * (26 - y));
          y === ySurf ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W - 60, ySurf); ctx.lineTo(W - 60, yDelta); ctx.stroke();
        ctx.fillStyle = "#fbbf24"; ctx.font = "bold 10px system-ui";
        ctx.fillText("δ=" + fmtM(R.delta), W - 58, (ySurf + yDelta) / 2);
        ctx.fillStyle = `rgba(74,222,128,${0.08 + 0.4 * recv})`;
        ctx.beginPath(); ctx.arc(W * 0.68, ySub, 18 + 22 * recv, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#334155"; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(W * 0.68, ySub, 34, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillRect(W * 0.68 - 8, ySub - 18, 16, 10);
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui";
        ctx.fillText(`SOUS-MARIN z=${z.toFixed(0)} m`, W * 0.68 - 42, ySub + 28);
      }
      if (playing) phaseRef.current += 0.03;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, z, R.delta, recv]);

  return (
    <div className="wrap">
      <header className="hero">
        <div className="kicker">GSR1 · ÉLECTROMAGNÉTISME</div>
        <h1>Ondes EM entre un avion et un sous-marin</h1>
        <p>Simulation interactive de la propagation à travers l&apos;interface air / eau de mer :
          coefficients de réflexion/transmission et épaisseur de peau δ(f, σ), incidence normale.</p>
        <div className="badges">
          <span className="badge">✈️ Avion</span>
          <span className="badge">🌊 Eau de mer σ = 4 S/m</span>
          <span className="badge">🧴 δ = 1/√(πfμσ)</span>
          <span className="badge">🎬 Animation en direct</span>
        </div>
      </header>

      <section className="metrics">
        <div className="metric cyan"><div className="lab">Épaisseur de peau δ</div><div className="val">{fmtM(R.delta)}</div><div className="sub">α = {R.alpha.toFixed(4)} Np/m</div></div>
        <div className="metric"><div className="lab">Atténuation</div><div className="val">{R.att_db.toFixed(2)} dB/m</div><div className="sub">β = {R.beta.toFixed(4)} rad/m</div></div>
        <div className="metric red"><div className="lab">Réflexion |Γ|</div><div className="val">{gAbs.toFixed(4)}</div><div className="sub">R = {Rpow.toFixed(2)} % puissance</div></div>
        <div className="metric green"><div className="lab">Transmission |τ|</div><div className="val">{tAbs.toExponential(2)}</div><div className="sub">{(20 * Math.log10(tAbs)).toFixed(1)} dB à l&apos;interface</div></div>
        <div className="metric amber"><div className="lab">Champ reçu à {z.toFixed(0)} m</div><div className="val">{eRel.toExponential(2)}</div><div className="sub">{dbTot.toFixed(1)} dB au total</div></div>
      </section>

      <section className="budget">
        <div className="row"><span><b>Bilan de puissance à l&apos;interface</b> — réfléchi vs transmis</span><span>R + T = 100 %</span></div>
        <div className="bar">
          <div className="refl" style={{ width: Rpow + "%" }} />
          <div className="trans" style={{ width: Tpow + "%" }} />
        </div>
        <div className="row" style={{ marginTop: 6, marginBottom: 0 }}>
          <span>Réfléchi <b>{Rpow.toFixed(2)} %</b></span>
          <span>Transmis <b>{Tpow.toFixed(3)} %</b></span>
        </div>
      </section>

      <main>
        <section className="panel" id="controls">
          <h3><span className="dot">●</span> Paramètres — réglage libre</h3>
          <div className="presets">
            <button onClick={() => setLogf(Math.log10(30))}>ELF · 30 Hz</button>
            <button onClick={() => setLogf(4)}>VLF · 10 kHz</button>
            <button onClick={() => setLogf(5)}>LF · 100 kHz</button>
            <button onClick={() => setLogf(6)}>MF · 1 MHz</button>
            <button onClick={() => setZ(10)}>z = 10 m</button>
            <button onClick={() => setZ(30)}>z = 30 m</button>
          </div>
          <label>Fréquence f (log₁₀, Hz) : <span className="val">{fmtF(f)}</span></label>
          <input type="range" min="0" max="8" step="0.05" value={logf}
            onChange={(e) => setLogf(+e.target.value)} />
          <input type="number" min="1" max="100000000" value={Math.round(f)}
            onChange={(e) => setLogf(Math.log10(Math.max(1, +e.target.value || 1)))} />
          <label>Conductivité σ (S/m) : <span className="val">{sigma.toFixed(1)}</span></label>
          <input type="range" min="0.5" max="10" step="0.1" value={sigma}
            onChange={(e) => setSigma(+e.target.value)} />
          <label>Permittivité εᵣ : <span className="val">{epsr.toFixed(0)}</span></label>
          <input type="range" min="70" max="85" step="1" value={epsr}
            onChange={(e) => setEpsr(+e.target.value)} />
          <label>Profondeur z (m) : <span className="val">{z.toFixed(1)}</span></label>
          <input type="range" min="0" max="50" step="0.5" value={z}
            onChange={(e) => setZ(+e.target.value)} />
          <button className="wide" onClick={() => setPlaying(!playing)}>
            {playing ? "⏸ Pause animation" : "▶ Animer"}
          </button>
          <div className="readouts">
            η₂ = <b>{R.eta2.re.toFixed(3)} + j{R.eta2.im.toFixed(3)} Ω</b><br />
            λ₂ (mer) = <b>{fmtM(R.lambda2)}</b> · δ bon conducteur = <b>{fmtM(R.delta_gc)}</b><br />
            Champ reçu = <b>{eRel.toExponential(2)}</b> ({dbTot.toFixed(1)} dB)
          </div>
        </section>
        <section id="plots">
          <div className="panel"><h3><span className="dot">●</span> Coefficients Γ et τ</h3><canvas ref={cGamma} width="560" height="270" /></div>
          <div className="panel"><h3><span className="dot">●</span> Épaisseur de peau δ(f)</h3><canvas ref={cDelta} width="560" height="270" /></div>
          <div className="panel"><h3><span className="dot">●</span> Atténuation vs profondeur</h3><canvas ref={cAtten} width="560" height="270" /></div>
          <div className="panel"><h3><span className="dot">●</span> Animation : avion → mer → sous-marin</h3><canvas ref={cScene} width="560" height="270" /></div>
        </section>
      </main>
      <footer>GSR1 — Modèle simplifié deux milieux, incidence normale. Calcul exact (k₂, η₂ complexes) ; δ = 1/α.</footer>
    </div>
  );
}
