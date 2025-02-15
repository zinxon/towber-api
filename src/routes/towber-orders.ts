import { Env, Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createTowberOrder,
  getAllTowberOrders,
  getTowberOrderById,
  updateTowberOrder,
  deleteTowberOrder,
} from "../db/queries/towber-orders";
import { serviceEnum } from "../db/schema";

const towberOrders = new Hono();

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
});

// Create order
towberOrders.post("/", zValidator("json", towberOrderSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const db = c.get("db"); // Access the database instance
    const newOrder = await createTowberOrder(data, db); // Pass db to your function
    return c.json(newOrder, 201);
  } catch (error) {
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
