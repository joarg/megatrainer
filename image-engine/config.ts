const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;

export const COMFYUI_ENDPOINT = env?.COMFYUI_ENDPOINT ?? "http://127.0.0.1:8188";

export const PORTRAIT_NEGATIVE_PROMPT =
  "illustration, painting, drawing, digital art, concept art, anime, cartoon, cgi, 3d render, airbrushed, plastic skin, doll-like, artstation, blurry, low quality, extra limbs, extra fingers, deformed, disfigured, watermark, text, logo, signature, cropped, out of frame";

// Custom portraitPrompts (see PortraitInput in portrait.ts) sometimes still
// describe a fuller pose/scene than intended for a close-up, and that vivid,
// specific text tends to out-compete the portrait's own "close-up
// head-and-shoulders" framing instruction even when it's placed first in the
// positive prompt. Suppressing full-body framing via the negative prompt
// instead is a much stronger, more reliable lever than trying to out-word it
// positively.
export const PORTRAIT_CLOSEUP_NEGATIVE_PROMPT =
  `${PORTRAIT_NEGATIVE_PROMPT}, full body, full body shot, wide shot, legs, feet, floor, standing pose, ` +
  "sitting pose, kneeling, crouching, distant subject, small subject in frame, whole body visible";

// The action shot doubles as the world-grid cover image (see TrainerCard.svelte),
// so beyond the general quality bar above it also needs to avoid anything that
// would make the sport/personality hard to read at a glance or crop badly in a
// tall card layout.
export const ACTION_SHOT_NEGATIVE_PROMPT =
  `${PORTRAIT_NEGATIVE_PROMPT}, cropped body, cropped limbs, cropped feet, cropped head, close-up, headshot, ` +
  "cluttered background, busy background, distracting background, multiple people, group photo, crowd, " +
  "face turned away, face obscured, motion blur on face, off-center composition, tilted horizon, " +
  "generic empty room with no sport context, static standing pose, plain neutral pose";

// The world cover image doubles as both a wide hero background (world detail
// page) and a card background (world-selection grid), both rendered with
// CSS `background-size: cover` — see WorldCard.svelte / worlds/[world]. A
// landscape aspect ratio reads better as a scene/environment shot than the
// square portrait resolution, and crops sensibly under `cover` either way.
export const WORLD_IMAGE_NEGATIVE_PROMPT =
  "illustration, painting, drawing, digital art, concept art, anime, cartoon, cgi, 3d render, blurry, low quality, " +
  "watermark, text, logo, signature, cropped, out of frame, empty, blank, plain background, close-up portrait, " +
  "selfie, tilted horizon";

export const WORLD_IMAGE_WIDTH = 1216;
export const WORLD_IMAGE_HEIGHT = 832;

export type PortraitModelProfile = {
  /** Single-file SDXL checkpoint name, downloaded by the `comfyui-model-init`
   * compose service into ComfyUI's models/checkpoints dir. */
  checkpoint: string;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  width: number;
  height: number;
  /** How long to wait for a single generation before giving up. Full-step
   * checkpoints take much longer per image than Lightning-distilled ones. */
  timeoutMs: number;
};

// Each profile pairs a checkpoint with the sampler settings it was actually
// tuned for — steps/CFG aren't interchangeable across checkpoints (see
// individual comments below). Select the active one via PORTRAIT_MODEL.
export const PORTRAIT_MODEL_PROFILES = {
  // Distilled for very few steps; fast (seconds per image) but a firm
  // quality ceiling. Good for smoke-testing the pipeline.
  lightning: {
    checkpoint: "DreamShaperXL_Lightning.safetensors",
    steps: 8,
    cfg: 2,
    sampler: "dpmpp_sde",
    scheduler: "karras",
    width: 1024,
    height: 1024,
    timeoutMs: 120_000,
  },
  // Full-step SDXL fine-tune geared toward photorealistic portraits.
  // Community-recommended settings: DPM++ 2M Karras, 30-40 steps, CFG 3-7.
  juggernaut: {
    checkpoint: "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors",
    steps: 35,
    cfg: 5,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 1024,
    height: 1024,
    timeoutMs: 300_000,
  },
  // Full-step SDXL fine-tune geared toward realistic skin/lighting detail.
  // Community-recommended settings: DPM++ 2M Karras, 25+ steps, CFG 1-7.
  realvisxl: {
    checkpoint: "RealVisXL_V4.0.safetensors",
    steps: 30,
    cfg: 4,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 1024,
    height: 1024,
    timeoutMs: 300_000,
  },
} as const satisfies Record<string, PortraitModelProfile>;

export type PortraitModel = keyof typeof PORTRAIT_MODEL_PROFILES;

function isPortraitModel(value: string | undefined): value is PortraitModel {
  return value !== undefined && value in PORTRAIT_MODEL_PROFILES;
}

const requestedModel = env?.PORTRAIT_MODEL;
export const PORTRAIT_MODEL: PortraitModel = isPortraitModel(requestedModel) ? requestedModel : "juggernaut";

export const PORTRAIT_POLL_INTERVAL_MS = 1_000;

// --- Action shot (IPAdapter-conditioned second image) ---
//
// The action shot reuses the trainer's portrait as an IPAdapter reference so
// both images depict the same person, just in a different pose/scene. This
// needs the ComfyUI_IPAdapter_plus custom node (baked into the comfyui image
// via docker/Dockerfile.comfyui) plus two extra model files downloaded by
// comfyui-model-init: a CLIP vision encoder and the IPAdapter weights
// themselves. See https://github.com/cubiq/ComfyUI_IPAdapter_plus for the
// full model list — "Plus Face" was chosen over the FaceID variants because
// it doesn't need the finicky insightface dependency, at the cost of a
// looser (but still strong) identity match.
export const IPADAPTER_CLIP_VISION_FILE = "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors";
export const IPADAPTER_MODEL_FILE = "ip-adapter-plus-face_sdxl_vit-h.safetensors";

// Moderate weight: strong enough to keep facial identity recognizable while
// still letting the text prompt drive a substantially different pose/scene
// than the portrait. Push higher if action shots start drifting off-model,
// lower if they look too much like the portrait's pose/background.
export const ACTION_SHOT_IPADAPTER_WEIGHT = 0.65;
export const ACTION_SHOT_WEIGHT_TYPE = "linear";

// Portrait aspect ratio (vs. the square portrait) — better suited to a
// full-body action pose. Still a native SDXL resolution.
export const ACTION_SHOT_WIDTH = 832;
export const ACTION_SHOT_HEIGHT = 1216;

