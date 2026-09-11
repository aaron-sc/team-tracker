import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectTo } from "@/lib/utils/safe-redirect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo: rawRedirectTo } = await searchParams;
  const redirectTo = safeRedirectTo(rawRedirectTo);

  const session = await auth();
  if (session?.user) redirect(redirectTo ?? "/orgs");

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to your Formation account"
      footer={
        <>
          Don&apos;t have an organization yet?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Request access
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
