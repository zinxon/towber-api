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
  "tireChange",
  "outOfGas",
  "other",
]);

export const towberOrderStatusEnum = megacitySchema.enum(
  "towber_order_status",
  ["pending", "contacted", "paid"]
);

export const vehicleTypeEnum = megacitySchema.enum("vehicle_type", [
  "FWD",
  "RWD",
  "AWD",
  "Flatbed",
  "HeavyDuty",
  "ForkLift",
  "Other",
]);

export const towberOrders = megacitySchema.table("towber_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  phoneNumber: varchar("phone_number", { length: 256 }).notNull(),
  licensePlate: varchar("license_plate", { length: 20 }).notNull(),
  selectedService: serviceEnum("selected_service").notNull(),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  location: text("location").notNull(),
  destination: text("destination").notNull(),
  latitude: numeric("latitude", { precision: 8, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 8, scale: 6 }).notNull(),
  useWheel: boolean("use_wheel").default(false).notNull(),
  isBooking: boolean("is_booking").default(false).notNull(),
  bookingDateTime: timestamp("booking_datetime", {
    mode: "date",
    withTimezone: true,
  }),
  orderStatus: towberOrderStatusEnum("order_status")
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  imageKeys: text("image_keys").array().default([]), // Store multiple image keys as an array
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  priceWithTax: numeric("price_with_tax", {
    precision: 10,
    scale: 2,
  }).notNull(),
  distance: numeric("distance", { precision: 10, scale: 2 }), // Distance in kilometers
  referral: text("referral"), // Referral code
  openid: text("openid"), // WeChat openid
  paymentLink: text("payment_link"), // Stripe payment link
  paymentIntentId: text("payment_intent_id"), // Stripe payment intent ID
});
