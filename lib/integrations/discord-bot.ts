import "server-only";
import crypto from "node:crypto";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client as DiscordClient,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type SlashCommandStringOption,
} from "discord.js";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { availabilityRuleGroupSchema } from "@/lib/validations/availability";
import { FORMATION_EMBED_COLOR } from "@/lib/integrations/discord";
import { approveAccessRequest, denyAccessRequest } from "@/lib/access-requests/service";
import { getBackgroundBaseUrl } from "@/lib/utils/base-url";

// Optional integration: every handler below assumes DISCORD_BOT_TOKEN may simply be unset (self-
// hosted orgs that don't want a bot), so startDiscordBot() below is the only thing that decides
// whether any of this runs at all. Every exported function used from elsewhere in the app
// (postInteractiveReminder, dmReminderToRoster, syncDiscordRoleForRosterChange) checks
// `client?.isReady()` first and silently no-ops if the bot isn't connected.

const DAY_CHOICES = [
  { name: "Sunday", value: "0" },
  { name: "Monday", value: "1" },
  { name: "Tuesday", value: "2" },
  { name: "Wednesday", value: "3" },
  { name: "Thursday", value: "4" },
  { name: "Friday", value: "5" },
  { name: "Saturday", value: "6" },
] as const;

function teamOption(opt: SlashCommandStringOption): SlashCommandStringOption {
  return opt.setName("team").setDescription("Team name").setRequired(true).setAutocomplete(true);
}

const commandDefinitions = [
  new SlashCommandBuilder().setName("link").setDescription("Connect your Discord account to your Formation account"),
  new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect this server to your Formation organization")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName("whoami").setDescription("Show your linked Formation account"),
  new SlashCommandBuilder()
    .setName("available")
    .setDescription("Add a weekly availability rule in Formation")
    .addStringOption((opt) => opt.setName("day").setDescription("Day of the week").setRequired(true).addChoices(...DAY_CHOICES))
    .addStringOption((opt) => opt.setName("start").setDescription("Start time, 24h HH:MM (e.g. 18:00)").setRequired(true))
    .addStringOption((opt) => opt.setName("end").setDescription("End time, 24h HH:MM (e.g. 21:00)").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("timezone").setDescription("IANA timezone, e.g. America/Chicago — defaults to your Formation timezone").setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("roster")
    .setDescription("Show a team's roster")
    .addStringOption(teamOption),
  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Show a team's upcoming matches and practices")
    .addStringOption(teamOption),
  new SlashCommandBuilder()
    .setName("bench")
    .setDescription("Show active bench/disciplinary records for a team (leadership only)")
    .addStringOption(teamOption),
].map((c) => c.toJSON());

function generateCode(): string {
  // Excludes visually ambiguous characters (0/O, 1/I) since a person retypes this by hand.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

const CODE_LIFETIME_MS = 10 * 60 * 1000;

// Next.js/Turbopack can give a Server Action its own module instance, separate from the one
// instrumentation.ts evaluates at boot — a plain module-scope `let` would then read back null
// from inside a Server Action even though the bot is connected. Anchor the singleton on
// globalThis (same trick lib/db/prisma.ts uses for the same reason) so every module instance
// resolves to the one real, logged-in client.
const globalForDiscordBot = globalThis as unknown as { __discordBotClient?: Client | null };
let client: Client | null = globalForDiscordBot.__discordBotClient ?? null;

/** Starts the Discord bot's gateway connection. Safe to call repeatedly — no-ops after the first
 *  call, and no-ops entirely if DISCORD_BOT_TOKEN isn't set (bot is an optional integration). */
export function startDiscordBot() {
  if (client) return;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[discord-bot] DISCORD_BOT_TOKEN not set — Discord bot disabled.");
    return;
  }

  // No privileged intents needed: fetching one specific guild member by ID (for role sync) is a
  // plain REST call, not a gateway subscription, so it works fine on the default Guilds intent.
  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  globalForDiscordBot.__discordBotClient = client;

  client.once("ready", (c) => {
    console.log(`[discord-bot] Logged in as ${c.user.tag}.`);
    void registerCommandsForAllGuilds(c);
  });

  client.on("shardDisconnect", (event) => {
    console.warn(`[discord-bot] Shard disconnected (code ${event.code}).`);
  });
  client.on("shardReconnecting", () => {
    console.warn("[discord-bot] Shard reconnecting…");
  });
  client.on("shardResume", () => {
    console.log("[discord-bot] Shard resumed.");
  });
  client.on("error", (err) => {
    console.error("[discord-bot] Client error:", err);
  });

  client.on("guildCreate", (guild) => {
    void registerGuildCommands(guild.id);
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        await handleTeamAutocomplete(interaction);
        return;
      }
      if (interaction.isButton()) {
        if (await handleAccessRequestButton(interaction)) return;
        await handleRsvpButton(interaction);
        return;
      }
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName === "link") await handleLink(interaction);
      else if (interaction.commandName === "connect") await handleConnect(interaction);
      else if (interaction.commandName === "whoami") await handleWhoami(interaction);
      else if (interaction.commandName === "available") await handleAvailable(interaction);
      else if (interaction.commandName === "roster") await handleRoster(interaction);
      else if (interaction.commandName === "schedule") await handleSchedule(interaction);
      else if (interaction.commandName === "bench") await handleBench(interaction);
    } catch (err) {
      console.error(`[discord-bot] interaction failed:`, err);
      if (interaction.isRepliable()) {
        const payload = { content: "Something went wrong on Formation's end. Try again in a moment.", ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
    }
  });

  client.login(token).catch((err) => {
    console.error("[discord-bot] Failed to log in:", err);
  });
}

