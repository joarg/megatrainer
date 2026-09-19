import { t } from "elysia";


export const createTrainerInputSchema = t.Object({
  name: t.String({ minLength: 1 }),
  personality: t.String({ minLength: 1 }),
  sports: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  slug: t.String({ minLength: 1 }),
  worldId: t.Number(),
  tagline: t.String({ minLength: 1 }),
  // Freeform descriptions of the desired portrait/action shot. Each is
  // optional: falls back to a prompt built from name/personality/sports when
  // omitted. Kept separate since the two images have different framing needs
  // (see image-engine/portrait.ts).
  portraitPrompt: t.Optional(t.String()),
  actionShotPrompt: t.Optional(t.String()),
});

// Text-only edits for an existing trainer. Sports/world/slug intentionally
// excluded here: changing them has wider implications (onboarding sessions,
// media filenames) that a simple text edit form shouldn't trigger.
export const updateTrainerInputSchema = t.Object({
  tagline: t.Optional(t.String({ minLength: 1 })),
  initialGreeting: t.Optional(t.String({ minLength: 1 })),
  personality: t.Optional(t.String({ minLength: 1 })),
});

// Regenerating images is a separate action from the text edit above since it
// triggers slow ComfyUI generation. Portrait and action shot each get their
// own endpoint/schema so they can be re-rolled independently — see
// modules/trainer/index.ts.
export const regeneratePortraitInputSchema = t.Object({
  portraitPrompt: t.Optional(t.String()),
});

export const regenerateActionShotInputSchema = t.Object({
  actionShotPrompt: t.Optional(t.String()),
});
