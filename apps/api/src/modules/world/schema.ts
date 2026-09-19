import { t } from "elysia";

export const createWorldInputSchema = t.Object({
  slug: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  tagline: t.String({ minLength: 1 }),
  description: t.String({ minLength: 1 }),
  accent: t.String({ minLength: 1 }),
  imageKey: t.Optional(t.String()),
  // Freeform description of the desired cover image. Optional: falls back to
  // a prompt built from name/tagline/description when omitted. See
  // image-engine/world.ts.
  imagePrompt: t.Optional(t.String()),
});

export const updateWorldInputSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  tagline: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String({ minLength: 1 })),
  accent: t.Optional(t.String({ minLength: 1 })),
  imageKey: t.Optional(t.String()),
});

// Regenerating the cover image triggers slow ComfyUI generation, so it's a
// separate endpoint/schema from the plain text edit above — same convention
// as trainer portrait/action-shot regeneration (see modules/trainer/schema.ts).
export const regenerateWorldImageInputSchema = t.Object({
  imagePrompt: t.Optional(t.String()),
});

