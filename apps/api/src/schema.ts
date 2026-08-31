import * as p from "drizzle-orm/pg-core";

export const trainerTable = p.pgTable("trainers", {
    id: p.serial().primaryKey(),
    name: p.text().notNull(),
    personality: p.text().notNull(),
    sports: p.text().array().notNull().default([]),
    initialGreeting: p.text(),
    slug: p.text().notNull().unique(),
});


export const phaseEnum = p.pgEnum("phase", ["basicInfo", "motivationsAndGoals", "backgroundAndMetrics", "toolsAndTime"]);

// A finalized onboarding turn for debugging:
// what the assistant asked previously, what the user replied, and how the assistant responded.
export type ChatHistoryEntry = {
    previousAssistantMessage: string | null;
    userMessage: string;
    assistantResponse: string;
    phaseBefore: (typeof phaseEnum.enumValues)[number];
    phaseAfter: (typeof phaseEnum.enumValues)[number];
    at: string;
};

export const onboardingSessionsTable = p.pgTable("onboardingSessions", {
    id: p.serial().primaryKey(),
    trainerId: p.integer().notNull().references(() => trainerTable.id),
    userId: p.integer(),
    userprofile: p.jsonb(),
    claimToken: p.text().notNull().unique(),
    phase: phaseEnum(),
    phaseAttempts: p.integer().default(0).notNull(),
    selectedSport: p.text().array(),
    lastAssistantMessage: p.text(),
    chatHistory: p.jsonb().$type<ChatHistoryEntry[]>().default([]).notNull(),
    createdAt: p.timestamp().defaultNow().notNull(),
    updatedAt: p.timestamp().defaultNow().notNull(),
    completedAt: p.timestamp(),
});


export type InsertTrainer = typeof trainerTable.$inferInsert;
export type SelectTrainer = typeof trainerTable.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessionsTable.$inferInsert;
export type SelectOnboardingSession = typeof onboardingSessionsTable.$inferSelect;
