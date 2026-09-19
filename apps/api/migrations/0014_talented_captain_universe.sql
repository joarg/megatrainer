ALTER TABLE "trainers" ADD COLUMN "portraitPrompt" text;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "actionShotPrompt" text;--> statement-breakpoint
-- Seed the new portrait-specific prompt from the old shared imagePrompt so
-- existing trainers don't silently lose their custom prompt (see schema.ts).
-- actionShotPrompt is left null: the old imagePrompt was written with the
-- portrait's close-up framing in mind, so copying it into actionShotPrompt
-- too would carry over a mismatched prompt for the full-body shot.
UPDATE "trainers" SET "portraitPrompt" = "imagePrompt" WHERE "imagePrompt" IS NOT NULL;