import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyInternalApiSecret } from "@/lib/auth/internal-api";
import { checkRateLimit } from "@/lib/utils/rate-limit";

/**
 * Server-to-server only — lets the admin console (admin.esports-tools.com) read, push, or clear
 * the platform-wide banner shown across every org in Formation. Same bearer-secret guard as the
 * other internal routes.
 */
export async function GET(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit("internal_admin_broadcast", 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const announcement = await prisma.platformAnnouncement.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(announcement ? { id: announcement.id, message: announcement.message, createdAt: announcement.createdAt } : null);
}

export async function POST(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit("internal_admin_broadcast", 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "message must be 1-2000 characters" }, { status: 400 });
  }

  await prisma.platformAnnouncement.updateMany({ where: { active: true }, data: { active: false } });
  const announcement = await prisma.platformAnnouncement.create({ data: { message } });

  return NextResponse.json({ id: announcement.id, message: announcement.message, createdAt: announcement.createdAt });
}

/** Clears the active banner, if any. */
export async function DELETE(request: NextRequest) {
  if (!verifyInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit("internal_admin_broadcast", 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  await prisma.platformAnnouncement.updateMany({ where: { active: true }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
