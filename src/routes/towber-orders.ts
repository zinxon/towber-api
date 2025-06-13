import { Env, Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import Stripe from "stripe";
import { cors } from "hono/cors";
import {
  createTowberOrder,
  getAllTowberOrders,
  getTowberOrderById,
  updateTowberOrder,
  deleteTowberOrder,
  sendTelegramMessage,
  getTowberOrdersByPhone,
} from "../db/queries/towber-orders";
import {
  serviceEnum,
  vehicleTypeEnum,
  towberOrders as towberOrdersSchema,
} from "../db/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

export type Bindings = {
  DATABASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_TEST_CHAT_ID: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

export type Variables = {
  db: PostgresJsDatabase<typeof schema>;
};

const towberOrders = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Configure CORS
towberOrders.use(
  "/*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://towber.shingsonz.com",
      "https://www.towber.app",
      "*",
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "idempotency-key",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: [
      "Content-Length",
      "X-Kuma-Revision",
      "Idempotency-Key",
      "idempotency-key",
    ],
    maxAge: 600,
    credentials: true,
  })
);

// Add explicit OPTIONS handler for preflight requests
towberOrders.options("/*", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": c.req.header("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Idempotency-Key, idempotency-key",
      "Access-Control-Max-Age": "600",
      "Access-Control-Allow-Credentials": "true",
    },
  });
});

// Validation schema
const towberOrderSchema = z.object({
  customerName: z.string().min(1),
  phoneNumber: z.string().min(1),
  licensePlate: z.string().min(1),
  selectedService: z.enum(serviceEnum.enumValues),
  vehicleType: z.enum(vehicleTypeEnum.enumValues),
  location: z.string().min(1),
  destination: z.string().min(0),
  latitude: z.number().min(-90).max(90).transform(String),
  longitude: z.number().min(-180).max(180).transform(String),
  useWheel: z.boolean(),
  isBooking: z.boolean().default(false),
  bookingDateTime: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .optional(),
  imageKeys: z.array(z.string()).optional().default([]),
  price: z.number().min(0).transform(String),
  priceWithTax: z.number().min(0).transform(String),
  distance: z.number().min(0).transform(String),
  referral: z.string().optional(),
  openid: z.string().optional(),
});

