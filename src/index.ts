import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import towberOrders from "./routes/towber-orders";
import { dbMiddleware } from "./middleware/db";

const app = new Hono().basePath("/api");

// Middleware
app.use("*", logger());
app.use("/*", cors());
app.use("*", dbMiddleware());

app.get("/health", (c) =>
  c.json({
    uptime: process.uptime(),
    message: "Ok",
    date: new Date(),
  })
);

// Routes
app.route("/orders", towberOrders);

export default app;
