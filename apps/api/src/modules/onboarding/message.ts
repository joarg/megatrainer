import { Elysia, t } from "elysia";
import { onboardingSessionsTable, trainerTable, type ChatHistoryEntry } from "../../schema.js";
import { db } from "../../db.js";
import { eq, and } from "drizzle-orm";
import { processMessage } from '../../../../../coach-engine/phases/onboarding/message/index.js';
import type { User } from '../../../../../coach-engine/types/user.type.js';

export const messageRoute = new Elysia()
    .post("/message", async ({ body, set }) => {
        const { sessionId, claimToken, userInput } = body;

        // Verify session and claim token
        let session = await db.select()
            .from(onboardingSessionsTable)
            .where(and(
                eq(onboardingSessionsTable.id, sessionId),
                eq(onboardingSessionsTable.claimToken, claimToken),
            ))
            .limit(1);

        if (!session[0]) {
            set.status = 404;
            return { error: "Session not found" };
        }

        // get trainerdata
        const matchedTrainers = await
            db.select()
                .from(trainerTable)
                .where(eq(trainerTable.id, session[0].trainerId))
                .limit(1);

        if (!matchedTrainers[0]) {
            set.status = 404;
            return { error: "Selected trainer not found" };
        }
        const trainer = matchedTrainers[0];



        const sessionData = session[0];

        const phaseBefore = sessionData.phase ?? 'basicInfo';

        let responseToMessage;
        try {
            responseToMessage = await processMessage({
                userMessage: userInput,
                lastAssistantMessage: sessionData.lastAssistantMessage || undefined,
                personality: trainer.personality,
                phase: phaseBefore,
                phaseAttempts: sessionData.phaseAttempts || 0,
                currentUserProfile: sessionData.userprofile as User,
                selectedSport: sessionData.selectedSport ?? undefined,
                trainerName: trainer.name || undefined,
            });
        } catch (err) {
            // Guard against any unexpected failure (e.g. a transient LLM/network error) so the
            // client gets a clean, retryable response instead of a raw error/stack trace, and the
            // session state is left untouched so the user can simply try again.
            console.error('processMessage threw unexpectedly:', err);
            set.status = 502;
            return { error: "Something went wrong generating a response. Please try again." };
        }

        const phaseAfter = responseToMessage.nextPhase ?? phaseBefore;

        // Store the full finalized turn for debugging.
        const newChatHistoryEntry: ChatHistoryEntry = {
            previousAssistantMessage: sessionData.lastAssistantMessage,
            userMessage: userInput,
            assistantResponse: responseToMessage.response,
            phaseBefore,
            phaseAfter,
            at: new Date().toISOString(),
        };

        await db.update(onboardingSessionsTable)
            .set({
                lastAssistantMessage: responseToMessage.response,
                userprofile: responseToMessage.updatedUserProfile,
                phase: phaseAfter,
                phaseAttempts: phaseAfter !== phaseBefore ? 0 : (sessionData.phaseAttempts || 0) + 1,
                chatHistory: [...(sessionData.chatHistory ?? []), newChatHistoryEntry],
            })
            .where(eq(onboardingSessionsTable.id, sessionId));


        return {
            question: responseToMessage.response,
            phaseComplete: responseToMessage.nextPhase === null || responseToMessage.nextPhase !== phaseBefore,
            updatedUserProfile: responseToMessage.updatedUserProfile
        };
    }, {
        body: t.Object({
            sessionId: t.Integer(),
            claimToken: t.String(),
            userInput: t.String(),
        })
    });
