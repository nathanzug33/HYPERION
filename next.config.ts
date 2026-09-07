import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
