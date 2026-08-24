import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required for token signing"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Future infrastructure

  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.string().optional(),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // AI Providers (Optional in schema, but checked dynamically inside modules)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Third party API integration endpoints
  POLYGON_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  
  // Market Provider Integrations
  MARKET_PROVIDER: z.enum(["alphavantage", "finnhub", "twelvedata", "upstox", "mock"]).default("upstox"),
  ALPHAVANTAGE_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  TWELVEDATA_API_KEY: z.string().optional(),
  UPSTOX_API_KEY: z.string().optional(),
  UPSTOX_API_SECRET: z.string().optional(),
  UPSTOX_REDIRECT_URI: z.string().optional(),
  UPSTOX_ACCESS_TOKEN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