async function registerGuildCommands(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) return;
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandDefinitions }).catch((err) => {
    console.error(`[discord-bot] Failed to register commands for guild ${guildId}:`, err);
  });
}

async function registerCommandsForAllGuilds(c: DiscordClient<true>) {
  await Promise.all(c.guilds.cache.map((g) => registerGuildCommands(g.id)));
}

/** Shared resolution for every command that needs "who is this, in which org" — the guild must
 *  be connected (see /connect) and the invoking Discord user must be linked (see /link). */
async function resolveOrgAndMembership(guildId: string | null, discordUserId: string) {
  if (!guildId) return { error: "Run this inside a server, not a DM." } as const;
  const org = await prisma.organization.findUnique({ where: { discordGuildId: guildId } });
  if (!org) return { error: "This server isn't connected to a Formation org yet — an admin can connect it with /connect." } as const;
  const user = await prisma.user.findUnique({ where: { discordUserId } });
  if (!user) return { error: "Your Discord account isn't linked to Formation yet — run /link first." } as const;
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    include: { role: { include: { permissions: true } } },
  });
  if (!membership) return { error: "You're not a member of this Formation organization." } as const;
  return { org, user, membership } as const;
}

async function handleTeamAutocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "team" || !interaction.guildId) return void interaction.respond([]);

  const org = await prisma.organization.findUnique({ where: { discordGuildId: interaction.guildId } });
  if (!org) return void interaction.respond([]);

  const teams = await prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });
  const q = String(focused.value).toLowerCase();
  const matches = teams.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 25);
  await interaction.respond(matches.map((t) => ({ name: t.name, value: t.id })));
}

async function handleLink(interaction: ChatInputCommandInteraction) {
  await prisma.discordLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const code = generateCode();
  await prisma.discordLinkCode.create({
    data: {
      code,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
      expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
    },
  });

  await interaction.reply({
    content: `Enter this code on your Formation account page (**Account → Connect Discord**) within 10 minutes:\n\n**${code}**`,
    ephemeral: true,
  });
}

async function handleConnect(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Run this inside a server, not a DM.", ephemeral: true });
    return;
  }
  // Defense in depth — setDefaultMemberPermissions above is only a default an admin could relax.
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You need the Manage Server permission to do this.", ephemeral: true });
    return;
  }

  await prisma.discordGuildLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const code = generateCode();
  await prisma.discordGuildLinkCode.create({
    data: { code, guildId: interaction.guild.id, guildName: interaction.guild.name, expiresAt: new Date(Date.now() + CODE_LIFETIME_MS) },
  });

  await interaction.reply({
    content: `Enter this code in Formation under **Settings → Integrations → Discord bot** within 10 minutes:\n\n**${code}**`,
    ephemeral: true,
  });
}

