ALTER TABLE "megacity"."towber_orders" ADD COLUMN "booking_datetime" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" DROP COLUMN "booking_date";--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" DROP COLUMN "booking_time";