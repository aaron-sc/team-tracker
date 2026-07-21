"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { venueSchema } from "@/lib/validations/venue";
import { Permission } from "@/lib/generated/prisma/enums";
import type { ActionState } from "@/lib/actions/types";

function parseVenueForm(formData: FormData) {
  return venueSchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? "",
    city: formData.get("city"),
    state: formData.get("state") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    country: formData.get("country") || "USA",
    capacity: formData.get("capacity") || "",
    contactName: formData.get("contactName") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    notes: formData.get("notes") ?? "",
    timezone: formData.get("timezone"),
  });
}

export async function createVenueAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.venue_create);

  const parsed = parseVenueForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const venue = await prisma.venue.create({
    data: {
      orgId,
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || null,
      city: parsed.data.city,
      state: parsed.data.state || null,
      postalCode: parsed.data.postalCode || null,
      country: parsed.data.country,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      notes: parsed.data.notes || null,
      timezone: parsed.data.timezone,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "venue.created",
    targetType: "Venue",
    targetId: venue.id,
    metadata: { name: venue.name },
  });

  redirect(`/${orgSlug}/venues`);
}

export async function updateVenueAction(
  orgSlug: string,
  orgId: string,
  venueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission(orgId, Permission.venue_edit);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue || venue.orgId !== orgId) return { error: "Venue not found." };

  const parsed = parseVenueForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      name: parsed.data.name,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || null,
      city: parsed.data.city,
      state: parsed.data.state || null,
      postalCode: parsed.data.postalCode || null,
      country: parsed.data.country,
      capacity: parsed.data.capacity ? Number(parsed.data.capacity) : null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      notes: parsed.data.notes || null,
      timezone: parsed.data.timezone,
    },
  });

  revalidatePath(`/${orgSlug}/venues`);
  redirect(`/${orgSlug}/venues`);
}

export async function deleteVenueAction(orgSlug: string, orgId: string, venueId: string): Promise<ActionState> {
  const { membership } = await requirePermission(orgId, Permission.venue_delete);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue || venue.orgId !== orgId) return { error: "Venue not found." };

  try {
    await prisma.venue.delete({ where: { id: venueId } });
  } catch {
    return { error: "This venue is used by a scheduled match or practice and can't be deleted." };
  }

  await logAudit({
    orgId,
    actorMembershipId: membership.membershipId,
    action: "venue.deleted",
    targetType: "Venue",
    targetId: venueId,
    metadata: { name: venue.name },
  });

  revalidatePath(`/${orgSlug}/venues`);
}
