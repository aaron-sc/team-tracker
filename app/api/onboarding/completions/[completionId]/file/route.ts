import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { serveUploadedFile } from "@/lib/storage/serve";

/** The frozen copy of the file someone actually signed. Downloadable by the person who signed it,
 *  or by an admin/owner with onboarding_manage — nobody else. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ completionId: string }> }) {
  const { completionId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const completion = await prisma.onboardingCompletion.findUnique({
    where: { id: completionId },
    include: { task: true },
  });
  if (!completion || !completion.signedFileUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.memberships.find((m) => m.orgId === completion.task.orgId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isOwnCompletion = completion.membershipId === membership.membershipId;
  const canManage = membership.permissions.includes(Permission.onboarding_manage);
  if (!isOwnCompletion && !canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return serveUploadedFile(completion.signedFileUrl, completion.signedFileName ?? "signed-document");
}
