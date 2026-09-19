import { randomUUID } from "node:crypto";
import {
  ACTION_SHOT_HEIGHT,
  ACTION_SHOT_IPADAPTER_WEIGHT,
  ACTION_SHOT_WEIGHT_TYPE,
  ACTION_SHOT_WIDTH,
  COMFYUI_ENDPOINT,
  IPADAPTER_CLIP_VISION_FILE,
  IPADAPTER_MODEL_FILE,
  PORTRAIT_MODEL,
  PORTRAIT_MODEL_PROFILES,
  PORTRAIT_NEGATIVE_PROMPT,
  PORTRAIT_POLL_INTERVAL_MS,
} from "../config.js";

// The checkpoint + sampler settings to generate with, chosen at startup via
// the PORTRAIT_MODEL env var (see config.ts for available profiles).
const activeProfile = PORTRAIT_MODEL_PROFILES[PORTRAIT_MODEL];

type WorkflowGraph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

// Both workflows below write to this SaveImage node id, so the shared
// submit/wait/fetch helpers don't need to know which graph produced them.
const SAVE_IMAGE_NODE_ID = "9";

// Minimal ComfyUI "workflow API" graph: checkpoint -> positive/negative CLIP
// encode -> KSampler -> VAE decode -> save. Node ids are arbitrary strings,
// only the wiring (via ["<nodeId>", <outputIndex>]) matters to ComfyUI.
// width/height default to the active profile's (square, tuned for
// portraits) but can be overridden — e.g. for the world cover image's
// landscape aspect ratio (see WORLD_IMAGE_WIDTH/HEIGHT in config.ts).
function buildTxt2ImgWorkflow(
  prompt: string,
  negativePrompt: string,
  seed: number,
  width: number = activeProfile.width,
  height: number = activeProfile.height
): WorkflowGraph {
  return {
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: activeProfile.checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: prompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: negativePrompt },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
        seed,
        steps: activeProfile.steps,
        cfg: activeProfile.cfg,
        sampler_name: activeProfile.sampler,
        scheduler: activeProfile.scheduler,
        denoise: 1,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    [SAVE_IMAGE_NODE_ID]: {
      class_type: "SaveImage",
      inputs: { images: ["8", 0], filename_prefix: "megatrainer" },
    },
  };
}

// Same txt2img chain as above, but the checkpoint's model is first patched
// by IPAdapterAdvanced using the trainer's portrait as a reference image, so
// the action shot's face resembles the portrait despite the very different
// pose/scene the prompt asks for. See config.ts for why "Plus Face" was
// chosen over the FaceID IPAdapter variants.
function buildActionShotWorkflow(
  prompt: string,
  negativePrompt: string,
  seed: number,
  referenceImageName: string
): WorkflowGraph {
  return {
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: activeProfile.checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: ACTION_SHOT_WIDTH, height: ACTION_SHOT_HEIGHT, batch_size: 1 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: prompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: negativePrompt },
    },
    "10": {
      class_type: "CLIPVisionLoader",
      inputs: { clip_name: IPADAPTER_CLIP_VISION_FILE },
    },
    "11": {
      class_type: "IPAdapterModelLoader",
      inputs: { ipadapter_file: IPADAPTER_MODEL_FILE },
    },
    "12": {
      class_type: "LoadImage",
      inputs: { image: referenceImageName },
    },
    "13": {
      class_type: "IPAdapterAdvanced",
      inputs: {
        model: ["4", 0],
        ipadapter: ["11", 0],
        image: ["12", 0],
        clip_vision: ["10", 0],
        weight: ACTION_SHOT_IPADAPTER_WEIGHT,
        weight_type: ACTION_SHOT_WEIGHT_TYPE,
        combine_embeds: "concat",
        start_at: 0,
        end_at: 1,
        embeds_scaling: "V only",
      },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        model: ["13", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
        seed,
        steps: activeProfile.steps,
        cfg: activeProfile.cfg,
        sampler_name: activeProfile.sampler,
        scheduler: activeProfile.scheduler,
        denoise: 1,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    [SAVE_IMAGE_NODE_ID]: {
      class_type: "SaveImage",
      inputs: { images: ["8", 0], filename_prefix: "megatrainer_action" },
    },
  };
}

type HistoryResponse = Record<
  string,
  {
    outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
    status?: { completed?: boolean; status_str?: string };
  }
>;

async function submitWorkflow(graph: WorkflowGraph) {
  const response = await fetch(`${COMFYUI_ENDPOINT}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: graph,
      client_id: randomUUID(),
    }),
  });

  if (!response.ok) {
    throw new Error(`ComfyUI rejected prompt: ${response.status} ${await response.text()}`);
  }

  const { prompt_id: promptId } = (await response.json()) as { prompt_id: string };
  return promptId;
}

async function waitForImage(promptId: string) {
  const deadline = Date.now() + activeProfile.timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${COMFYUI_ENDPOINT}/history/${promptId}`);
    if (response.ok) {
      const history = (await response.json()) as HistoryResponse;
      const entry = history[promptId];
      const images = entry?.outputs?.[SAVE_IMAGE_NODE_ID]?.images;
      if (images && images.length > 0) {
        return images[0];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, PORTRAIT_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for ComfyUI to finish prompt ${promptId}`);
}

async function fetchGeneratedImage(image: { filename: string; subfolder: string; type: string }) {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder,
    type: image.type,
  });
  const response = await fetch(`${COMFYUI_ENDPOINT}/view?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Uploads an image to ComfyUI's input directory so a LoadImage node can
 * reference it by name. Used to feed a trainer's portrait into the action
 * shot workflow as an IPAdapter reference.
 */
async function uploadReferenceImage(bytes: Buffer): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)], { type: "image/png" }), `reference-${randomUUID()}.png`);
  form.append("overwrite", "true");

  const response = await fetch(`${COMFYUI_ENDPOINT}/upload/image`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload reference image to ComfyUI: ${response.status} ${await response.text()}`);
  }

  const { name } = (await response.json()) as { name: string };
  return name;
}

/**
 * Runs a single txt2img generation against the local ComfyUI instance and
 * returns the resulting PNG bytes. width/height default to the active
 * profile's square resolution (see buildTxt2ImgWorkflow) but can be
 * overridden, e.g. for the world cover image's landscape aspect ratio.
 */
export async function generateImage(
  prompt: string,
  negativePrompt = PORTRAIT_NEGATIVE_PROMPT,
  width?: number,
  height?: number
) {
  const seed = Math.floor(Math.random() * 2 ** 32);
  const promptId = await submitWorkflow(buildTxt2ImgWorkflow(prompt, negativePrompt, seed, width, height));
  const image = await waitForImage(promptId);
  return fetchGeneratedImage(image);
}

/**
 * Generates an image conditioned on a reference photo via IPAdapter, so the
 * result resembles the same person/subject as the reference while following
 * a new prompt (e.g. a different pose or scene). Used to generate a
 * trainer's action shot from their already-generated portrait.
 */
export async function generateActionShot(
  prompt: string,
  referenceImageBytes: Buffer,
  negativePrompt = PORTRAIT_NEGATIVE_PROMPT
) {
  const referenceImageName = await uploadReferenceImage(referenceImageBytes);
  const seed = Math.floor(Math.random() * 2 ** 32);
  const promptId = await submitWorkflow(
    buildActionShotWorkflow(prompt, negativePrompt, seed, referenceImageName)
  );
  const image = await waitForImage(promptId);
  return fetchGeneratedImage(image);
}

