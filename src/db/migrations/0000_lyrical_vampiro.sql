CREATE SCHEMA "megacity";
--> statement-breakpoint
CREATE TYPE "megacity"."service_type" AS ENUM('accident', 'breakdown', 'stuck', 'battery', 'flatTire', 'outOfGas', 'other');--> statement-breakpoint
CREATE TABLE "megacity"."towber_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"phone_number" varchar(256) NOT NULL,
	"license_plate" varchar(20) NOT NULL,
	"selected_service" "megacity"."service_type" NOT NULL,
	"location" text NOT NULL,
	"destination" text NOT NULL,
	"latitude" numeric(8, 6) NOT NULL,
	"longitude" numeric(8, 6) NOT NULL,
	"use_wheel" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
