import "dotenv/config";

const required = ["MONGO_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "CORS_ORIGINS"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUrl: process.env.MONGO_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtRefreshSecret : process.env.JWT_REFRESH_SECRET as string,
  corsOrigins : (process.env.CORS_ORIGINS as string)
};