ALTER TABLE "onboardingSessions" ALTER COLUMN "phase" SET DATA TYPE text;--> statement-breakpoint
UPDATE "onboardingSessions" SET "phase" = 'basicInfo' WHERE "phase" = 'firstQuestion';--> statement-breakpoint
DROP TYPE "public"."phase";--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('basicInfo', 'motivationsAndGoals', 'backgroundAndMetrics', 'toolsAndTime');--> statement-breakpoint
ALTER TABLE "onboardingSessions" ALTER COLUMN "phase" SET DATA TYPE "public"."phase" USING "phase"::"public"."phase";