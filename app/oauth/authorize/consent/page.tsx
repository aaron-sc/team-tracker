import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { validateAuthorizeParams } from "@/lib/oauth/validate";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { approveConsentAction, denyConsentAction } from "@/lib/actions/oauth";
import { ShieldCheck } from "lucide-react";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Confirm it's you",
  profile: "Your name and profile photo",
  email: "Your email address",
};

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }

  const result = await validateAuthorizeParams(params);
  if (!result.ok) {
    if (!result.redirectable) {
      return (
        <AuthShell title="This sign-in link isn't valid">
          <p className="text-sm text-muted-foreground">
            It may have expired, or the app that sent you here isn&apos;t registered with Formation. Go back and try
            signing in again.
          </p>
        </AuthShell>
      );
    }
    const url = new URL(result.redirectUri);
    url.searchParams.set("error", result.error);
    if (result.state) url.searchParams.set("state", result.state);
    redirect(url.toString());
  }

  const { client, scope } = result.request;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/oauth/authorize?${params.toString()}`)}`);
  }

  const scopes = scope.split(" ").filter((s) => s !== "openid");

  return (
    <AuthShell title={`${client.name} wants to access your account`} description={session.user.email ?? undefined}>
      <div className="mb-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <ShieldCheck className="size-5 text-primary" />
        <span>Signed in to Formation as {session.user.name}</span>
      </div>
      <p className="mb-2 text-sm font-medium">This will let {client.name} see:</p>
      <ul className="mb-6 space-y-1.5 text-sm text-muted-foreground">
        {scopes.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            {SCOPE_DESCRIPTIONS[s] ?? s}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <form action={denyConsentAction} className="flex-1">
          <input type="hidden" name="search" value={params.toString()} />
          <Button type="submit" variant="outline" className="w-full">
            Cancel
          </Button>
        </form>
        <form action={approveConsentAction} className="flex-1">
          <input type="hidden" name="search" value={params.toString()} />
          <Button type="submit" className="w-full">
            Allow
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        You can revoke access any time from Account &rarr; Connected apps.
      </p>
    </AuthShell>
  );
}
