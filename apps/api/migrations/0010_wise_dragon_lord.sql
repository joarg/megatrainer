CREATE TYPE "public"."mediaKind" AS ENUM('portrait');--> statement-breakpoint
CREATE TABLE "trainerMedia" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"kind" "mediaKind" DEFAULT 'portrait' NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trainerMedia" ADD CONSTRAINT "trainerMedia_trainerId_trainers_id_fk" FOREIGN KEY ("trainerId") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;