CREATE TABLE "worldMedia" (
	"id" serial PRIMARY KEY NOT NULL,
	"worldId" integer NOT NULL,
	"url" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worlds" ADD COLUMN "imagePrompt" text;--> statement-breakpoint
ALTER TABLE "worldMedia" ADD CONSTRAINT "worldMedia_worldId_worlds_id_fk" FOREIGN KEY ("worldId") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;