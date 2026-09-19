import { generateImage } from "./services/comfyui.service.js";
import { WORLD_IMAGE_HEIGHT, WORLD_IMAGE_NEGATIVE_PROMPT, WORLD_IMAGE_WIDTH } from "./config.js";

export type WorldImageInput = {
  worldName: string;
  tagline: string;
  description: string;
  /** Freeform user-authored description of the desired cover image. When
   * given, this takes over the prompt entirely instead of the auto-built
   * one — same convention as PortraitInput.portraitPrompt in portrait.ts. */
  imagePrompt?: string;
};

const QUALITY_SUFFIX =
  "photorealistic, professional photograph, DSLR photo, cinematic lighting, sharp focus, rich detail, realistic";

// The cover image is a wide environment/establishing shot for the world as a
// whole (e.g. a boxing gym, a running trail at dawn), not a picture of any
// one person — that's what trainer portraits/action shots are for. Framing
// this explicitly stops the model from defaulting to a single close-up
// subject, which reads poorly once cropped under CSS `background-size: cover`
// across both a wide hero banner and a squarer card (see WorldCard.svelte).
const WORLD_FRAMING_PHRASE =
  "wide environment establishing shot, immersive scene, no single subject in close-up, dynamic composition, " +
  "cinematic depth";

function buildWorldImagePrompt({ worldName, tagline, description, imagePrompt }: WorldImageInput): string {
  const customPrompt = imagePrompt?.trim();
  if (customPrompt) {
    return [`cover image for "${worldName}"`, WORLD_FRAMING_PHRASE, customPrompt, QUALITY_SUFFIX].join(", ");
  }

  return [
    `cover image for a themed sports-training world called "${worldName}"`,
    `theme: ${tagline}`,
    description,
    WORLD_FRAMING_PHRASE,
    QUALITY_SUFFIX,
  ].join(", ");
}

/**
 * Generates a single cover/hero image for a world. Mirrors
 * generateTrainerPortrait in portrait.ts: called once per create/regenerate,
 * result persisted by the caller.
 */
export async function generateWorldImage(input: WorldImageInput): Promise<Buffer> {
  const prompt = buildWorldImagePrompt(input);
  return generateImage(prompt, WORLD_IMAGE_NEGATIVE_PROMPT, WORLD_IMAGE_WIDTH, WORLD_IMAGE_HEIGHT);
}
