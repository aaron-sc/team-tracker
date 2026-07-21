import { prisma } from "@/lib/db/prisma";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  const isValid = resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  if (!isValid) {
    return (
      <AuthShell title="Link expired">
        <Alert variant="destructive">
          <AlertDescription>
            This password reset link has expired or already been used. Request a new one from the login page.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
