import dotenv from "dotenv";

dotenv.config();

const requireEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
};
