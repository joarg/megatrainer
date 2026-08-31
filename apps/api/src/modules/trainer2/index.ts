import { Elysia, t } from "elysia";
import { generateGreeting } from "../../../../../coach-engine/index.js";
import { trainerTable } from "../../schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { createTrainerInputSchema } from "./schema";

export const trainerModule = new Elysia({ prefix: "/trainers" })
  .post(
    "/",
    async ({ body, set }) => {
      const sports = body.sports
        .map((sport: string) => sport.trim())
        .filter((sport: string) => sport.length > 0);

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
        })
        .returning();

      set.status = 201;
      return inserted[0];
    },
    {
      body: createTrainerInputSchema,
    }
  )
  .get("/", async () => {
    return db.select().from(trainerTable);
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

    return trainer[0];
  });
  
