import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { AcceptInviteButton } from "@/components/auth/accept-invite-button";
import { AcceptInviteNewUserForm } from "@/components/auth/accept-invite-new-user-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { org: true, role: true },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return (
      <AuthShell title="Invite not valid">
        <Alert variant="destructive">
          <AlertDescription>
            This invite link has expired, been revoked, or already been used. Ask your org admin for a
            new invite.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  const session = await auth();
  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });

  if (session?.user) {
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (currentUser?.email === invite.email) {
      return (
        <AuthShell
          title={`Join ${invite.org.name}`}
          description={`You've been invited as ${invite.role.name}.`}
        >
          <AcceptInviteButton token={token} orgName={invite.org.name} />
        </AuthShell>
      );
    }

    return (
      <AuthShell title="Wrong account">
        <Alert variant="destructive">
          <AlertDescription>
            This invite was sent to {invite.email}, but you&apos;re logged in as {currentUser?.email}.
            Log out and try again.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  if (existingUser) {
    return (
      <AuthShell
        title={`Join ${invite.org.name}`}
        description={`Log in as ${invite.email} to accept your invite as ${invite.role.name}.`}
      >
        <LoginForm defaultEmail={invite.email} redirectTo={`/invite/${token}`} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Join ${invite.org.name}`}
      description={`Create your account to join as ${invite.role.name}.`}
    >
      <AcceptInviteNewUserForm token={token} email={invite.email} />
    </AuthShell>
  );
}
