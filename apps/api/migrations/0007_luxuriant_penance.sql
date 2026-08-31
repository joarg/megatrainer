CREATE TYPE "public"."phase" AS ENUM('basicInfo', 'firstQuestion', 'motivationsAndGoals', 'backgroundAndMetrics', 'toolsAndTime');--> statement-breakpoint
ALTER TABLE "onboardingSessions" ALTER COLUMN "phase" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "onboardingSessions" ALTER COLUMN "phase" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "onboardingSessions" ALTER COLUMN "phase" SET DATA TYPE "public"."phase" USING "phase"::"public"."phase";--> statement-breakpoint
ALTER TABLE "onboardingSessions" ALTER COLUMN "selectedSport" SET DATA TYPE text[] USING ARRAY["selectedSport"];--> statement-breakpoint
ALTER TABLE "onboardingSessions" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."status";