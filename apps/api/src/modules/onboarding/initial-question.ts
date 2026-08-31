import { Elysia, t } from "elysia";
import { onboardingSessionsTable, trainerTable } from "../../schema.js";
import { db } from "../../db.js";
import { eq, and } from "drizzle-orm";
import { generateFirstQuestion } from '../../../../../coach-engine/phases/onboarding/first_question/first_question.js'

export const initialQuestionRoute = new Elysia()
    .post("/initial-question", async ({ body, set }) => {
        const { sessionId, claimToken } = body;

        // Verify session and claim token
        let session = await db.select()
            .from(onboardingSessionsTable)
            .where(
                eq(onboardingSessionsTable.id, sessionId),
            )
            .limit(1);

        if (!session[0]) {
            set.status = 404;
            return { error: "Session not found" };
        }

        // get the trainer associated with the session
        const trainer = await
            db.select()
                .from(trainerTable)
                .where(eq(trainerTable.id, session[0].trainerId))
                .limit(1);


        const firstQuestion = await generateFirstQuestion({
            personality: trainer[0].personality,
            trainerName: trainer[0].name,
            selectedSport: session[0].selectedSport == null ? undefined : session[0].selectedSport,
            lastAssistantMessage: session[0].lastAssistantMessage ?? '',
            userMessage: '',
        });
        const messageBeforeUpdate = session[0].lastAssistantMessage

        await db.update(onboardingSessionsTable)
            .set({ lastAssistantMessage: firstQuestion.content, phase: 'basicInfo' })
            .where(eq(onboardingSessionsTable.id, sessionId));
        return { question: firstQuestion.content, last: messageBeforeUpdate, thinking: firstQuestion.thinking };
    }, {
        body: t.Object({
            sessionId: t.Integer(),
            claimToken: t.String(),
        })
    });
