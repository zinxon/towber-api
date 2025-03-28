import { Env, Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import Stripe from "stripe";
import {
  createTowberOrder,
  getAllTowberOrders,
  getTowberOrderById,
  updateTowberOrder,
  deleteTowberOrder,
  sendTelegramMessage,
  getTowberOrdersByPhone,
} from "../db/queries/towber-orders";
import { serviceEnum } from "../db/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

export type Bindings = {
  DATABASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
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
  destination: z.string().min(0),
  latitude: z.number().min(-90).max(90).transform(String),
  longitude: z.number().min(-180).max(180).transform(String),
  useWheel: z.boolean(),
  imageKeys: z.array(z.string()).optional().default([]),
  price: z.number().min(0).transform(String),
  priceWithTax: z.number().min(0).transform(String),
  distance: z.number().min(0).transform(String),
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

    // Create Stripe payment link
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // First create a product
    const product = await stripe.products.create({
      name: `Towber Service - ${newOrder.customerName} - ${new Date(
        newOrder.createdAt
      ).toLocaleDateString()}`,
      metadata: {
        orderId: newOrder.id,
        customerName: newOrder.customerName,
        phoneNumber: newOrder.phoneNumber,
        serviceType: newOrder.selectedService,
        location: newOrder.location,
        destination: newOrder.destination,
        licensePlate: newOrder.licensePlate,
      },
    });

    // Then create a price for the product
    const price = await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: Math.round(parseFloat(newOrder.priceWithTax) * 100), // Convert to cents
      metadata: {
        orderId: newOrder.id,
        customerName: newOrder.customerName,
        phoneNumber: newOrder.phoneNumber,
        serviceType: newOrder.selectedService,
      },
    });

    // Finally create the payment link using the price
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        orderId: newOrder.id,
        customerName: newOrder.customerName,
        phoneNumber: newOrder.phoneNumber,
        serviceType: newOrder.selectedService,
      },
    });

    // Update the order with the payment link
    await updateTowberOrder(
      newOrder.id,
      {
        paymentLink: paymentLink.url,
      },
      db
    );

    // Prepare the message to send to Telegram
    const firstImageUrl =
      newOrder.imageKeys && newOrder.imageKeys.length > 0
        ? `https://towber-api.shingsonz.workers.dev/api/upload/${newOrder.imageKeys[0]}\n\n`
        : "";

    const message = `🚗 NEW TOWING ORDER 🚗
📋 ORDER DETAILS
• Customer: ${newOrder.customerName}
• Phone: ${newOrder.phoneNumber}
• License Plate: ${newOrder.licensePlate}
• Service Type: ${newOrder.selectedService}
• Price: $${newOrder.price}
• Price with Tax: $${newOrder.priceWithTax}
• Distance: ${newOrder.distance} km
⏰ TIME
• Created: ${new Date(newOrder.createdAt).toLocaleString("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: true,
    })}
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

// Get orders by phone number
towberOrders.get("/phone/:phoneNumber", async (c) => {
  try {
    const phoneNumber = c.req.param("phoneNumber");
    const db = c.get("db"); // Access the database instance
    const orders = await getTowberOrdersByPhone(phoneNumber, db);
    if (!orders || orders.length === 0) {
      return c.json({ error: "No orders found for this phone number" }, 404);
    }
    return c.json(orders);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Webhook endpoint
towberOrders.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();
  console.log(sig);
  console.log(body);
  let event;
  // Initialize Stripe with the API key from environment
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  try {
    // Use c.env to access environment variables
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return c.json({ error: "Webhook configuration error" }, 500);
    }

    event = await stripe.webhooks.constructEventAsync(
      body,
      sig!,
      webhookSecret
    );
  } catch (err) {
    console.error(`Webhook Error: ${err}`);
    return c.json({ error: "Webhook Error" }, 400);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Update the order status to paid
    const orderId = session.metadata?.orderId; // Assuming you stored the order ID in metadata
    await updateTowberOrder(orderId!, { orderStatus: "paid" }, c.get("db"));
  }

  // Return a response to acknowledge receipt of the event
  return c.json({ received: true });
});

export default towberOrders;
