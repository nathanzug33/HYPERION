import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nécessaire pour tester la connexion Google OAuth (redirect_uri en
  // 127.0.0.1, voir GOOGLE_REDIRECT_URI dans .env) : sans ça, Next.js
  // considère 127.0.0.1 comme une origine tierce et bloque le rechargement
  // à chaud (HMR) en dev.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Les CV (PDF/Word, souvent avec photo) dépassent facilement la limite
    // par défaut de 1 Mo pour les Server Actions.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // pdfjs-dist (utilisé par pdf-parse) charge son worker via un chemin de
  // fichier relatif au module : le bundling Turbopack/Webpack casse cette
  // résolution ("Cannot find module '.../pdf.worker.mjs'"). On exclut le
  // paquet du bundle pour qu'il soit résolu normalement par Node au runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
};

export default nextConfig;
