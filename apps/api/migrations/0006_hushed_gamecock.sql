ALTER TABLE "trainers" ADD COLUMN "sports" text[] DEFAULT ARRAY[]::text[] NOT NULL;
ALTER TABLE "onboardingSessions" ADD COLUMN "selectedSport" text;