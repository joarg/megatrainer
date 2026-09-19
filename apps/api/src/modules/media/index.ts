import { Elysia } from "elysia";
import path from "node:path";
import { MEDIA_DIR, resolveMediaPath } from "./storage";

// Serves generated media (currently just trainer portraits) straight off
// disk. Simple wildcard route — no need for a static-file plugin for a
// single directory of AI-generated assets.
export const mediaModule = new Elysia({ prefix: "/media" }).get(
  "/*",
  async ({ params, set }) => {
    const requested = params["*"];
    const absolutePath = resolveMediaPath(requested);

    // Guard against path traversal escaping MEDIA_DIR.
    if (!absolutePath.startsWith(path.resolve(MEDIA_DIR))) {
      set.status = 400;
      return { error: "Invalid media path" };
    }

    const file = Bun.file(absolutePath);
    if (!(await file.exists())) {
      set.status = 404;
      return { error: "Not found" };
    }

    return file;
  }
);
