import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { JoinTeamButton } from "@/components/auth/join-team-button";
import { JoinTeamNewUserForm } from "@/components/auth/join-team-new-user-form";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function JoinTeamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = await prisma.teamInviteLink.findUnique({
    where: { token },
    include: { team: true, role: true, org: true },
  });
  const isValid = link && !link.revokedAt && (!link.expiresAt || link.expiresAt > new Date());

  if (!isValid) {
    return (
      <AuthShell title="Invite link not valid">
        <Alert variant="destructive">
          <AlertDescription>
            This invite link has expired or been revoked. Ask a team captain or admin for a new one.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  const session = await auth();

  if (session?.user) {
    return (
      <AuthShell
        title={`Join ${link.team.name}`}
        description={`${link.org.name} · joining as ${link.role.name}`}
      >
        <JoinTeamButton token={token} teamName={link.team.name} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Join ${link.team.name}`}
      description={`${link.org.name} · joining as ${link.role.name}. Create an account, or log in if you already have one.`}
      footer={
        <details className="text-left">
          <summary className="cursor-pointer text-sm">Already have a Formation account?</summary>
          <div className="mt-3">
            <LoginForm redirectTo={`/join/${token}`} />
          </div>
        </details>
      }
    >
      <JoinTeamNewUserForm token={token} />
    </AuthShell>
  );
}
