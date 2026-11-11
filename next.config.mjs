/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/clientes/parse-csf": ["./node_modules/pdf-parse/**/*"],
      "/*": ["./node_modules/pdf-parse/**/*"],
    },
  },
};

export default nextConfig;