// Create order
towberOrders.post("/", zValidator("json", towberOrderSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const db = c.get("db"); // Access the database instance
    const idempotencyKey = c.req.header("Idempotency-Key");

    console.log("🚀 Starting order creation process");

    // Check if order with the same idempotency key exists
    if (idempotencyKey) {
      console.log(
        "🔍 Checking for existing order with idempotency key:",
        idempotencyKey
      );
      try {
        const [existingOrder] = await db
          .select()
          .from(towberOrdersSchema)
          .where(eq(towberOrdersSchema.idempotencyKey, idempotencyKey));

        if (existingOrder) {
          console.log("✅ Found existing order, returning:", existingOrder.id);
          return c.json(existingOrder, 200);
        }
      } catch (dbError) {
        console.error("❌ Database check failed:", dbError);
        throw new Error(`Database connection failed: ${dbError}`);
      }
    }

    // Ensure imageKeys is included in the data
    const orderData = {
      ...data,
      imageKeys: data.imageKeys || [], // Ensure imageKeys is always an array
      ...(idempotencyKey && { idempotencyKey }), // Add idempotency key if provided
    };

    console.log("💾 Creating new order in database");
    let newOrder;
    try {
      newOrder = await createTowberOrder(orderData, db);
      console.log("✅ Order created successfully:", newOrder.id);
    } catch (dbError) {
      console.error("❌ Database insert failed:", dbError);
      throw new Error(`Database insert failed: ${dbError}`);
    }

    // Only create payment link if priceWithTax is not 0
    if (parseFloat(newOrder.priceWithTax) > 0) {
      console.log("💳 Creating Stripe payment link");
      try {
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
            vehicleType: newOrder.vehicleType,
            location: newOrder.location,
            destination: newOrder.destination,
            licensePlate: newOrder.licensePlate,
            referral: newOrder.referral,
            openid: newOrder.openid,
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
            vehicleType: newOrder.vehicleType,
            location: newOrder.location,
            destination: newOrder.destination,
            licensePlate: newOrder.licensePlate,
            referral: newOrder.referral,
            openid: newOrder.openid,
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
            vehicleType: newOrder.vehicleType,
            location: newOrder.location,
            destination: newOrder.destination,
            licensePlate: newOrder.licensePlate,
            referral: newOrder.referral,
            openid: newOrder.openid,
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
        console.log("✅ Stripe payment link created successfully");
      } catch (stripeError) {
        console.error("❌ Stripe API failed:", stripeError);
        throw new Error(`Stripe API connection failed: ${stripeError}`);
      }
    }

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
• Vehicle Type: ${newOrder.vehicleType}
• Price: $${newOrder.price}
• Price with Tax: $${newOrder.priceWithTax}
• Distance: ${newOrder.distance} km
${newOrder.referral ? `• Referral: ${newOrder.referral}` : ""}
${
  newOrder.isBooking && newOrder.bookingDateTime
    ? `• Booking Date: ${new Date(newOrder.bookingDateTime).toLocaleString(
        "en-US",
        {
          timeZone: "America/Toronto",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          weekday: "short",
          hour12: true,
        }
      )}`
    : ""
}
${
  parseFloat(newOrder.priceWithTax) === 0
    ? "⚠️ OUT OF SERVICE - CONTACT CUSTOMER ⚠️"
    : ""
}
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
    console.log("📱 Sending Telegram notification");
    try {
      if (newOrder.customerName === "test") {
        await sendTelegramMessage(message, c, true);
      } else {
        await sendTelegramMessage(message, c);
      }
      console.log("✅ Telegram message sent successfully");
    } catch (telegramError) {
      console.error("❌ Telegram API failed:", telegramError);
      throw new Error(`Telegram API connection failed: ${telegramError}`);
    }

    return c.json(newOrder, 201);
  } catch (error: unknown) {
    console.error("❌ Error creating order:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json(
      { error: "Internal server error", details: errorMessage },
      500
    );
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

// Create payment intent
towberOrders.post("/create-payment-intent", async (c) => {
  try {
    const { orderId } = await c.req.json();
    const db = c.get("db");

    if (!orderId) {
      return c.json({ error: "Order ID is required" }, 400);
    }

    // Get the order details
    const order = await getTowberOrderById(orderId, db);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Initialize Stripe
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.priceWithTax) * 100), // Convert to cents
      currency: "cad",
      metadata: {
        orderId: order.id,
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
        serviceType: order.selectedService,
        location: order.location,
        destination: order.destination,
        licensePlate: order.licensePlate,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update the order with the payment intent ID
    await updateTowberOrder(
      orderId,
      {
        paymentIntentId: paymentIntent.id,
      },
      db
    );

    return c.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
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

// Process payment for an order
towberOrders.post("/process-payment", async (c) => {
  try {
    const {
      orderId,
      customerEmail,
      cardNumber,
      cardCvc,
      cardExpMonth,
      cardExpYear,
    } = await c.req.json();

    const db = c.get("db");

    if (!orderId || !cardNumber || !cardCvc || !cardExpMonth || !cardExpYear) {
      return c.json(
        {
          error:
            "Order ID, card number, CVC, expiration month, and expiration year are required",
        },
        400
      );
    }

    console.log(cardNumber, cardCvc, cardExpMonth, cardExpYear);

    // Get the order details
    const order = await getTowberOrderById(orderId, db);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Check if order is already paid
    if (order.orderStatus === "paid") {
      return c.json({ error: "Order is already paid" }, 400);
    }

    // Check if price is 0 (out of service)
    if (parseFloat(order.priceWithTax) === 0) {
      return c.json(
        { error: "This order is out of service and requires manual contact" },
        400
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create or retrieve customer
    let customer;
    if (customerEmail) {
      // Try to find existing customer by email
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        // Create new customer if not found
        customer = await stripe.customers.create({
          email: customerEmail,
          name: order.customerName,
          phone: order.phoneNumber,
          metadata: {
            orderId: order.id,
          },
        });
      }
    } else {
      // Create a customer without email if not provided
      customer = await stripe.customers.create({
        name: order.customerName,
        phone: order.phoneNumber,
        metadata: {
          orderId: order.id,
        },
      });
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber,
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
      },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.priceWithTax) * 100), // Convert to cents
      currency: "cad",
      customer: customer.id,
      payment_method: paymentMethod.id,
      confirm: true, // Confirm the payment immediately
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(paymentIntent);
    // Create a card for the customer using direct card details
    // First create a token with the card details
    // const token = await stripe.tokens.create({
    //   card: {
    //     number: cardNumber,
    //     exp_month: cardExpMonth,
    //     exp_year: cardExpYear,
    //     cvc: cardCvc,
    //   },
    // });

    // // Then create a source using the token
    // const cardResponse = await stripe.customers.createSource(customer.id, {
    //   source: token.id,
    // });

    // // Type assertion for the card object
    // const card = cardResponse as Stripe.Card;

    // console.log(card);

    // // Create a charge
    // const charge = await stripe.charges.create({
    //   amount: Math.round(parseFloat(order.priceWithTax) * 100), // Convert to cents
    //   currency: "cad",
    //   source: card.id,
    //   customer: customer.id,
    //   description: `Towber Service - ${order.customerName} - Order ${order.id}`,
    //   metadata: {
    //     orderId: order.id,
    //     customerName: order.customerName,
    //     phoneNumber: order.phoneNumber,
    //     serviceType: order.selectedService,
    //     location: order.location,
    //     destination: order.destination,
    //     licensePlate: order.licensePlate,
    //   },
    // });

    // Update the order status to paid
    await updateTowberOrder(
      orderId,
      {
        orderStatus: "paid",
        // paymentIntentId: charge.id,
      },
      db
    );

    // Send confirmation message to Telegram
    const message = `💰 PAYMENT RECEIVED 💰
📋 ORDER DETAILS
• Order ID: ${order.id}
• Customer: ${order.customerName}
• Phone: ${order.phoneNumber}
• Service Type: ${order.selectedService}
• Amount Paid: $${order.priceWithTax}
• Customer ID: ${customer.id}
• Payment Method ID: ${paymentMethod.id}
⏰ TIME
• Paid: ${new Date().toLocaleString("en-US", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: true,
    })}
`;

    await sendTelegramMessage(message, c);

    return c.json({
      success: true,
      // charge,
      customer: {
        id: customer.id,
        email: customer.email,
      },
      // card: {
      //   id: card.id,
      //   last4: card.last4,
      //   brand: card.brand,
      //   expMonth: card.exp_month,
      //   expYear: card.exp_year,
      // },
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return c.json({ error: "Payment processing failed" }, 500);
  }
});

export default towberOrders;
