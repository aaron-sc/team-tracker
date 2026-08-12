import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Serves uploaded files from disk on every request, instead of relying on
 * Next's static public/ serving — which snapshots the directory at server
 * startup and never picks up files written while the server is running
 * (uploads work, but stay 404 until the next restart). Filenames are
 * content-addressed UUIDs assigned once at upload time and never reused, so
 * this is safe to cache aggressively.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  if (segments.length === 0 || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_ROOT, ...segments);
  if (!filePath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
