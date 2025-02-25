import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import towberOrders from "./routes/towber-orders";
import uploadRoutes from "./routes/upload";
import { dbMiddleware } from "./middleware/db";

// Define environment
export type Env = {
  db: any;
  BUCKET: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
};

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// Middleware
app.use("*", logger());
app.use(
  "/*",
  cors({
    origin: "*", // Allow all domains
    allowMethods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
      "PUT",
      "HEAD",
      "TRACE",
      "CONNECT",
    ], // Allow all methods
    allowHeaders: ["Content-Type"], // Specify allowed headers
  })
);
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
app.route("/upload", uploadRoutes);

export default app;
