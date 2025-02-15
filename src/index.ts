import { Hono } from "hono";
import { cors } from "hono/cors";
import towberOrders from "./routes/towber-orders";
import { config } from "dotenv";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
config({ path: ".dev.vars" });
// const app = new Hono().basePath("/api");
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("/*", cors());
// app.use("*", dbMiddleware());
app.use("api/*", dbMiddleware());

app.get("/health", (c) =>
  c.json({
    uptime: process.uptime(),
    message: "Ok",
    date: new Date(),
  })
);
// app.basePath("api").route("/orders", towberOrders);
// Routes
// app.route("/orders", towberOrders);

export default app;
