ALTER TABLE "megacity"."towber_orders" ADD COLUMN "is_booking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ADD COLUMN "booking_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ADD COLUMN "booking_time" varchar(8);