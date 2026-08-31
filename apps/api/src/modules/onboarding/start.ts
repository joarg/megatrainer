import { Elysia, t } from "elysia";
import { onboardingSessionsTable, trainerTable } from "../../schema.js";
import { db } from "../../db.js";
import { eq } from "drizzle-orm";
import { createEmptyUser } from '../../../../../coach-engine/profile.js';

export const startRoute = new Elysia()
    .post("/start", async ({ body, set }) => {
        const claimToken = crypto.randomUUID();

        const trainer = await db.select()
            .from(trainerTable)
            .where(eq(trainerTable.id, body.trainerId))
            .limit(1);

        const greeting = trainer[0].initialGreeting;

        const newSession = await db
            .insert(onboardingSessionsTable)
            .values({
                claimToken,
                trainerId: body.trainerId,
                selectedSport: body.selectedSport,
                lastAssistantMessage: greeting,
                userprofile: createEmptyUser(),
            })
            .returning();

        set.status = 201;
        return { sessionId: newSession[0].id, claimToken, greeting };
    }, {
        body: t.Object({
            trainerId: t.Integer(),
            selectedSport: t.Optional(t.Array(t.String())),
            userId: t.Optional(t.Integer()),
            userProfile: t.Optional(t.Unknown()),
        }),
        response: {
            201: t.Object({
                sessionId: t.Integer({ description: "The ID of the newly created onboarding session" }),
                claimToken: t.String({ description: "UUID token used to authenticate subsequent messages in this session" }),
                greeting: t.Nullable(t.String({ description: "The trainer's initial greeting message" })),
            }),
        },
        detail: {
            description: "Start a new onboarding session with a selected trainer and sports selected array. This gives you a session id, and a claim id. Pass these later for doing an api call to message. "
        }
    });
