import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/** For page-level gating: redirects to the verification holding page if the signed-in user hasn't verified their email. */
export function requireVerifiedEmailPage(session: Session) {
  if (!session.user.hasVerifiedEmail) {
    redirect("/verify-email");
  }
}
