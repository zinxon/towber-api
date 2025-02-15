import { InferModel } from "drizzle-orm";
import { towberOrders } from "../schema";

// Infer the types from our schema
export type TowberOrder = InferModel<typeof towberOrders>;
export type NewTowberOrder = InferModel<typeof towberOrders, "insert">;
