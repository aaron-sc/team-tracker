"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { validateAuthorizeParams, type ValidAuthorizeRequest } from "@/lib/oauth/validate";
import { issueAuthorizationCode, recordGrant } from "@/lib/oauth/service";

/**
 * Re-validates the original /oauth/authorize query string (carried through the consent form as a
 * single hidden field) through the exact same check the GET route itself uses, rather than trusting
 * whatever individual fields a submitted form happens to contain.
 */
async function requireValidatedRequest(formData: FormData): Promise<ValidAuthorizeRequest> {
  const search = formData.get("search");
  if (typeof search !== "string") throw new Error("Missing OAuth request.");

  const result = await validateAuthorizeParams(new URLSearchParams(search));
  if (result.ok) return result.request;

  if (!result.redirectable) throw new Error("Invalid OAuth request.");
  const url = new URL(result.redirectUri);
  url.searchParams.set("error", result.error);
  if (result.state) url.searchParams.set("state", result.state);
  redirect(url.toString());
}

export async function approveConsentAction(formData: FormData): Promise<void> {
  const request = await requireValidatedRequest(formData);

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/oauth/authorize?${formData.get("search")}`)}`);
  }

  await recordGrant(session.user.id, request.client.id, request.scope);
  const code = await issueAuthorizationCode({
    userId: session.user.id,
    clientDbId: request.client.id,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    scope: request.scope,
    nonce: request.nonce,
  });

  const url = new URL(request.redirectUri);
  url.searchParams.set("code", code);
  if (request.state) url.searchParams.set("state", request.state);
  redirect(url.toString());
}

export async function denyConsentAction(formData: FormData): Promise<void> {
  const request = await requireValidatedRequest(formData);
  const url = new URL(request.redirectUri);
  url.searchParams.set("error", "access_denied");
  if (request.state) url.searchParams.set("state", request.state);
  redirect(url.toString());
}
