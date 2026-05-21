ALTER TABLE "onboardingSessions" ADD COLUMN "selectedSport" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "sports" text[] DEFAULT '{}' NOT NULL;