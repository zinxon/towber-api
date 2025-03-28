CREATE TYPE "megacity"."towber_order_status" AS ENUM('pending', 'contacted', 'paid');--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ADD COLUMN "order_status" "megacity"."towber_order_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ALTER COLUMN "selected_service" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "megacity"."service_type";--> statement-breakpoint
CREATE TYPE "megacity"."service_type" AS ENUM('accident', 'breakdown', 'stuck', 'battery', 'tireChange', 'outOfGas', 'other');--> statement-breakpoint
ALTER TABLE "megacity"."towber_orders" ALTER COLUMN "selected_service" SET DATA TYPE "megacity"."service_type" USING "selected_service"::"megacity"."service_type";