import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les CV (PDF/Word, souvent avec photo) dépassent facilement la limite
    // par défaut de 1 Mo pour les Server Actions.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
