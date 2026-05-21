CREATE TYPE "public"."status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "onboardingSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"userId" integer,
	"claimToken" text NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"phase" text DEFAULT 'basicInfo' NOT NULL,
	"lastAssistantMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "onboardingSessions_claimToken_unique" UNIQUE("claimToken")
);
--> statement-breakpoint
ALTER TABLE "onboardingSessions" ADD CONSTRAINT "onboardingSessions_trainerId_trainers_id_fk" FOREIGN KEY ("trainerId") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;