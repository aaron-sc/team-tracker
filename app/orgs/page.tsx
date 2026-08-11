import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default async function OrgsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.memberships.length === 1) {
    redirect(`/${session.memberships[0].orgSlug}/dashboard`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6 text-primary" />
          Formation
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">Your organizations</h1>
      <p className="mb-6 text-muted-foreground">Pick an organization to continue.</p>

      {session.memberships.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You&apos;re not a member of any organization yet. Ask your team admin for an invite link.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {session.memberships.map((m) => (
            <Link key={m.orgId} href={`/${m.orgSlug}/dashboard`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-lg">
                      {m.orgLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.orgLogoUrl} alt={m.orgName} className="size-full rounded-lg object-cover" />
                      ) : (
                        <AvatarFallback className="rounded-lg">
                          {m.orgName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <CardTitle className="text-base">{m.orgName}</CardTitle>
                  </div>
                  <Badge variant="secondary">{m.roleName}</Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
