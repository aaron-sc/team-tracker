import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

// Only ever a same-origin relative path (never "//host/..." — that's scheme-relative and would
// hand an attacker-controlled off-site redirect to anyone who gets a user to click a crafted
// /login?redirectTo= link), so this is safe to send straight into next/navigation's redirect().
function safeRedirectTo(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

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
