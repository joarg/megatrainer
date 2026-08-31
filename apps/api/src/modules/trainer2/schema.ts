import { t } from "elysia";


export const createTrainerInputSchema = t.Object({
  name: t.String({ minLength: 1 }),
  personality: t.String({ minLength: 1 }),
  sports: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  slug: t.String({ minLength: 1 }),
});
