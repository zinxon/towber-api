import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { config } from "dotenv";
config({ path: ".dev.vars" });

export const dbMiddleware = (): MiddlewareHandler =>
  createMiddleware(async (ctx: Context, next: any) => {
    if (!ctx.get("db")) {
      const connectionString = ctx.env.DATABASE_URL!;
      const client = postgres(connectionString);
      const db = drizzle(client, { schema });

      ctx.set("db", db);
    }
    await next();
  });
