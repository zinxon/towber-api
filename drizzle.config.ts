import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({ path: ".dev.vars" });

console.log("DATABASE_URL", process.env.DATABASE_URL);

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Neon: use direct (unpooled) for migrations; pooled for app traffic
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
