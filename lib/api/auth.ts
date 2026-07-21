import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Authenticates an external API request (e.g. from Atlas) via
 * `Authorization: Bearer <organization apiKey>`. There's one key per org —
 * simple by design, matching the scope of a single-integration MVP. Rotate
 * via Settings → Integrations if a key leaks.
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<{ orgId: string; orgSlug: string; orgName: string } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const key = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

  if (!key) {
    return NextResponse.json({ error: "Missing Authorization: Bearer <api key> header." }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { apiKey: key },
    select: { id: true, slug: true, name: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  return { orgId: org.id, orgSlug: org.slug, orgName: org.name };
}
