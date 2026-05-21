import * as p from "drizzle-orm/pg-core";

export const trainerTable = p.pgTable("trainers", {
    id: p.serial().primaryKey(),
    name: p.text().notNull(),
    personality: p.text().notNull(),
    sports: p.text().array().notNull().default([]),
    initialGreeting: p.text(),
    slug: p.text().notNull().unique(),
});

export const onboardingStatusEnum = p.pgEnum("status", ["active", "inactive", "archived"]);

export const onboardingSessionsTable = p.pgTable("onboardingSessions", {
    id: p.serial().primaryKey(),
    trainerId: p.integer().notNull().references(() => trainerTable.id),
    userId: p.integer(),
    userprofile: p.jsonb(),
    claimToken: p.text().notNull().unique(),
    status: onboardingStatusEnum().default("active").notNull(),
    phase: p.text().default("basicInfo").notNull(),
    phaseAttempts: p.integer().default(0).notNull(),
    selectedSport: p.text(),
    lastAssistantMessage: p.text(),
    createdAt: p.timestamp().defaultNow().notNull(),
    updatedAt: p.timestamp().defaultNow().notNull(),
    completedAt: p.timestamp(),
});

export type InsertTrainer = typeof trainerTable.$inferInsert;
export type SelectTrainer = typeof trainerTable.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessionsTable.$inferInsert;
export type SelectOnboardingSession = typeof onboardingSessionsTable.$inferSelect;
