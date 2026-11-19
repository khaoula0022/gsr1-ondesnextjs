# GSR1 — Simulateur Next.js + Vercel (design moderne)

Version **Next.js (React/JavaScript)** du simulateur GSR1, design sombre premium :
cartes métriques, bilan de puissance, graphiques avec remplissage, animation
avion → mer → sous-marin. Même physique exacte que `app.py` / MATLAB (`lib/physics.js`).

## 📂 Fichiers à déposer sur GitHub (dépôt `gsr1-ondesnextjs`)

Télécharge tout le dossier `nextjs-simulator/` depuis Arena, puis uploade-le **en gardant l'arborescence** :

```
gsr1-ondesnextjs/                  ← racine du dépôt
├── package.json                   ← les ingrédients (next, react)
├── next.config.mjs                ← config Next.js
├── README.md                      ← ce fichier
├── app/
│   ├── layout.jsx                 ← structure de la page
│   ├── page.jsx                   ← ⭐ l'application complète
│   └── globals.css                ← ⭐ le design (thème sombre)
└── lib/
    └── physics.js                 ← ⭐ la physique (δ, Γ, τ exacts)
```

⚠️ **Ne dépose PAS** `app.py` ici : c'est le fichier Python pour Streamlit Cloud, pas pour Vercel.

## ▶️ Tester en local
```bash
cd nextjs-simulator
npm install
npm run dev        # puis ouvre http://localhost:3000
```

## 🚀 Déployer sur Vercel
1. Pousse ce dossier sur GitHub (dépôt `gsr1-ondesnextjs`)
2. **[vercel.com/new](https://vercel.com/new)** → connecte-toi avec GitHub → **Import** → `gsr1-ondesnextjs`
3. Vercel détecte Next.js automatiquement → **Deploy** 🚀
4. Lien obtenu : `https://gsr1-ondesnextjs.vercel.app`

## ✔️ Vérification
À f = 10 kHz, σ = 4 S/m, z = 15 m : **δ = 2,52 m · |Γ| = 0,9995 · |τ| = 7,46×10⁻⁴ · bilan ≈ −114 dB**
