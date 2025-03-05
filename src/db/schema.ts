import {
  pgSchema,
  pgTable,
  text,
  varchar,
  boolean,
  numeric,
  uuid,
  timestamp,
  pgEnum,
  PgArray,
} from "drizzle-orm/pg-core";

export const megacitySchema = pgSchema("megacity");

// Create an enum for the service types
export const serviceEnum = megacitySchema.enum("service_type", [
  "accident",
  "breakdown",
  "stuck",
  "battery",
  "flatTire",
  "outOfGas",
  "other",
]);

export const towberOrders = megacitySchema.table("towber_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  phoneNumber: varchar("phone_number", { length: 256 }).notNull(),
  licensePlate: varchar("license_plate", { length: 20 }).notNull(),
  selectedService: serviceEnum("selected_service").notNull(),
  location: text("location").notNull(),
  destination: text("destination").notNull(),
  latitude: numeric("latitude", { precision: 8, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 8, scale: 6 }).notNull(),
  useWheel: boolean("use_wheel").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  imageKeys: text("image_keys").array().default([]), // Store multiple image keys as an array
});
