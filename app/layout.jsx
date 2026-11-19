import "./globals.css";

export const metadata = {
  title: "GSR1 — Ondes EM avion ↔ sous-marin (épaisseur de peau)",
  description:
    "Simulation interactive : interface air / eau de mer, coefficients Gamma/tau et épaisseur de peau delta(f, sigma).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
