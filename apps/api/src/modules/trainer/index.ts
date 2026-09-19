import { Elysia, t } from "elysia";
import { generateGreeting } from "../../../../../coach-engine/index.js";
import { generateTrainerActionShot, generateTrainerPortrait } from "../../../../../image-engine/index.js";
import { trainerMediaTable, trainerTable, worldTable } from "../../schema";
import { db } from "../../db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  createTrainerInputSchema,
  regenerateActionShotInputSchema,
  regeneratePortraitInputSchema,
  updateTrainerInputSchema,
} from "./schema";
import { loadTrainerImage, saveTrainerImage } from "../media/storage";

/**
 * Generates a portrait for a trainer, saves it to disk, and records the
 * trainerMedia row. Returns both the public URL and the raw bytes since
 * callers that also (re)generate an action shot need the bytes as the
 * IPAdapter reference.
 */
async function generateAndSavePortrait(trainer: typeof trainerTable.$inferSelect, portraitPrompt: string | undefined) {
  const bytes = await generateTrainerPortrait({
    trainerName: trainer.name,
    personality: trainer.personality,
    sports: trainer.sports,
    portraitPrompt,
  });
  const url = await saveTrainerImage(trainer.slug, "portrait", bytes);
  await db.insert(trainerMediaTable).values({ trainerId: trainer.id, kind: "portrait", url });
  return { url, bytes };
}

/**
 * Generates an action shot for a trainer from a portrait reference (freshly
 * generated or an existing saved one), saves it to disk, and records the
 * trainerMedia row.
 */
async function generateAndSaveActionShot(
  trainer: typeof trainerTable.$inferSelect,
  actionShotPrompt: string | undefined,
  portraitBytes: Buffer
) {
  const bytes = await generateTrainerActionShot(
    { trainerName: trainer.name, personality: trainer.personality, sports: trainer.sports, actionShotPrompt },
    portraitBytes
  );
  const url = await saveTrainerImage(trainer.slug, "actionShot", bytes);
  await db.insert(trainerMediaTable).values({ trainerId: trainer.id, kind: "actionShot", url });
  return { url, bytes };
}

/**
 * Generates a portrait and a matching action shot for a freshly created
 * trainer. Best-effort: image generation depends on a local ComfyUI instance
 * that may be slow to warm up or briefly unavailable, so failures here must
 * not break trainer creation — they're logged and skipped. The action shot
 * is only attempted if the portrait succeeds, since it's generated from the
 * portrait via IPAdapter (see image-engine/services/comfyui.service.ts) so
 * both depict the same person.
 */
async function createTrainerMedia(
  trainer: typeof trainerTable.$inferSelect,
  portraitPrompt: string | undefined,
  actionShotPrompt: string | undefined
) {
  let portraitUrl: string | null = null;
  let portraitBytes: Buffer | null = null;
  try {
    const result = await generateAndSavePortrait(trainer, portraitPrompt);
    portraitUrl = result.url;
    portraitBytes = result.bytes;
  } catch (err) {
    console.error(`Failed to generate portrait for trainer ${trainer.slug}:`, err);
    return { portraitUrl: null, actionShotUrl: null };
  }

  let actionShotUrl: string | null = null;
  try {
    const result = await generateAndSaveActionShot(trainer, actionShotPrompt, portraitBytes);
    actionShotUrl = result.url;
  } catch (err) {
    console.error(`Failed to generate action shot for trainer ${trainer.slug}:`, err);
  }

  return { portraitUrl, actionShotUrl };
}

