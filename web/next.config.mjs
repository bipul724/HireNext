/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  reactCompiler: true,
};

export default nextConfig;
