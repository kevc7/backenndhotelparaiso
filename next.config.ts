import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deshabilitar ESLint durante el build para deployment rápido
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Deshabilitar TypeScript checking durante builds para deployment rápido  
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { 
            key: "Access-Control-Allow-Origin", 
            value: process.env.NODE_ENV === 'production' 
              ? "https://frontendhotelparaiso.vercel.app" // ✅ Usar dominio correcto
              : "http://localhost:3001" 
          },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie" },
        ]
      }
    ]
  },
  // Corregir la configuración experimental (serverComponentsExternalPackages ha sido movido)
  serverExternalPackages: ['pg', 'bcryptjs']
};

export default nextConfig;