/** Fetches a trainer's most recent media row of a given kind, if any. */
async function getLatestMedia(trainerId: number, kind: "portrait" | "actionShot") {
  const rows = await db
    .select()
    .from(trainerMediaTable)
    .where(and(eq(trainerMediaTable.trainerId, trainerId), eq(trainerMediaTable.kind, kind)))
    .orderBy(desc(trainerMediaTable.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/** Attaches each trainer's most recent portrait/action shot URLs (if any) as
 * `portraitUrl`/`actionShotUrl`. */
async function attachMedia<T extends { id: number }>(trainers: T[]) {
  if (trainers.length === 0) {
    return trainers.map((trainer) => ({ ...trainer, portraitUrl: null as string | null, actionShotUrl: null as string | null }));
  }

  const media = await db
    .select()
    .from(trainerMediaTable)
    .where(inArray(trainerMediaTable.trainerId, trainers.map((t) => t.id)))
    // Ascending order means later writes to the maps below overwrite earlier
    // ones, so each trainerId ends up mapped to its most recent media.
    .orderBy(asc(trainerMediaTable.createdAt));

  const latestPortraitByTrainerId = new Map<number, string>();
  const latestActionShotByTrainerId = new Map<number, string>();
  for (const row of media) {
    if (row.kind === "portrait") latestPortraitByTrainerId.set(row.trainerId, row.url);
    if (row.kind === "actionShot") latestActionShotByTrainerId.set(row.trainerId, row.url);
  }

  return trainers.map((trainer) => ({
    ...trainer,
    portraitUrl: latestPortraitByTrainerId.get(trainer.id) ?? null,
    actionShotUrl: latestActionShotByTrainerId.get(trainer.id) ?? null,
  }));
}

export const trainerModule = new Elysia({ prefix: "/trainers" })
  .post(
    "/",
    async ({ body, set }) => {
      const sports = body.sports
        .map((sport: string) => sport.trim())
        .filter((sport: string) => sport.length > 0);

      const world = await db
        .select()
        .from(worldTable)
        .where(eq(worldTable.id, body.worldId))
        .limit(1);

      if (world.length === 0) {
        set.status = 400;
        return { error: "Unknown worldId" };
      }

      const initialGreeting = await generateGreeting({
        personality: body.personality,
        trainerName: body.name,
        selectedSport: sports.length > 0 ? sports : undefined,
        userMessage: '',
      });

      const inserted = await db
        .insert(trainerTable)
        .values({
          name: body.name,
          personality: body.personality,
          sports,
          slug: body.slug,
          initialGreeting,
          worldId: body.worldId,
          tagline: body.tagline,
          portraitPrompt: body.portraitPrompt,
          actionShotPrompt: body.actionShotPrompt,
        })
        .returning();

      const trainer = inserted[0];
      const { portraitUrl, actionShotUrl } = await createTrainerMedia(trainer, body.portraitPrompt, body.actionShotPrompt);

      set.status = 201;
      return { ...trainer, portraitUrl, actionShotUrl };
    },
    {
      body: createTrainerInputSchema,
    }
  )
  .get("/", async () => {
    const trainers = await db.select().from(trainerTable);
    return attachMedia(trainers);
  })
  .get("/:slug", async ({ params, set }) => {
    const trainer = await db
      .select()
      .from(trainerTable)
      .where(eq(trainerTable.slug, params.slug))
      .limit(1);

    if (trainer.length === 0) {
      set.status = 404;
      return { error: "Trainer not found" };
    }

    const [withMedia] = await attachMedia(trainer);
    return withMedia;
  })
  .patch(
    "/:slug",
    async ({ params, body, set }) => {
      const updated = await db
        .update(trainerTable)
        .set(body)
        .where(eq(trainerTable.slug, params.slug))
        .returning();

      if (updated.length === 0) {
        set.status = 404;
        return { error: "Trainer not found" };
      }

      const [withMedia] = await attachMedia(updated);
      return withMedia;
    },
    {
      body: updateTrainerInputSchema,
    }
  )
  // Regenerates just the portrait from a (possibly new) prompt. Separate from
  // the PATCH above since this triggers slow ComfyUI generation rather than a
  // plain field update; the prompt actually used (custom or the auto-built
  // fallback) is persisted so the manage UI can keep showing it afterwards.
  // Note: this does NOT touch the action shot, even though the action shot
  // was originally generated using the old portrait as its IPAdapter
  // reference — re-rolling the action shot to match a new portrait is a
  // separate, explicit action via POST /:slug/regenerate-action-shot.
  .post(
    "/:slug/regenerate-portrait",
    async ({ params, body, set }) => {
      const trainer = await db
        .select()
        .from(trainerTable)
        .where(eq(trainerTable.slug, params.slug))
        .limit(1);

      if (trainer.length === 0) {
        set.status = 404;
        return { error: "Trainer not found" };
      }

      const portraitPrompt = body.portraitPrompt?.trim() || undefined;

      let portraitUrl: string;
      try {
        const result = await generateAndSavePortrait(trainer[0], portraitPrompt);
        portraitUrl = result.url;
      } catch (err) {
        console.error(`Failed to regenerate portrait for trainer ${params.slug}:`, err);
        set.status = 502;
        return { error: "Failed to generate portrait" };
      }

      const updated = await db
        .update(trainerTable)
        .set({ portraitPrompt: portraitPrompt ?? null })
        .where(eq(trainerTable.slug, params.slug))
        .returning();

      const [withMedia] = await attachMedia(updated);
      return { ...withMedia, portraitUrl };
    },
    {
      body: regeneratePortraitInputSchema,
    }
  )
  // Regenerates just the action shot from a (possibly new) prompt, reusing
  // the trainer's existing saved portrait as the IPAdapter identity
  // reference — the portrait itself is not regenerated. Fails with 400 if
  // the trainer has no portrait yet (regenerate-portrait must run first).
  .post(
    "/:slug/regenerate-action-shot",
    async ({ params, body, set }) => {
      const trainer = await db
        .select()
        .from(trainerTable)
        .where(eq(trainerTable.slug, params.slug))
        .limit(1);

      if (trainer.length === 0) {
        set.status = 404;
        return { error: "Trainer not found" };
      }

      const latestPortrait = await getLatestMedia(trainer[0].id, "portrait");
      if (!latestPortrait) {
        set.status = 400;
        return { error: "Trainer has no portrait yet; generate one first" };
      }

      let portraitBytes: Buffer;
      try {
        portraitBytes = await loadTrainerImage(latestPortrait.url);
      } catch (err) {
        console.error(`Failed to load saved portrait for trainer ${params.slug}:`, err);
        set.status = 500;
        return { error: "Failed to load existing portrait" };
      }

      const actionShotPrompt = body.actionShotPrompt?.trim() || undefined;

      let actionShotUrl: string;
      try {
        const result = await generateAndSaveActionShot(trainer[0], actionShotPrompt, portraitBytes);
        actionShotUrl = result.url;
      } catch (err) {
        console.error(`Failed to regenerate action shot for trainer ${params.slug}:`, err);
        set.status = 502;
        return { error: "Failed to generate action shot" };
      }

      const updated = await db
        .update(trainerTable)
        .set({ actionShotPrompt: actionShotPrompt ?? null })
        .where(eq(trainerTable.slug, params.slug))
        .returning();

      const [withMedia] = await attachMedia(updated);
      return { ...withMedia, actionShotUrl };
    },
    {
      body: regenerateActionShotInputSchema,
    }
  );
