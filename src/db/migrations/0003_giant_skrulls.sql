ALTER TABLE "megacity"."towber_orders" ADD COLUMN "price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ADD COLUMN "price_with_tax" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ADD COLUMN "distance" numeric(10, 2);