async function handleWhoami(interaction: ChatInputCommandInteraction) {
  const user = await prisma.user.findUnique({
    where: { discordUserId: interaction.user.id },
    include: { memberships: { include: { org: true, role: true, teamMemberships: { include: { team: true } } } } },
  });
  if (!user) {
    await interaction.reply({ content: "Not linked yet — run /link first.", ephemeral: true });
    return;
  }
  if (user.memberships.length === 0) {
    await interaction.reply({ content: `Linked as **${user.name}**, but you're not in any Formation organizations yet.`, ephemeral: true });
    return;
  }
  const lines = user.memberships.map((m) => {
    const teams = m.teamMemberships.map((tm) => tm.team.name).join(", ") || "no teams";
    return `• **${m.org.name}** — ${m.role.name} (${teams})`;
  });
  await interaction.reply({ content: `Linked as **${user.name}**\n${lines.join("\n")}`, ephemeral: true });
}

async function handleAvailable(interaction: ChatInputCommandInteraction) {
  const resolved = await resolveOrgAndMembership(interaction.guildId, interaction.user.id);
  if ("error" in resolved) return void interaction.reply({ content: resolved.error, ephemeral: true });
  const { org, user, membership } = resolved;

  const permissions = membership.role.permissions.map((p) => p.permission);
  if (!permissions.includes(Permission.availability_manage_self)) {
    await interaction.reply({ content: "You don't have permission to manage availability in Formation.", ephemeral: true });
    return;
  }

  const day = interaction.options.getString("day", true);
  const start = interaction.options.getString("start", true);
  const end = interaction.options.getString("end", true);
  const timezone = interaction.options.getString("timezone") || user.timezone || org.timezone;

  const parsed = availabilityRuleGroupSchema.safeParse({ daysOfWeek: [day], startTime: start, endTime: end, timezone });
  if (!parsed.success) {
    await interaction.reply({ content: `⚠️ ${parsed.error.issues[0]?.message ?? "Invalid input."}`, ephemeral: true });
    return;
  }

  await prisma.availabilityRule.create({
    data: {
      membershipId: membership.id,
      dayOfWeek: parsed.data.daysOfWeek[0],
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      timezone: parsed.data.timezone,
    },
  });

  const dayLabel = DAY_CHOICES[Number(day)]?.name ?? day;
  await interaction.reply({ content: `✅ Added: **${dayLabel}s, ${start}–${end}** (${parsed.data.timezone})`, ephemeral: true });
}

async function resolveTeamOption(interaction: ChatInputCommandInteraction, orgId: string) {
  const teamId = interaction.options.getString("team", true);
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.orgId !== orgId) {
    await interaction.reply({ content: "Team not found — pick one from the autocomplete list.", ephemeral: true });
    return null;
  }
  return team;
}

async function handleRoster(interaction: ChatInputCommandInteraction) {
  const resolved = await resolveOrgAndMembership(interaction.guildId, interaction.user.id);
  if ("error" in resolved) return void interaction.reply({ content: resolved.error, ephemeral: true });
  const team = await resolveTeamOption(interaction, resolved.org.id);
  if (!team) return;

  const roster = await prisma.teamMembership.findMany({
    where: { teamId: team.id },
    include: { membership: { include: { user: true } } },
    orderBy: { membership: { user: { name: "asc" } } },
  });
  if (roster.length === 0) {
    await interaction.reply({ content: `**${team.name}** has no roster yet.`, ephemeral: true });
    return;
  }

  const lines = roster.map((r) => {
    const parts = [r.membership.user.name];
    if (r.position) parts.push(`(${r.position})`);
    if (r.inGameName) parts.push(`— ${r.inGameName}`);
    return `• ${parts.join(" ")}`;
  });
  await interaction.reply({ content: `**${team.name} roster**\n${lines.join("\n")}`, ephemeral: true });
}

