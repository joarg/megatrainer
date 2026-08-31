import { Elysia, t } from "elysia";
import { db } from "../../db";
import { trainerTable } from "../../schema";
import { eq } from "drizzle-orm";
import { onboardingModule } from "./onboarding";
import { generateGreeting } from "../../../../../coach-engine/index.js";

const trainerInsertSchema = t.Object({
  name: t.String({ minLength: 1 }),
  personality: t.String({ minLength: 1 }),
  sports: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  slug: t.String({ minLength: 1 }),
});

const trainerSlugParamsSchema = t.Object({
  slug: t.String({ minLength: 1 }),
});

export const trainerModule = new Elysia({ prefix: "/trainers" })
  .post(
    "/",
    async ({ body, set }) => {
      const sports = body.sports
        .map((sport) => sport.trim())
        .filter((sport) => sport.length > 0);

      const initialGreeting = await generateGreeting({
        personality: body.personality,
        trainerName: body.name,
        selectedSport: sports.length > 0 ? sports.join(', ') : undefined,
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
      body: trainerInsertSchema,
    }
  )
  .get("/", async () => {
    return db.select().from(trainerTable);
  })
  
  .get(
    "/:slug",
    async ({ params, set }) => {
      const rows = await db
        .select()
        .from(trainerTable)
        .where(eq(trainerTable.slug, params.slug));

      const trainer = rows[0];
      if (!trainer) {
        set.status = 404;
        return { message: "Trainer not found, sorry" };
      }

      return trainer;
    }
    
  )
  .use(onboardingModule);
