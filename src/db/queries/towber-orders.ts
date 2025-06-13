import { desc, eq } from "drizzle-orm";
import { towberOrders } from "../schema";
import { TowberOrder, NewTowberOrder } from "./types";
import axios from "axios";
import { Context } from "hono";

// Create a new order
export async function createTowberOrder(
  order: NewTowberOrder,
  db: any // Accept the db instance
): Promise<TowberOrder> {
  console.log("order", order);
  // Check for existing order with the same idempotency key if provided
  if (order.idempotencyKey) {
    const [existingOrder] = await db
      .select()
      .from(towberOrders)
      .where(eq(towberOrders.idempotencyKey, order.idempotencyKey));

    if (existingOrder) {
      return existingOrder;
    }
  }

  const [newOrder] = await db.insert(towberOrders).values(order).returning();
  console.log("newOrder", newOrder);
  return newOrder;
}

// Get all orders
export async function getAllTowberOrders(
  db: any // Accept the db instance
): Promise<TowberOrder[]> {
  return await db.select().from(towberOrders);
}

// Get order by ID
export async function getTowberOrderById(
  id: string,
  db: any // Accept the db instance
): Promise<TowberOrder | null> {
  const [order] = await db
    .select()
    .from(towberOrders)
    .where(eq(towberOrders.id, id));
  return order || null;
}

// Update order
export async function updateTowberOrder(
  id: string,
  updates: Partial<NewTowberOrder>,
  db: any // Accept the db instance
): Promise<TowberOrder | null> {
  const [updatedOrder] = await db
    .update(towberOrders)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(towberOrders.id, id))
    .returning();
  return updatedOrder || null;
}

// Delete order
export async function deleteTowberOrder(
  id: string,
  db: any // Accept the db instance
): Promise<boolean> {
  const [deletedOrder] = await db
    .delete(towberOrders)
    .where(eq(towberOrders.id, id))
    .returning();
  return !!deletedOrder;
}

// Function to send message to Telegram
export async function sendTelegramMessage(
  message: string,
  ctx: Context,
  isTest: boolean = false
) {
  const telegramBotToken = ctx.env.TELEGRAM_BOT_TOKEN; // Add your bot token to .dev.vars
  const chatId = isTest
    ? ctx.env.TELEGRAM_TEST_CHAT_ID
    : ctx.env.TELEGRAM_CHAT_ID; // Add your chat ID to .dev.vars

  console.log("📱 Telegram config check:");
  console.log("- Bot token exists:", !!telegramBotToken);
  console.log("- Chat ID exists:", !!chatId);
  console.log("- Is test mode:", isTest);

  if (!telegramBotToken || !chatId) {
    console.error("❌ Telegram bot token or chat ID is not set.");
    throw new Error(
      "Telegram configuration missing: " +
        (!telegramBotToken ? "TELEGRAM_BOT_TOKEN " : "") +
        (!chatId ? (isTest ? "TELEGRAM_TEST_CHAT_ID" : "TELEGRAM_CHAT_ID") : "")
    );
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
  };

  console.log(
    "📡 Attempting to send to Telegram API:",
    url.replace(telegramBotToken, "***")
  );

  try {
    const response = await axios.post(url, payload, {
      timeout: 10000, // 10 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Message sent to Telegram successfully");
    return response.data;
  } catch (error: unknown) {
    console.error("❌ Error sending message to Telegram:");
    if (axios.isAxiosError(error)) {
      console.error("- Status:", error.response?.status);
      console.error("- Status Text:", error.response?.statusText);
      console.error("- Response Data:", error.response?.data);
      console.error(
        "- Request URL:",
        error.config?.url?.replace(telegramBotToken, "***")
      );
      console.error("- Timeout:", error.code === "ECONNABORTED");
      console.error(
        "- Network Error:",
        error.code === "ENOTFOUND" || error.code === "ECONNREFUSED"
      );
    } else {
      console.error("- Unknown error:", error);
    }
    throw error;
  }
}

// Get orders by phone number
export async function getTowberOrdersByPhone(
  phoneNumber: string,
  db: any // Accept the db instance
): Promise<TowberOrder[]> {
  return await db
    .select()
    .from(towberOrders)
    .where(eq(towberOrders.phoneNumber, phoneNumber))
    .orderBy(desc(towberOrders.createdAt));
}