async function handleSchedule(interaction: ChatInputCommandInteraction) {
  const resolved = await resolveOrgAndMembership(interaction.guildId, interaction.user.id);
  if ("error" in resolved) return void interaction.reply({ content: resolved.error, ephemeral: true });
  const team = await resolveTeamOption(interaction, resolved.org.id);
  if (!team) return;

  const now = new Date();
  const [matches, sessions] = await Promise.all([
    prisma.match.findMany({ where: { teamId: team.id, scheduledAt: { gte: now } }, include: { opponent: true }, orderBy: { scheduledAt: "asc" }, take: 5 }),
    prisma.practiceSession.findMany({
      where: { teamId: team.id, scheduledAt: { gte: now } },
      include: { opponent: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  const items = [
    ...matches.map((m) => ({ at: m.scheduledAt, label: `Match vs ${m.opponent.name}` })),
    ...sessions.map((s) => ({ at: s.scheduledAt, label: s.type === "SCRIM" ? `Scrim vs ${s.opponent?.name ?? "TBD"}` : "Practice" })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 5);

  if (items.length === 0) {
    await interaction.reply({ content: `**${team.name}** has nothing upcoming.`, ephemeral: true });
    return;
  }
  // Discord's <t:UNIX:F> renders in each viewer's own local timezone client-side — no manual
  // timezone conversion needed here, unlike everywhere else in this app.
  const lines = items.map((i) => `• ${i.label} — <t:${Math.floor(i.at.getTime() / 1000)}:F>`);
  await interaction.reply({ content: `**${team.name} — upcoming**\n${lines.join("\n")}`, ephemeral: true });
}

async function handleBench(interaction: ChatInputCommandInteraction) {
  const resolved = await resolveOrgAndMembership(interaction.guildId, interaction.user.id);
  if ("error" in resolved) return void interaction.reply({ content: resolved.error, ephemeral: true });
  const permissions = resolved.membership.role.permissions.map((p) => p.permission);
  if (!permissions.includes(Permission.player_actions_manage)) {
    await interaction.reply({ content: "You don't have permission to view player conduct records.", ephemeral: true });
    return;
  }
  const team = await resolveTeamOption(interaction, resolved.org.id);
  if (!team) return;

  const now = new Date();
  const actions = await prisma.playerAction.findMany({
    where: { teamMembership: { teamId: team.id }, type: "BENCHED", OR: [{ endDate: null }, { endDate: { gte: now } }] },
    include: { teamMembership: { include: { membership: { include: { user: true } } } } },
  });
  if (actions.length === 0) {
    await interaction.reply({ content: `No one on **${team.name}** is currently benched.`, ephemeral: true });
    return;
  }
  const lines = actions.map((a) => `• ${a.teamMembership.membership.user.name} — ${a.reason}`);
  await interaction.reply({ content: `**${team.name} — active bench records**\n${lines.join("\n")}`, ephemeral: true });
}

async function handleRsvpButton(interaction: ButtonInteraction) {
  const [prefix, kind, eventId, status] = interaction.customId.split(":");
  if (prefix !== "rsvp" || (kind !== "MATCH" && kind !== "PRACTICE") || (status !== "CONFIRMED" && status !== "DECLINED")) return;

  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (!user) {
    await interaction.reply({ content: "Link your Discord account first — run /link.", ephemeral: true });
    return;
  }

  if (kind === "MATCH") {
    const match = await prisma.match.findUnique({ where: { id: eventId }, include: { team: true } });
    if (!match) return void interaction.reply({ content: "This match no longer exists.", ephemeral: true });
    const membership = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: match.team.orgId } } });
    if (!membership) return void interaction.reply({ content: "You're not in this Formation organization.", ephemeral: true });
    await prisma.matchAttendance.upsert({
      where: { matchId_membershipId: { matchId: eventId, membershipId: membership.id } },
      create: { matchId: eventId, membershipId: membership.id, status, respondedAt: new Date() },
      update: { status, respondedAt: new Date() },
    });
  } else {
    const session = await prisma.practiceSession.findUnique({ where: { id: eventId }, include: { team: true } });
    if (!session) return void interaction.reply({ content: "This session no longer exists.", ephemeral: true });
    const membership = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId: session.team.orgId } } });
    if (!membership) return void interaction.reply({ content: "You're not in this Formation organization.", ephemeral: true });
    await prisma.sessionAttendance.upsert({
      where: { sessionId_membershipId: { sessionId: eventId, membershipId: membership.id } },
      create: { sessionId: eventId, membershipId: membership.id, status, respondedAt: new Date() },
      update: { status, respondedAt: new Date() },
    });
  }

  await interaction.reply({
    content: status === "CONFIRMED" ? "✅ You're marked as attending." : "❌ You're marked as not attending.",
    ephemeral: true,
  });
}

/** Handles the Approve/Deny buttons on an access-request review message. Returns false (so the
 *  caller falls through to other button handlers) if this isn't one of ours. */
