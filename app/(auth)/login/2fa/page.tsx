import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { safeRedirectTo } from "@/lib/utils/safe-redirect";

export default async function LoginTwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo: rawRedirectTo } = await searchParams;
  const redirectTo = safeRedirectTo(rawRedirectTo);

  const session = await auth();
  if (session?.user) redirect(redirectTo ?? "/orgs");

  return (
    <AuthShell title="Enter your code" description="Open your authenticator app, or use a recovery code">
      <TwoFactorForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
