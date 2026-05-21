ALTER TABLE "trainers" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_slug_unique" UNIQUE("slug");