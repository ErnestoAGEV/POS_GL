export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/posgl",
  jwtSecret: process.env.JWT_SECRET || "posgl-dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  nodeEnv: process.env.NODE_ENV || "development",
};

// Prevent production startup with default JWT secret
if (config.nodeEnv === "production" && config.jwtSecret === "posgl-dev-secret-change-in-production") {
  console.error("FATAL: JWT_SECRET must be set in production. Exiting.");
  process.exit(1);
}
