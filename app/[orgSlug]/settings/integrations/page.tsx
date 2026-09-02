import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { ApiKeyPanel } from "@/components/settings/api-key-panel";
import { DiscordPanel } from "@/components/settings/discord-panel";
import { DiscordBotPanel } from "@/components/settings/discord-bot-panel";
import { buildDiscordInviteUrl } from "@/lib/integrations/discord-invite-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORMATION_DOCS_URL, FORMATION_BOT_TERMS_URL, FORMATION_BOT_PRIVACY_URL } from "@/lib/links";
import { ExternalLink } from "lucide-react";

export default async function IntegrationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.org_settings_manage);

  const fullOrg = await prisma.organization.findUniqueOrThrow({
    where: { id: org.id },
    select: { discordWebhookUrl: true, discordGuildId: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-medium">Discord</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Post new announcements and match results to a Discord channel via an incoming webhook. Used whenever a
          team doesn&apos;t have its own webhook configured — set one per team on that team&apos;s edit page for
          match/practice/scrim reminders and a dedicated channel.
        </p>
        <DiscordPanel orgSlug={orgSlug} orgId={org.id} webhookUrl={fullOrg.discordWebhookUrl} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium">Discord bot</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Beyond webhook pings, the bot lets players act from inside Discord — <code className="rounded bg-muted px-1 py-0.5 text-xs">/available</code> adds
          a weekly availability rule without opening Formation at all.
        </p>
        <DiscordBotPanel
          orgSlug={orgSlug}
          orgId={org.id}
          inviteUrl={buildDiscordInviteUrl()}
          connectedGuildId={fullOrg.discordGuildId}
        />
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a href={FORMATION_BOT_TERMS_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground hover:underline">
            <ExternalLink className="size-3" />
            Bot terms of service
          </a>
          <a href={FORMATION_BOT_PRIVACY_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground hover:underline">
            <ExternalLink className="size-3" />
            Bot privacy policy
          </a>
        </p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-medium">Calendar sync</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every member can subscribe to a live feed of just their own teams&apos; matches and practices from the{" "}
          <span className="font-medium">Subscribe</span> button on the Schedule page — no setup here required. The
          org-wide feed below (every team, all at once) is also available there under &quot;Whole org&quot;, gated by
          the API key.
        </p>
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
            Full setup guides and the complete API reference live in the{" "}
            <a href={FORMATION_DOCS_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              Formation docs
            </a>
            . Send the key as a bearer token on every request:
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
