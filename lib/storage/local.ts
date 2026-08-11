import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Saves an uploaded image under public/uploads/<subdir>/ and returns its public URL path.
 * Local-disk storage — fine for a single-instance/self-hosted deploy, but a serverless host
 * (e.g. Vercel) has an ephemeral filesystem, so this must be swapped for object storage
 * (S3/R2/Vercel Blob) before deploying there. See README "Deploying to production".
 */
export async function saveUploadedImage(file: File, subdir: string): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError("Choose an image to upload.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("Image must be 2MB or smaller.");
  }
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Image must be PNG, JPEG, WebP, or SVG.");
  }

  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return `/uploads/${subdir}/${filename}`;
}

/** Best-effort delete of a previously uploaded file; never throws. */
export async function deleteUploadedFile(publicUrl: string | null | undefined) {
  if (!publicUrl || !publicUrl.startsWith("/uploads/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", publicUrl));
  } catch {
    // File may already be gone; nothing to do.
  }
}
