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
export async function sendTelegramMessage(message: string, ctx: Context) {
  const telegramBotToken = ctx.env.TELEGRAM_BOT_TOKEN; // Add your bot token to .dev.vars
  const chatId = ctx.env.TELEGRAM_CHAT_ID; // Add your chat ID to .dev.vars
  console.log("telegramBotToken", telegramBotToken);
  if (!telegramBotToken || !chatId) {
    console.error("Telegram bot token or chat ID is not set.");
    return;
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: message,
  };

  try {
    await axios.post(url, payload);
    console.log("Message sent to Telegram:", message);
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
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
