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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireVerifiedEmailPage } from "@/lib/auth/require-verified-page";
import { getTimezones } from "@/lib/utils/timezones";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireVerifiedEmailPage(session);

  const user = await prisma.user.findUniqueOrThrow({
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
    },
  });

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
      </div>
    </div>
  );
}
