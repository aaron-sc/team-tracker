import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

/**
 * For page-level gating: redirects to the onboarding checklist if the member
 * has any active, required task they haven't completed yet. An org with zero
 * onboarding tasks defined never gates anyone.
 */
export async function requireOnboardingCompletePage(orgSlug: string, orgId: string, membershipId: string) {
  const incompleteCount = await prisma.onboardingTask.count({
    where: {
      orgId,
      active: true,
      required: true,
      completions: { none: { membershipId } },
    },
  });
  if (incompleteCount > 0) {
    redirect(`/${orgSlug}/onboarding`);
  }
}
