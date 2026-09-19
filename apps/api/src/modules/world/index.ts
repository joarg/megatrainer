import { Elysia } from "elysia";
import { generateWorldImage } from "../../../../../image-engine/index.js";
import { worldMediaTable, worldTable } from "../../schema";
import { db } from "../../db";
import { asc, eq, inArray } from "drizzle-orm";
import {
  createWorldInputSchema,
  regenerateWorldImageInputSchema,
  updateWorldInputSchema,
} from "./schema";
import { saveWorldImage } from "../media/storage";

/**
 * Generates a cover image for a world, saves it to disk, and records the
 * worldMedia row.
 */
async function generateAndSaveWorldImage(world: typeof worldTable.$inferSelect, imagePrompt: string | undefined) {
  const bytes = await generateWorldImage({
    worldName: world.name,
    tagline: world.tagline,
    description: world.description,
    imagePrompt,
  });
  const url = await saveWorldImage(world.slug, bytes);
  await db.insert(worldMediaTable).values({ worldId: world.id, url });
  return { url };
}

/**
 * Generates a cover image for a freshly created world. Best-effort: image
 * generation depends on a local ComfyUI instance that may be slow to warm up
 * or briefly unavailable, so failures here must not break world creation —
 * they're logged and skipped, same convention as trainer portrait/action
 * shot generation (see modules/trainer/index.ts).
 */
async function createWorldMedia(world: typeof worldTable.$inferSelect, imagePrompt: string | undefined) {
  try {
    const result = await generateAndSaveWorldImage(world, imagePrompt);
    return { imageUrl: result.url };
  } catch (err) {
    console.error(`Failed to generate cover image for world ${world.slug}:`, err);
    return { imageUrl: null };
  }
}

/** Attaches each world's most recent generated cover image URL (if any) as
 * `imageUrl`. */
async function attachMedia<T extends { id: number }>(worlds: T[]) {
  if (worlds.length === 0) {
    return worlds.map((world) => ({ ...world, imageUrl: null as string | null }));
  }

  const media = await db
    .select()
    .from(worldMediaTable)
    .where(inArray(worldMediaTable.worldId, worlds.map((w) => w.id)))
    // Ascending order means later writes to the map below overwrite earlier
    // ones, so each worldId ends up mapped to its most recent media.
    .orderBy(asc(worldMediaTable.createdAt));

  const latestImageByWorldId = new Map<number, string>();
  for (const row of media) {
    latestImageByWorldId.set(row.worldId, row.url);
  }

  return worlds.map((world) => ({
    ...world,
    imageUrl: latestImageByWorldId.get(world.id) ?? null,
  }));
}

export const worldModule = new Elysia({ prefix: "/worlds" })
  .post(
    "/",
    async ({ body, set }) => {
      const existing = await db
        .select()
        .from(worldTable)
        .where(eq(worldTable.slug, body.slug))
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;
        return { error: "A world with this slug already exists" };
      }

      const inserted = await db.insert(worldTable).values(body).returning();

      const world = inserted[0];
      const { imageUrl } = await createWorldMedia(world, body.imagePrompt);

      set.status = 201;
      return { ...world, imageUrl };
    },
    {
      body: createWorldInputSchema,
    }
  )
  .get("/", async () => {
    const worlds = await db.select().from(worldTable);
    return attachMedia(worlds);
  })
  .get("/:slug", async ({ params, set }) => {
    const world = await db
      .select()
      .from(worldTable)
      .where(eq(worldTable.slug, params.slug))
      .limit(1);

    if (world.length === 0) {
      set.status = 404;
      return { error: "World not found" };
    }

    const [withMedia] = await attachMedia(world);
    return withMedia;
  })
  .patch(
    "/:slug",
    async ({ params, body, set }) => {
      const updated = await db
        .update(worldTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(worldTable.slug, params.slug))
        .returning();

      if (updated.length === 0) {
        set.status = 404;
        return { error: "World not found" };
      }

      const [withMedia] = await attachMedia(updated);
      return withMedia;
    },
    {
      body: updateWorldInputSchema,
    }
  )
  // Regenerates just the cover image from a (possibly new) prompt. Separate
  // from the PATCH above since this triggers slow ComfyUI generation rather
  // than a plain field update; the prompt actually used (custom or the
  // auto-built fallback) is persisted so the manage UI can keep showing it
  // afterwards. Mirrors POST /trainers/:slug/regenerate-portrait.
  .post(
    "/:slug/regenerate-image",
    async ({ params, body, set }) => {
      const world = await db
        .select()
        .from(worldTable)
        .where(eq(worldTable.slug, params.slug))
        .limit(1);

      if (world.length === 0) {
        set.status = 404;
        return { error: "World not found" };
      }

      const imagePrompt = body.imagePrompt?.trim() || undefined;

      let imageUrl: string;
      try {
        const result = await generateAndSaveWorldImage(world[0], imagePrompt);
        imageUrl = result.url;
      } catch (err) {
        console.error(`Failed to regenerate cover image for world ${params.slug}:`, err);
        set.status = 502;
        return { error: "Failed to generate cover image" };
      }

      const updated = await db
        .update(worldTable)
        .set({ imagePrompt: imagePrompt ?? null, updatedAt: new Date() })
        .where(eq(worldTable.slug, params.slug))
        .returning();

      const [withMedia] = await attachMedia(updated);
      return { ...withMedia, imageUrl };
    },
    {
      body: regenerateWorldImageInputSchema,
    }
  )
  // Trainers referencing this world have worldId set to NULL automatically
  // (ON DELETE SET NULL on the FK), so deleting a world never orphans rows or
  // needs a manual cleanup step here.
  .delete("/:slug", async ({ params, set }) => {
    const deleted = await db
      .delete(worldTable)
      .where(eq(worldTable.slug, params.slug))
      .returning();

    if (deleted.length === 0) {
      set.status = 404;
      return { error: "World not found" };
    }

    return { success: true };
  });
