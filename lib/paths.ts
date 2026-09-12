import fs from "fs";
import os from "os";
import path from "path";

export function uploadsRoot() {
  const root = process.env.VERCEL
    ? path.join(os.tmpdir(), "docbrief-uploads")
    : path.join(process.cwd(), "uploads");
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

export function projectDir(projectId: string) {
  const dir = path.join(uploadsRoot(), projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Public URL path for a file under uploads/<projectId>/… (local / auth proxy). */
export function publicUploadUrl(projectId: string, filename: string) {
  return `/api/projects/${projectId}/download?file=${encodeURIComponent(filename)}`;
}
