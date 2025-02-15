import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { towberOrders } from "../schema";
import { TowberOrder, NewTowberOrder } from "./types";

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
export async function getAllTowberOrders(): Promise<TowberOrder[]> {
  return await db.select().from(towberOrders);
}

// Get order by ID
export async function getTowberOrderById(
  id: string
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
  updates: Partial<NewTowberOrder>
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
export async function deleteTowberOrder(id: string): Promise<boolean> {
  const [deletedOrder] = await db
    .delete(towberOrders)
    .where(eq(towberOrders.id, id))
    .returning();
  return !!deletedOrder;
}
