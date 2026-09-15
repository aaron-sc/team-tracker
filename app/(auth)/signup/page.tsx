import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { RequestAccessForm } from "@/components/auth/request-access-form";
import { CompleteSignupForm } from "@/components/auth/complete-signup-form";
import { UserInviteSignupForm } from "@/components/auth/user-invite-signup-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; invite?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/orgs");

  const { token, invite: inviteToken } = await searchParams;

  // A direct, no-review invite from an existing user — see the UserInvite model's doc comment.
  if (inviteToken) {
    const invite = await prisma.userInvite.findUnique({ where: { token: inviteToken } });
    if (invite && !invite.consumedAt && invite.expiresAt > new Date()) {
      return (
        <AuthShell
          title="You're invited to Formation"
          description="Create your account and your own organization — no waitlist."
          footer={
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                Log in
              </Link>
            </>
          }
        >
          <UserInviteSignupForm token={inviteToken} />
        </AuthShell>
      );
    }

    return (
      <AuthShell title="This link isn't valid">
        <Alert variant="destructive">
          <AlertDescription>
            This invite link has already been used or has expired. Ask whoever sent it for a new one, or{" "}
            <Link href="/signup" className="underline underline-offset-4">
              request access
            </Link>{" "}
            the usual way.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  // Approved access request → the real "create your account + org" form.
  if (token) {
    const request = await prisma.accessRequest.findUnique({ where: { token } });
    if (request && request.status === "APPROVED" && !request.consumedAt) {
      return (
        <AuthShell
          title="Finish setting up"
          description={`You're approved as ${request.email}. Create your account and organization.`}
          footer={
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                Log in
              </Link>
            </>
          }
        >
          <CompleteSignupForm
            token={token}
            email={request.email}
            defaultName={request.name}
            defaultOrgName={request.orgName}
          />
        </AuthShell>
      );
    }

    return (
      <AuthShell title="This link isn't valid">
        <Alert variant="destructive">
          <AlertDescription>
            This signup link has already been used or wasn&apos;t approved.{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Request access
            </Link>{" "}
            to get a new one.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  // No token → the access-request form. Formation is invite-only during early access.
  return (
    <AuthShell
      title="Request access to Formation"
      description="Formation is invite-only while it's in early access. Tell us about your org and we'll be in touch by email."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <RequestAccessForm />
    </AuthShell>
  );
}
