import { envSchema } from "./env.schema";
import dotenv from "dotenv";

dotenv.config();

const parseConfig = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment configurations:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    // In production, exit immediately to prevent running the system in an unstable state.
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    // For development, throw a runtime error
    throw new Error("Invalid environment configuration. Please check your .env file.");
  }

  return result.data;
};

export const config = parseConfig();
