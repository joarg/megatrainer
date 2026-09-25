import { Elysia, t } from "elysia";
import { onboardingSessionsTable, trainerTable } from "../../schema.js";
import { db } from "../../db.js";
import { eq, and } from "drizzle-orm";
import { generateFirstQuestion } from '../../../../../coach-engine/phases/onboarding/first_question/first_question.js'

export const initialQuestionRoute = new Elysia()
    .post("/initial-question", async ({ body, set }) => {
        const { sessionId, claimToken } = body;

        // Verify session and claim token. The token has to be part of the lookup itself,
        // not merely present in the body: sessionId is a serial, so it is enumerable and
        // guessable. Filtering on the id alone let anyone who guessed a valid sessionId
        // read that session's trainer and overwrite its first question, without ever
        // knowing the unguessable claim token. Mirrors the check in message.ts.
        let session = await db.select()
            .from(onboardingSessionsTable)
            .where(
                and(
                    eq(onboardingSessionsTable.id, sessionId),
                    eq(onboardingSessionsTable.claimToken, claimToken),
                ),
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
            language: trainer[0].language ?? undefined,
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
