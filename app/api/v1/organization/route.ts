import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateApiRequest } from "@/lib/api/auth";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const org = await prisma.organization.findUnique({
    where: { id: auth.orgId },
    select: { id: true, name: true, slug: true, timezone: true },
  });

  return NextResponse.json({ organization: org });
}
