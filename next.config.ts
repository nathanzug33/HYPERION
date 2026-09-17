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
  // pdfjs-dist charge son worker via un chemin de fichier relatif au
  // module : le bundling Turbopack/Webpack casse cette résolution
  // ("Cannot find module '.../pdf.worker.mjs'"). On exclut le paquet du
  // bundle pour qu'il soit résolu normalement par Node au runtime.
  serverExternalPackages: ["pdfjs-dist", "mammoth"],
  // En-têtes de sécurité de base, sur toutes les routes. Pas de
  // Content-Security-Policy ici : le risque de casser silencieusement une
  // page (recharts, QR code en data: URI, OAuth Google...) sans les
  // vérifier une à une en conditions réelles dépasse le bénéfice à ce
  // stade — à traiter séparément, avec des tests dédiés.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
