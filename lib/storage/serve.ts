import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

function contentDisposition(downloadName: string): string {
  const ascii = downloadName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(downloadName);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Streams a previously uploaded document from disk as a forced download, given an already-
 *  authorized caller. Callers (API routes) are responsible for the permission check — this only
 *  handles safely reading the file and setting response headers. */
export async function serveUploadedFile(publicUrl: string, downloadName: string): Promise<NextResponse> {
  if (!publicUrl.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(publicUrl).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", publicUrl);
  if (!filePath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(downloadName),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
