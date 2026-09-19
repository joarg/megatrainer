import * as p from "drizzle-orm/pg-core";

// Themed trainer collections (e.g. "Macho World"). Previously a frontend-only
// hardcoded list; now a real table so trainers can be assigned a world at
// creation time and worlds can be managed (CRUD) without a code deploy.
export const worldTable = p.pgTable("worlds", {
    id: p.serial().primaryKey(),
    slug: p.text().notNull().unique(),
    name: p.text().notNull(),
    tagline: p.text().notNull(),
    description: p.text().notNull(),
    accent: p.text().notNull(),
    // Filename (without extension) expected in apps/web/src/lib/assets/worlds/.
    // Falls back to `slug` on the frontend when not set. Only relevant for
    // hand-curated static art; AI-generated covers are tracked separately in
    // worldMediaTable below and take priority on the frontend when present.
    imageKey: p.text(),
    // Freeform prompt behind the world's current generated cover image. Kept
    // separate from name/tagline/description (rather than always deriving
    // the prompt from them) so an editor can steer the generation without
    // rewriting the world's actual copy — see image-engine/world.ts.
    imagePrompt: p.text(),
    createdAt: p.timestamp().defaultNow().notNull(),
    updatedAt: p.timestamp().defaultNow().notNull(),
});

export const trainerTable = p.pgTable("trainers", {
    id: p.serial().primaryKey(),
    name: p.text().notNull(),
    personality: p.text().notNull(),
    sports: p.text().array().notNull().default([]),
    initialGreeting: p.text(),
    slug: p.text().notNull().unique(),
    // Nullable so existing trainers created before worlds existed keep working;
    // new trainers are expected to always set these at creation time.
    worldId: p.integer().references(() => worldTable.id, { onDelete: "set null" }),
    tagline: p.text(),
    // Freeform prompts behind the trainer's current portrait and action shot.
    // Kept separate (rather than one shared prompt) since the two images have
    // very different framing needs — see image-engine/portrait.ts. Persisted
    // so the manage-trainer UI can show them and let each be edited/regenerated
    // independently (see modules/trainer/index.ts).
    portraitPrompt: p.text(),
    actionShotPrompt: p.text(),
});

// A trainer can end up with many pictures for many situations (portrait,
// celebration, injury-check, etc.) — `kind` distinguishes those without
// requiring a schema change when new situations are added later.
export const mediaKindEnum = p.pgEnum("mediaKind", ["portrait", "actionShot"]);

export const trainerMediaTable = p.pgTable("trainerMedia", {
    id: p.serial().primaryKey(),
    trainerId: p.integer().notNull().references(() => trainerTable.id),
    kind: mediaKindEnum().notNull().default("portrait"),
    url: p.text().notNull(),
    createdAt: p.timestamp().defaultNow().notNull(),
});

// Generated cover images for a world (see image-engine/world.ts). Kept as a
// history table like trainerMedia rather than a single column on worldTable
// so a regenerate can't clobber the previous image before the new one is
// confirmed saved; the most recent row per worldId is the current cover. No
// `kind` column (unlike trainerMedia) since a world currently has only one
// picture "situation".
export const worldMediaTable = p.pgTable("worldMedia", {
    id: p.serial().primaryKey(),
    // Unlike trainerMedia's FK, this cascades: worlds (unlike trainers) have
    // a working DELETE endpoint (see modules/world/index.ts), so without
    // cascading, deleting a world with a generated cover image would fail on
    // this FK constraint instead of cleanly removing its media rows.
    worldId: p.integer().notNull().references(() => worldTable.id, { onDelete: "cascade" }),
    url: p.text().notNull(),
    createdAt: p.timestamp().defaultNow().notNull(),
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
export type InsertWorld = typeof worldTable.$inferInsert;
export type SelectWorld = typeof worldTable.$inferSelect;
export type InsertTrainerMedia = typeof trainerMediaTable.$inferInsert;
export type SelectTrainerMedia = typeof trainerMediaTable.$inferSelect;
export type InsertWorldMedia = typeof worldMediaTable.$inferInsert;
export type SelectWorldMedia = typeof worldMediaTable.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessionsTable.$inferInsert;
export type SelectOnboardingSession = typeof onboardingSessionsTable.$inferSelect;