async function handleAccessRequestButton(interaction: ButtonInteraction): Promise<boolean> {
  const [prefix, action, token] = interaction.customId.split(":");
  if (prefix !== "accessreq" || (action !== "approve" && action !== "deny") || !token) return false;

  await interaction.deferReply({ ephemeral: true });
  const reviewer = `discord:${interaction.user.tag ?? interaction.user.username}`;
  const result =
    action === "approve"
      ? await approveAccessRequest(token, reviewer, getBackgroundBaseUrl() ?? "")
      : await denyAccessRequest(token, reviewer);

  if (!result.ok) {
    await interaction.editReply(`⚠️ ${result.error}`);
    return true;
  }

  const decidedBy = interaction.user.tag ?? interaction.user.username;
  try {
    if (interaction.message.editable) {
      await interaction.message.edit({
        content:
          result.status === "APPROVED"
            ? `✅ Approved by ${decidedBy}${result.alreadyDecided ? " (already approved)" : ""}`
            : `⛔ Denied by ${decidedBy}${result.alreadyDecided ? " (already denied)" : ""}`,
        components: [],
      });
    }
  } catch {
    // Message too old to edit — the ephemeral reply below still confirms the outcome.
  }

  if (result.status === "APPROVED") {
    await interaction.editReply(
      result.signupUrl.startsWith("http")
        ? `✅ Approved. A single-use signup link was emailed to ${result.email}.`
        : `✅ Approved, but APP_URL isn't set so no link could be built — set it and re-approve, or send them a link manually.`,
    );
  } else {
    await interaction.editReply(`⛔ Denied. ${result.email} won't get access.`);
  }
  return true;
}

/** Posts a new access request to the review channel (ACCESS_REQUEST_DISCORD_CHANNEL_ID) with
 *  Approve/Deny buttons. Returns false if the bot isn't connected or no channel is configured,
 *  so the caller can fall back to a webhook. */
export async function postAccessRequestForReview(
  req: {
    token: string;
    name: string;
    email: string;
    role: string;
    orgName: string;
    websiteUrl: string | null;
    discordInvite: string | null;
    games: string;
    rosterSize: string | null;
    reason: string;
    referral: string | null;
    ip: string | null;
  },
  links: { approveUrl: string | null; denyUrl: string | null },
): Promise<boolean> {
  const channelId = process.env.ACCESS_REQUEST_DISCORD_CHANNEL_ID;
  if (!client) {
    console.warn("[discord-bot] Access-request post skipped — client is null (DISCORD_BOT_TOKEN unset, or startDiscordBot() never ran in this process).");
    return false;
  }
  if (!client.isReady()) {
    console.warn(
      `[discord-bot] Access-request post skipped — client exists but isReady() is false ` +
        `(ws status: ${client.ws.status}, readyAt: ${client.readyAt}, uptime: ${client.uptime}ms).`,
    );
    return false;
  }
  if (!channelId) {
    console.warn("[discord-bot] Access-request post skipped — ACCESS_REQUEST_DISCORD_CHANNEL_ID not set.");
    return false;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.warn(`[discord-bot] Access-request post skipped — channel ${channelId} not found (bot may not have access to it, or it's in another server).`);
      return false;
    }
    if (!channel.isTextBased() || !("send" in channel)) {
      console.warn(`[discord-bot] Access-request post skipped — channel ${channelId} is type ${channel.type}, not a postable text channel.`);
      return false;
    }

    const embed = new EmbedBuilder()
      .setTitle("New Formation access request")
      .setColor(FORMATION_EMBED_COLOR)
      .addFields(
        { name: "Email", value: req.email, inline: true },
        { name: "Name", value: req.name, inline: true },
        { name: "Their role", value: req.role, inline: true },
        { name: "Org", value: req.orgName, inline: true },
        { name: "Game(s)", value: req.games || "—", inline: true },
        { name: "Roster size", value: req.rosterSize || "—", inline: true },
        { name: "Website", value: req.websiteUrl || "—", inline: true },
        { name: "Discord invite", value: req.discordInvite || "—", inline: true },
        { name: "Heard about us via", value: req.referral || "—", inline: true },
        { name: "IP", value: req.ip || "—", inline: true },
        { name: "Why they want in", value: req.reason.slice(0, 1024) },
      )
      .setTimestamp(new Date());
    if (links.approveUrl) {
      embed.addFields({ name: "Fallback links", value: `[Approve](${links.approveUrl}) · [Deny](${links.denyUrl})` });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`accessreq:approve:${req.token}`).setLabel("Approve").setStyle(ButtonStyle.Success).setEmoji("✅"),
      new ButtonBuilder().setCustomId(`accessreq:deny:${req.token}`).setLabel("Deny").setStyle(ButtonStyle.Danger).setEmoji("⛔"),
    );

    await channel.send({ embeds: [embed], components: [row] });
    return true;
  } catch (err) {
    console.error("[discord-bot] Failed to post access request for review:", err);
    return false;
  }
}

