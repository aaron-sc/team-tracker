import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";

export default async function VerifyEmailPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.hasVerifiedEmail) redirect("/orgs");

  return (
    <AuthShell title="Verify your email" description="One more step before you can get in">
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <strong className="text-foreground">{session.user.email}</strong>. Click it
          to finish setting up your account.
        </p>
        <ResendVerificationButton />
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground">
            Log out
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
