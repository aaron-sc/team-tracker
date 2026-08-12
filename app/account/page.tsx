import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { UpdateNameForm } from "@/components/account/update-name-form";
import { UpdateTimezoneForm } from "@/components/account/update-timezone-form";
import { UpdateProfileDetailsForm } from "@/components/account/update-profile-details-form";
import { AvatarUploadForm } from "@/components/account/avatar-upload-form";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireVerifiedEmailPage } from "@/lib/auth/require-verified-page";
import { getTimezones } from "@/lib/utils/timezones";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireVerifiedEmailPage(session);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, avatarUrl: true, timezone: true, discordHandle: true, phone: true },
  });

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
