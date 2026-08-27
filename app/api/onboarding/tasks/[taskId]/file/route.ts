import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { serveUploadedFile } from "@/lib/storage/serve";

/** The document attached to a task — any org member can fetch it, since they need to be able to
 *  review it in order to complete/sign the task in the first place. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task || !task.fileUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = session.memberships.find((m) => m.orgId === task.orgId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return serveUploadedFile(task.fileUrl, task.fileName ?? "document");
}
