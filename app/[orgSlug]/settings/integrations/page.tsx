import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { ApiKeyPanel } from "@/components/settings/api-key-panel";
import { DiscordPanel } from "@/components/settings/discord-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IntegrationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_settings_manage);

  const fullOrg = await prisma.organization.findUniqueOrThrow({
    where: { id: org.id },
    select: { discordWebhookUrl: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-medium">Discord</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Post new announcements and match results to a Discord channel via an incoming webhook.
        </p>
        <DiscordPanel orgSlug={orgSlug} orgId={org.id} webhookUrl={fullOrg.discordWebhookUrl} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium">API access</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Generate a key to let other tools (like Atlas) read this organization&apos;s teams and rosters —
          including in-game names — instead of maintaining a separate copy of that data.
        </p>
        <ApiKeyPanel orgSlug={orgSlug} orgId={org.id} apiKey={org.apiKey ?? null} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Send the key as a bearer token on every request:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`Authorization: Bearer <api key>`}
          </pre>

          <div className="space-y-1">
            <p className="font-medium">GET /api/v1/organization</p>
            <p className="text-muted-foreground">Basic org info (id, name, slug, timezone).</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">GET /api/v1/teams</p>
            <p className="text-muted-foreground">List teams (id, name, game, slug, roster size).</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">GET /api/v1/teams/:teamId/roster</p>
            <p className="text-muted-foreground">
              Roster for a team, including each player&apos;s in-game name — this is what Atlas should use
              to match players to their Riot account instead of custom-entering names.
            </p>
          </div>

          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`curl -H "Authorization: Bearer <api key>" \\
  https://your-formation-app.example/api/v1/teams`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
