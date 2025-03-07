import { Env, Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createTowberOrder,
  getAllTowberOrders,
  getTowberOrderById,
  updateTowberOrder,
  deleteTowberOrder,
  sendTelegramMessage,
} from "../db/queries/towber-orders";
import { serviceEnum } from "../db/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

export type Bindings = {
  DATABASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
};

export type Variables = {
  db: PostgresJsDatabase<typeof schema>;
};

const towberOrders = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Validation schema
const towberOrderSchema = z.object({
  customerName: z.string().min(1),
  phoneNumber: z.string().min(1),
  licensePlate: z.string().min(1),
  selectedService: z.enum(serviceEnum.enumValues),
  location: z.string().min(1),
  destination: z.string().min(1),
  latitude: z.number().min(-90).max(90).transform(String),
  longitude: z.number().min(-180).max(180).transform(String),
  useWheel: z.boolean(),
  imageKeys: z.array(z.string()).optional().default([]),
});

// Create order
towberOrders.post("/", zValidator("json", towberOrderSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const db = c.get("db"); // Access the database instance

    // Ensure imageKeys is included in the data
    const orderData = {
      ...data,
      imageKeys: data.imageKeys || [], // Ensure imageKeys is always an array
    };

    const newOrder = await createTowberOrder(orderData, db);

    // Prepare the message to send to Telegram
    const firstImageUrl =
      newOrder.imageKeys && newOrder.imageKeys.length > 0
        ? `https://towber-api.shingsonz.workers.dev/api/upload/${newOrder.imageKeys[0]}\n\n`
        : "";

    const message = `${firstImageUrl}🚗 NEW TOWING ORDER 🚗

📋 ORDER DETAILS
• Customer: ${newOrder.customerName}
• Phone: ${newOrder.phoneNumber}
• License Plate: ${newOrder.licensePlate}
• Service Type: ${newOrder.selectedService}

⏰ TIME
• Created: ${new Date(newOrder.createdAt).toLocaleString("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "long",
      hour12: true,
    })} EST

${
  (newOrder.imageKeys || []).length > 0
    ? `📸 IMAGES
${(newOrder.imageKeys || [])
  .map(
    (key, index) =>
      `${index + 1}. https://towber-api.shingsonz.workers.dev/api/upload/${key}`
  )
  .join("\n")}`
    : "📸 No images attached"
}

📍 LOCATION DETAILS
• Pickup: ${newOrder.location}
• Destination: ${newOrder.destination}
• Maps Link: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      newOrder.location
    )}
`;

    // Send the message to Telegram
    await sendTelegramMessage(message, c);
    return c.json(newOrder, 201);
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all orders
towberOrders.get("/", async (c) => {
  try {
    const db = c.get("db"); // Access the database instance
    const orders = await getAllTowberOrders(db);
    return c.json(orders);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get order by ID
towberOrders.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.get("db"); // Access the database instance
    const order = await getTowberOrderById(id, db);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    return c.json(order);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update order
towberOrders.patch(
  "/:id",
  zValidator("json", towberOrderSchema.partial()),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const db = c.get("db"); // Access the database instance
      const updatedOrder = await updateTowberOrder(id, data, db);
      if (!updatedOrder) {
        return c.json({ error: "Order not found" }, 404);
      }
      return c.json(updatedOrder);
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

// Delete order
towberOrders.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.get("db"); // Access the database instance
    const success = await deleteTowberOrder(id, db);
    if (!success) {
      return c.json({ error: "Order not found" }, 404);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default towberOrders;
