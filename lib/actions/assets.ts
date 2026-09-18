"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit/log";
import { assetSchema } from "@/lib/validations/assets";
import { Permission } from "@/lib/generated/prisma/enums";
import { saveUploadedAssetFile, deleteUploadedFile, UploadError } from "@/lib/storage/local";
import type { ActionState } from "@/lib/actions/types";

function parseAssetForm(formData: FormData) {
  return assetSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    // The dialog's "No team" Select option uses the sentinel "none" — Radix Select disallows an
    // actual empty-string value — so that has to be treated as unset here.
    teamId: String(formData.get("teamId") ?? "") === "none" ? "" : formData.get("teamId"),
    notes: formData.get("notes") ?? "",
  });
}

export async function createAssetAction(orgSlug: string, orgId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.asset_manage);
  const parsed = parseAssetForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const file = formData.get("file");
  let uploaded: { url: string; fileName: string; fileSize: number; mimeType: string };
  try {
    uploaded = await saveUploadedAssetFile(file as File, "assets");
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Could not upload file." };
  }

  const asset = await prisma.asset.create({
    data: {
      orgId,
      teamId: parsed.data.teamId || null,
      title: parsed.data.title,
      category: parsed.data.category,
      fileUrl: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      mimeType: uploaded.mimeType,
      notes: parsed.data.notes || null,
      uploadedById: actor.membershipId,
    },
  });

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "asset.created",
    targetType: "Asset",
    targetId: asset.id,
    metadata: { title: parsed.data.title, category: parsed.data.category },
  });

  revalidatePath(`/${orgSlug}/assets`);
  return { success: "Uploaded." };
}

export async function updateAssetAction(
  orgSlug: string,
  orgId: string,
  assetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.asset_manage);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.orgId !== orgId) return { error: "Not found." };

  const parsed = parseAssetForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const file = formData.get("file");
  let replacement: { url: string; fileName: string; fileSize: number; mimeType: string } | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      replacement = await saveUploadedAssetFile(file, "assets");
    } catch (err) {
      return { error: err instanceof UploadError ? err.message : "Could not upload file." };
    }
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      teamId: parsed.data.teamId || null,
      title: parsed.data.title,
      category: parsed.data.category,
      notes: parsed.data.notes || null,
      ...(replacement
        ? { fileUrl: replacement.url, fileName: replacement.fileName, fileSize: replacement.fileSize, mimeType: replacement.mimeType }
        : {}),
    },
  });
  if (replacement) await deleteUploadedFile(asset.fileUrl);

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "asset.updated",
    targetType: "Asset",
    targetId: assetId,
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/${orgSlug}/assets`);
  return { success: "Updated." };
}

export async function deleteAssetAction(orgSlug: string, orgId: string, assetId: string): Promise<ActionState> {
  const { membership: actor } = await requirePermission(orgId, Permission.asset_manage);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.orgId !== orgId) return { error: "Not found." };

  await prisma.asset.delete({ where: { id: assetId } });
  await deleteUploadedFile(asset.fileUrl);

  await logAudit({
    orgId,
    actorMembershipId: actor.membershipId,
    action: "asset.deleted",
    targetType: "Asset",
    targetId: assetId,
    metadata: { title: asset.title },
  });

  revalidatePath(`/${orgSlug}/assets`);
  return { success: "Removed." };
}
