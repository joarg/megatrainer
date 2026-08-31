import { Elysia, t } from "elysia";
import { db } from "../../db";
import { onboardingSessionsTable, trainerTable } from "../../schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createEmptyUser } from "../../../../../coach-engine/profile.js";
import type { User } from "../../../../../coach-engine/types/user.type.js";

// Shared route params for endpoints scoped by trainer slug + session id.
const sessionParamsSchema = t.Object({
  slug: t.String({ minLength: 1 }),
  sessionId: t.String({ minLength: 1 }),
});

// Input contract for user chat messages during onboarding.
const userMessageBodySchema = t.Object({
  message: t.String({ minLength: 1 }),
});

const createSessionBodySchema = t.Optional(
  t.Object({
    selectedSports: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  })
);

// DB JSON can be null/partial. Normalize into a full User shape before core processing.
function asUserProfile(value: unknown): User {
  if (!value || typeof value !== "object") {
    return createEmptyUser();
  }

  return { ...createEmptyUser(), ...(value as Partial<User>) };
}

// Load and validate a session + its trainer in one place.
// Returns the pair or a typed error that callers can map to an HTTP response.
type LoadResult =
  | { ok: true; session: typeof onboardingSessionsTable.$inferSelect; trainer: typeof trainerTable.$inferSelect }
  | { ok: false; status: 400 | 404; message: string };

async function loadSessionAndTrainer(sessionId: number, slug: string): Promise<LoadResult> {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return { ok: false, status: 400, message: "Invalid session id" };
  }

  const sessionRows = await db
    .select()
    .from(onboardingSessionsTable)
    .where(eq(onboardingSessionsTable.id, sessionId));

  const session = sessionRows[0];
  if (!session) return { ok: false, status: 404, message: "Session not found" };
  if (session.status !== "active") return { ok: false, status: 400, message: "Session is not active" };

  const trainerRows = await db
    .select()
    .from(trainerTable)
    .where(eq(trainerTable.id, session.trainerId));

  const trainer = trainerRows[0];
  if (!trainer) return { ok: false, status: 404, message: "Trainer not found" };
  if (trainer.slug !== slug) return { ok: false, status: 400, message: "Session does not belong to this trainer" };

  return { ok: true, session, trainer };
}

