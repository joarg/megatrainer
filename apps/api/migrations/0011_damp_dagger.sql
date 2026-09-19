CREATE TABLE "worlds" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"accent" text NOT NULL,
	"imageKey" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "worlds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "worldId" integer;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_worldId_worlds_id_fk" FOREIGN KEY ("worldId") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;