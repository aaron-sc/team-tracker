import { prisma } from "@/lib/db/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConfirmVerifyEmailButton } from "@/components/auth/confirm-verify-email-button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function VerifyEmailTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token } });
  const isValid = verificationToken && !verificationToken.usedAt && verificationToken.expiresAt > new Date();

  if (!isValid) {
    return (
      <AuthShell title="Link expired">
        <Alert variant="destructive">
          <AlertDescription>
            This verification link has expired or already been used. Log in and request a new one.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirm your email" description="Click below to finish verifying your account">
      <div className="flex justify-center">
        <ConfirmVerifyEmailButton token={token} />
      </div>
    </AuthShell>
  );
}
