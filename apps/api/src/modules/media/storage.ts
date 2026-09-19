import { mkdir } from "node:fs/promises";
import path from "node:path";

// Where generated media lives on disk. In docker-compose this is a named
// volume (/app/media) so files survive container restarts/rebuilds; locally
// it defaults to apps/api/media (bun run dev's cwd is apps/api).
export const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "media");

const TRAINERS_SUBDIR = "trainers";
const WORLDS_SUBDIR = "worlds";

/**
 * Persists a generated image for a trainer and returns the public URL the
 * API will serve it at (see the `/media/*` route in index.ts).
 */
export async function saveTrainerImage(slug: string, kind: string, bytes: Buffer): Promise<string> {
  const dir = path.join(MEDIA_DIR, TRAINERS_SUBDIR);
  await mkdir(dir, { recursive: true });

  const filename = `${slug}-${kind}-${Date.now()}.png`;
  await Bun.write(path.join(dir, filename), bytes);

  return `/media/${TRAINERS_SUBDIR}/${filename}`;
}

/**
 * Persists a generated cover image for a world and returns the public URL
 * the API will serve it at. Mirrors saveTrainerImage above.
 */
export async function saveWorldImage(slug: string, bytes: Buffer): Promise<string> {
  const dir = path.join(MEDIA_DIR, WORLDS_SUBDIR);
  await mkdir(dir, { recursive: true });

  const filename = `${slug}-${Date.now()}.png`;
  await Bun.write(path.join(dir, filename), bytes);

  return `/media/${WORLDS_SUBDIR}/${filename}`;
}

/**
 * Resolves a public media URL (as returned by saveTrainerImage) back to an
 * absolute path on disk, for the static-serving route.
 */
export function resolveMediaPath(urlPath: string): string {
  // urlPath comes in as e.g. "trainers/joey-portrait-123.png" (the part of
  // /media/* captured by the wildcard route).
  return path.join(MEDIA_DIR, urlPath);
}

/**
 * Reads a previously saved trainer image back off disk, given the public URL
 * saveTrainerImage returned for it (e.g. "/media/trainers/joey-portrait-123.png").
 * Used to reuse an existing portrait as the IPAdapter reference when
 * regenerating only the action shot, without regenerating the portrait too.
 */
export async function loadTrainerImage(url: string): Promise<Buffer> {
  const MEDIA_URL_PREFIX = "/media/";
  const relativePath = url.startsWith(MEDIA_URL_PREFIX) ? url.slice(MEDIA_URL_PREFIX.length) : url;
  const absolutePath = resolveMediaPath(relativePath);

  const file = Bun.file(absolutePath);
  if (!(await file.exists())) {
    throw new Error(`Media file not found on disk: ${url}`);
  }

  return Buffer.from(await file.arrayBuffer());
}
