import { resolve } from "node:path";

/**
 * The directory uploads are written to and served from. Resolved, not joined:
 * `join(cwd, "/abs/uploads")` glues an absolute path under the working
 * directory, and every image 404s.
 */
export function uploadRoot(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): string {
  return resolve(cwd, env.UPLOAD_DIR ?? "./uploads");
}