/** Posts a reminder with RSVP buttons to a team's configured channel (Team.discordReminderChannelId).
 *  No-ops if the bot isn't connected or the team hasn't set a channel. */
export async function postInteractiveReminder(
  channelId: string,
  kind: "MATCH" | "PRACTICE",
  eventId: string,
  title: string,
  description: string,
): Promise<void> {
  if (!client?.isReady()) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || !("send" in channel)) return;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`rsvp:${kind}:${eventId}:CONFIRMED`).setLabel("I'm in").setStyle(ButtonStyle.Success).setEmoji("✅"),
      new ButtonBuilder().setCustomId(`rsvp:${kind}:${eventId}:DECLINED`).setLabel("Can't make it").setStyle(ButtonStyle.Danger).setEmoji("❌"),
    );
    await channel.send({ content: `**${title}**\n${description}`, components: [row] });
  } catch (err) {
    console.error("[discord-bot] Failed to post interactive reminder:", err);
  }
}

/** DMs every roster member who's linked their Discord and opted into DM reminders. Best-effort —
 *  a closed DM or missing shared guild for one person doesn't affect anyone else. */
export async function dmReminderToRoster(teamId: string, title: string, body: string, linkUrl: string | undefined): Promise<void> {
  if (!client?.isReady()) return;
  const c = client;

  const roster = await prisma.teamMembership.findMany({
    where: { teamId },
    select: { membership: { select: { user: { select: { discordUserId: true, discordDmReminders: true } } } } },
  });
  const targets = roster.map((r) => r.membership.user).filter((u) => u.discordUserId && u.discordDmReminders);

  await Promise.all(
    targets.map(async (u) => {
      try {
        const discordUser = await c.users.fetch(u.discordUserId!);
        await discordUser.send(`**${title}**\n${body}${linkUrl ? `\n${linkUrl}` : ""}`);
      } catch {
        // Closed DMs, no shared guild, etc. — not worth surfacing per-user.
      }
    }),
  );
}

/** Adds or removes a team's synced Discord role for one member — called after a roster add/remove.
 *  No-ops unless the bot is connected, the team has a role configured, and the member is linked.
 *  Requires the bot to have Manage Roles and to sit above the target role in the guild's role list
 *  — a Discord-side hierarchy rule this can't check or fix from here. */
export async function syncDiscordRoleForRosterChange(teamId: string, membershipId: string, action: "add" | "remove"): Promise<void> {
  if (!client?.isReady()) return;
  const c = client;
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId }, include: { org: true } });
    if (!team?.discordRoleId || !team.org.discordGuildId) return;

    const membership = await prisma.membership.findUnique({ where: { id: membershipId }, include: { user: true } });
    if (!membership?.user.discordUserId) return;

    const guild = await c.guilds.fetch(team.org.discordGuildId);
    const member = await guild.members.fetch(membership.user.discordUserId);
    if (action === "add") await member.roles.add(team.discordRoleId);
    else await member.roles.remove(team.discordRoleId);
  } catch (err) {
    console.error("[discord-bot] Role sync failed:", err);
  }
}

/** Whether a channel picker / role picker can be shown to org admins — i.e. whether the bot is
 *  actually connected right now, not just configured. */
export function isDiscordBotConnected(): boolean {
  return !!client?.isReady();
}

/** Lists text channels in a guild (for the reminder-channel picker) — empty if the bot can't see it. */
export async function listGuildTextChannels(guildId: string): Promise<{ id: string; name: string }[]> {
  if (!client?.isReady()) return [];
  try {
    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const result: { id: string; name: string }[] = [];
    for (const channel of channels.values()) {
      if (channel && channel.isTextBased() && !channel.isThread()) {
        result.push({ id: channel.id, name: channel.name });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error(`[discord-bot] Failed to list channels for guild ${guildId}:`, err);
    return [];
  }
}

/** Lists roles in a guild (for the team role-sync picker) — empty if the bot can't see it. */
export async function listGuildRoles(guildId: string): Promise<{ id: string; name: string }[]> {
  if (!client?.isReady()) return [];
  try {
    const guild = await client.guilds.fetch(guildId);
    const roles = await guild.roles.fetch();
    const result: { id: string; name: string }[] = [];
    for (const role of roles.values()) {
      if (role.name !== "@everyone" && !role.managed) result.push({ id: role.id, name: role.name });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error(`[discord-bot] Failed to list roles for guild ${guildId}:`, err);
    return [];
  }
}
