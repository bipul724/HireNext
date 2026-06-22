import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: process.env.PORT || 8080,
  // Comma-separated allowed frontend origins for CORS + WS origin check.
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  REDIS_URL: required("REDIS_URL"),
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  PISTON_API_URL: required("PISTON_API_URL"),
  // Unique id for this server instance — used to ignore our own pub/sub echoes.
  INSTANCE_ID:
    process.env.INSTANCE_ID ||
    `${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
};