export const onboardingModule = new Elysia({ prefix: "/:slug/onboarding" })

  // Read the current onboarding session state used by the web client to hydrate UI/debug panel.
  .get("/session/:sessionId", async ({ params, set }) => {
    const sessionId = Number(params.sessionId);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      set.status = 400;
      return { message: "Invalid session id" };
    }

    const rows = await db
      .select()
      .from(onboardingSessionsTable)
      .where(eq(onboardingSessionsTable.id, sessionId));

    const session = rows[0];
    if (!session) {
      set.status = 404;
      return { message: "Session not found" };
    }

    return session;
  })
  // Create a new onboarding session anchored to a specific trainer.
  .post("/session", async ({ params, body, set }) => {
    const rows = await db
      .select()
      .from(trainerTable)
      .where(eq(trainerTable.slug, params.slug));

    const trainer = rows[0];
    if (!trainer) {
      set.status = 404;
      return { message: "Trainer not found" };
    }

    const requestedSports = (body?.selectedSports ?? [])
      .map((sport) => sport.trim())
      .filter((sport) => sport.length > 0);
    const availableSports = trainer.sports ?? [];

    if (
      requestedSports.length > 0 &&
      availableSports.length > 0 &&
      requestedSports.some((sport) => !availableSports.includes(sport))
    ) {
      set.status = 400;
      return { message: "Selected sports must be part of trainer sports" };
    }

    const selectedSports = requestedSports.length > 0 ? requestedSports : availableSports;
    const selectedSport = selectedSports.join(", ");

    // Use the greeting generated at trainer creation time.
    // Fall back to generating on the fly for trainers created before this feature.
    const greetingMessage = trainer.initialGreeting
      ?? await generateGreeting({
        personality: trainer.personality,
        trainerName: trainer.name,
        selectedSport: selectedSport.length > 0 ? selectedSport : undefined,
        userMessage: '',
      });

    const inserted = await db
      .insert(onboardingSessionsTable)
      .values({
        trainerId: trainer.id,
        claimToken: randomUUID(),
        selectedSport: selectedSport.length > 0 ? selectedSport : null,
        lastAssistantMessage: greetingMessage,
        phase: ONBOARDING_PHASES.basicInfo,
        phaseAttempts: 0,
      })
      .returning({ id: onboardingSessionsTable.id });

    const newSessionId = inserted[0].id;

    // Run attempt 0 synthetically (no real user reply yet) to generate the
    // first "tell me your name/age/location" question. This keeps attempt 0
    // as a system-triggered turn — consistent with what the followUp[0] prompt
    // expects — so the user's real first message lands on attempt 1 as an
    // actual answer to assess.
    const firstTurnResult = await processTurn({
      phase: ONBOARDING_PHASES.basicInfo,
      phaseAttempts: 0,
      userMessage: '',
      trainerName: trainer.name,
      personality: trainer.personality,
      selectedSport: selectedSport.length > 0 ? selectedSport : trainer.sports.join(', '),
      currentUserProfile: createEmptyUser(),
      lastAssistantMessage: greetingMessage,
    });

    await db
      .update(onboardingSessionsTable)
      .set({
        phaseAttempts: 1,
        lastAssistantMessage: firstTurnResult.assistantMessage,
        phase: firstTurnResult.nextPhase,
      })
      .where(eq(onboardingSessionsTable.id, newSessionId));

    set.status = 201;
    return {
      sessionId: newSessionId,
      messages: [
        { role: 'assistant', text: greetingMessage },
        { role: 'assistant', text: firstTurnResult.assistantMessage },
      ],
    };
  }, {
    body: createSessionBodySchema,
  })
  // SSE endpoint: streams each conversation bubble as it is produced by the orchestrator.
  .post(
    "/sessions/:sessionId/message/stream",
    async ({ params, body }) => {
      const loaded = await loadSessionAndTrainer(Number(params.sessionId), params.slug);
      if (!loaded.ok) {
        return new Response(JSON.stringify({ message: loaded.message }), { status: loaded.status });
      }
      const { session, trainer } = loaded;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          const emit = (msg: ConversationMessage) => send("message", msg);

          const currentUserProfile = asUserProfile(session.userprofile);
          const turnResult = await processTurn({
            phase: session.phase,
            phaseAttempts: session.phaseAttempts,
            userMessage: body.message,
            trainerName: trainer.name,
            personality: trainer.personality,
            selectedSport: session.selectedSport ?? trainer.sports.join(", "),
            currentUserProfile,
            lastAssistantMessage: session.lastAssistantMessage ?? undefined,
            emit,
          });

          send("message", { role: "assistant", text: turnResult.assistantMessage });

          const isComplete = turnResult.phaseComplete === true;

          await db
            .update(onboardingSessionsTable)
            .set({
              userprofile: turnResult.updatedUserProfile,
              phase: turnResult.nextPhase,
              phaseAttempts: turnResult.nextPhase !== session.phase ? 0 : session.phaseAttempts + 1,
              lastAssistantMessage: turnResult.assistantMessage,
              status: isComplete ? 'inactive' : 'active',
              updatedAt: new Date(),
            })
            .where(eq(onboardingSessionsTable.id, session.id));

          send("done", {
            phase: turnResult.nextPhase,
            phaseAttempts: turnResult.nextPhase !== session.phase ? 0 : session.phaseAttempts + 1,
            userprofile: turnResult.updatedUserProfile,
            complete: isComplete,
          });

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    },
    {
      params: sessionParamsSchema,
      body: userMessageBodySchema,
    }
  );

// Stateless debug endpoint — calls processTurn directly with no DB involvement.
// Useful for prototyping coach-engine behavior via curl/Postman without managing sessions.
// curl -X POST http://localhost:3000/debug/turn \
//   -H 'Content-Type: application/json' \
//   -d '{"phase":"basicInfo","phaseAttempts":0,"userMessage":"hi","trainerName":"Alex","personality":"friendly","selectedSport":"cycling"}'
export const debugModule = new Elysia({ prefix: "/debug" }).post(
  "/turn",
  async ({ body }) => {
    const currentUserProfile = asUserProfile(body.currentUserProfile ?? null);
    const turnResult = await processTurn({
      phase: body.phase,
      phaseAttempts: body.phaseAttempts ?? 0,
      userMessage: body.userMessage,
      trainerName: body.trainerName,
      personality: body.personality,
      selectedSport: body.selectedSport,
      currentUserProfile,
      lastAssistantMessage: body.lastAssistantMessage,
    });
    return turnResult;
  },
  {
    body: t.Object({
      phase: t.String({ minLength: 1 }),
      phaseAttempts: t.Optional(t.Number()),
      userMessage: t.String({ minLength: 0 }),
      trainerName: t.Optional(t.String()),
      personality: t.String({ minLength: 1 }),
      selectedSport: t.Optional(t.String()),
      currentUserProfile: t.Optional(t.Unknown()),
      lastAssistantMessage: t.Optional(t.String()),
    }),
  }
);
