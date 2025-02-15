import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "dotenv";
config({ path: ".dev.vars" });
import { env } from "hono/adapter";

// console.log("DATABASE_URL", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
// import { config } from "dotenv";
// import { drizzle } from "drizzle-orm/node-postgres";
// import { Pool } from "pg";
// import * as schema from "./schema";

// config({ path: ".dev.vars" });

// console.log("DATABASE_URL", process.env.DATABASE_URL);
// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL environment variable is not set");
// }
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const db = drizzle(pool, { schema });

// export { db, pool, schema };
