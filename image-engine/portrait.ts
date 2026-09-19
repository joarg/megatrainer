import { generateActionShot, generateImage } from "./services/comfyui.service.js";
import { ACTION_SHOT_NEGATIVE_PROMPT, PORTRAIT_CLOSEUP_NEGATIVE_PROMPT } from "./config.js";

type BaseInput = {
  trainerName: string;
  personality: string;
  sports?: string[];
};

export type PortraitInput = BaseInput & {
  /** Freeform user-authored description of the desired close-up portrait.
   * When given, this takes over the prompt entirely instead of the auto-built
   * one. Independent from ActionShotInput.actionShotPrompt below — the two
   * images have different framing needs, so a single shared prompt used to
   * fight itself (see PORTRAIT_FRAMING_PHRASE/SPORT_SIGNAL_PHRASE below). */
  portraitPrompt?: string;
};

export type ActionShotInput = BaseInput & {
  /** Freeform user-authored description of the desired action shot. See
   * PortraitInput.portraitPrompt above for why this is a separate field. */
  actionShotPrompt?: string;
};

const QUALITY_SUFFIX =
  "photorealistic, professional photograph, DSLR photo, natural skin texture, sharp focus, realistic lighting";

// Even with a custom portraitPrompt, the portrait must still be pushed toward
// a tight identity shot rather than whatever full pose/scene the prompt
// describes. Without this, a custom prompt describing a static pose (e.g.
// seated, kneeling) makes the portrait come out looking like a wide shot.
//
// IMPORTANT: this phrase must come BEFORE the custom prompt in the final
// string, not after. CLIP text encoders (used by ComfyUI's CLIPTextEncode)
// hard-truncate at ~77 tokens (~55-60 words) with no chunking, and
// user-authored prompts routinely run 100+ words — anything appended
// after a long custom prompt is silently dropped and has zero effect.
const PORTRAIT_FRAMING_PHRASE =
  "close-up head-and-shoulders portrait, face and upper torso only, nothing below the chest visible, looking at " +
  "camera, confident expression";

function buildPortraitPrompt({ trainerName, personality, sports, portraitPrompt }: PortraitInput): string {
  const customPrompt = portraitPrompt?.trim();
  if (customPrompt) {
    return [`close-up portrait of ${trainerName}`, PORTRAIT_FRAMING_PHRASE, customPrompt, QUALITY_SUFFIX].join(", ");
  }

  const sportsPhrase = sports && sports.length > 0 ? `, coaching ${sports.join(" and ")}` : "";

  return [
    `professional portrait of ${trainerName}, a personal sports trainer${sportsPhrase}`,
    `personality: ${personality}`,
    `upper body shot, confident pose, studio lighting, athletic wear, ${QUALITY_SUFFIX}`,
  ].join(", ");
}

// The action shot is the trainer's "at a glance" identity: it doubles as the
// cover image on the world-selection grid (see TrainerCard.svelte), where
// it's shown small and next to a dozen other trainers. Two things have to
// read instantly from that thumbnail alone: which sport this trainer coaches,
// and what kind of personality to expect. Both the sport-signaling and
// composition phrases below exist to force that legibility, independent of
// whichever sport/personality text a given trainer happens to have.
//
// As with PORTRAIT_FRAMING_PHRASE above, these must be placed BEFORE the
// custom prompt — see that comment for why (~77 token CLIP truncation).
const SPORT_SIGNAL_PHRASE =
  "caught mid-action in a signature, unmistakable movement for that sport, wearing sport-specific gear and using " +
  "sport-specific equipment, in a setting that unmistakably signals the sport (e.g. ring, court, track, trail, studio, weight rack)";

const COVER_COMPOSITION_PHRASE =
  "full-body vertical composition, subject centered and entirely within frame with headroom above so nothing is " +
  "cropped, simple uncluttered background that keeps focus on the subject, clear separation/rim lighting between " +
  "subject and background so the pose still reads clearly at a small thumbnail size";

function buildActionShotPrompt({ trainerName, personality, sports, actionShotPrompt }: ActionShotInput): string {
  const sportsPhrase = sports && sports.length > 0 ? sports.join(" and ") : "a workout";
  const customPrompt = actionShotPrompt?.trim();

  if (customPrompt) {
    return [
      `full-body action photo of ${trainerName}`,
      SPORT_SIGNAL_PHRASE,
      COVER_COMPOSITION_PHRASE,
      `doing ${sportsPhrase}`,
      customPrompt,
      QUALITY_SUFFIX,
    ].join(", ");
  }

  return [
    `full-body action photo of ${trainerName}, a personal sports trainer coaching ${sportsPhrase}`,
    SPORT_SIGNAL_PHRASE,
    `facial expression and body language clearly convey a personality that is: ${personality}`,
    COVER_COMPOSITION_PHRASE,
    QUALITY_SUFFIX,
  ].join(", ");
}

/**
 * Generates a single portrait image for a trainer. Mirrors generateGreeting
 * in coach-engine: called once, result persisted by the caller.
 */
export async function generateTrainerPortrait(input: PortraitInput): Promise<Buffer> {
  const prompt = buildPortraitPrompt(input);
  // Always reinforced with the closeup-specific negative prompt (not just the
  // custom-prompt path) since discouraging full-body/distant framing can
  // only help a portrait, never hurt one.
  return generateImage(prompt, PORTRAIT_CLOSEUP_NEGATIVE_PROMPT);
}

/**
 * Generates an action shot of a trainer doing their sport(s), using a
 * portrait as an IPAdapter reference so both images depict the same person.
 * The portrait can be freshly generated or an existing saved one — callers
 * that only want to re-roll the action shot can pass a previously saved
 * portrait's bytes back in without regenerating it.
 */
export async function generateTrainerActionShot(input: ActionShotInput, portraitBytes: Buffer): Promise<Buffer> {
  const prompt = buildActionShotPrompt(input);
  return generateActionShot(prompt, portraitBytes, ACTION_SHOT_NEGATIVE_PROMPT);
}

