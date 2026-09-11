import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { UpdateNameForm } from "@/components/account/update-name-form";
import { UpdateTimezoneForm } from "@/components/account/update-timezone-form";
import { UpdateTimeFormatForm } from "@/components/account/update-time-format-form";
import { PushNotificationsToggle } from "@/components/account/push-notifications-toggle";
import { NotificationPreferencesForm } from "@/components/account/notification-preferences-form";
import { ConnectDiscordForm } from "@/components/account/connect-discord-form";
import { UpdateProfileDetailsForm } from "@/components/account/update-profile-details-form";
import { AvatarUploadForm } from "@/components/account/avatar-upload-form";
import { LeaveOrgButton } from "@/components/account/leave-org-button";
import { TwoFactorDialog } from "@/components/account/two-factor-dialog";
import { DisableTwoFactorForm } from "@/components/account/disable-two-factor-form";
import { RegenerateRecoveryCodesDialog } from "@/components/account/regenerate-recovery-codes-dialog";
import { RevokeConnectedAppButton } from "@/components/account/revoke-connected-app-button";
import { SignOutEverywhereButton } from "@/components/account/sign-out-everywhere-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireVerifiedEmailPage } from "@/lib/auth/require-verified-page";
import { getTimezones } from "@/lib/utils/timezones";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireVerifiedEmailPage(session);

  const [user, oauthGrants, loginEvents] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        name: true,
        avatarUrl: true,
        timezone: true,
        timeFormat: true,
        discordHandle: true,
        discordUserId: true,
        phone: true,
        mutedNotificationTypes: true,
        totpEnabledAt: true,
      },
    }),
    prisma.oAuthGrant.findMany({
      where: { userId: session.user.id },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loginEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const mutedTypes = Array.isArray(user.mutedNotificationTypes) ? (user.mutedNotificationTypes as string[]) : [];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6 text-primary" />
          Formation
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orgs">
            <ArrowLeft className="size-4" />
            Back to organizations
          </Link>
        </Button>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">Account</h1>
      <p className="mb-6 text-muted-foreground">{session.user.name ?? session.user.email}</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile picture</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUploadForm name={user.name} avatarUrl={user.avatarUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateNameForm currentName={session.user.name ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact &amp; gaming details</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateProfileDetailsForm currentDiscordHandle={user.discordHandle ?? ""} currentPhone={user.phone ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timezone</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateTimezoneForm currentTimezone={user.timezone} timezones={getTimezones()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time format</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateTimeFormatForm currentTimeFormat={user.timeFormat === "24h" ? "24h" : "12h"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Push notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationsToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm mutedTypes={mutedTypes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect Discord</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectDiscordForm discordUserId={user.discordUserId} discordHandle={user.discordHandle} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re not a member of any organization.</p>
            ) : (
              session.memberships.map((m) => (
                <div key={m.orgId} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 rounded-md">
                      {m.orgLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.orgLogoUrl} alt={m.orgName} className="size-full rounded-md object-cover" />
                      ) : (
                        <AvatarFallback className="rounded-md text-xs">
                          {m.orgName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.orgName}</p>
                      <p className="text-xs text-muted-foreground">{m.roleName}</p>
                    </div>
                  </div>
                  <LeaveOrgButton orgId={m.orgId} orgName={m.orgName} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card id="two-factor" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Two-factor authentication
              <Badge variant={user.totpEnabledAt ? "default" : "secondary"}>
                {user.totpEnabledAt ? "On" : "Off"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.totpEnabledAt ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A code from your authenticator app is required every time you sign in with a password.
                </p>
                <RegenerateRecoveryCodesDialog />
                <DisableTwoFactorForm />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add a second step to signing in with a password, using an authenticator app. Signing in with
                  esports-tools.com doesn&apos;t need this — it&apos;s only for password logins.
                </p>
                <TwoFactorDialog />
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="connected-apps" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-base">Connected apps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="mb-2 text-sm text-muted-foreground">
              Apps that can sign you in with this Formation account.
            </p>
            {oauthGrants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other apps are connected yet.</p>
            ) : (
              oauthGrants.map((grant) => (
                <div key={grant.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{grant.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(grant.createdAt)}
                    </p>
                  </div>
                  <RevokeConnectedAppButton clientDbId={grant.client.id} appName={grant.client.name} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card id="sessions" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent sign-ins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sign-in history yet.</p>
            ) : (
              <div className="space-y-2">
                {loginEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{event.ip ?? "Unknown location"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
                        event.createdAt,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t pt-4">
              <p className="mb-2 text-sm text-muted-foreground">
                Don&apos;t recognize one of these? Sign out everywhere, including every connected app, and sign
                back in.
              </p>
              <SignOutEverywhereButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
