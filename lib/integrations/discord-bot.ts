import "server-only";
import crypto from "node:crypto";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type Client as DiscordClient,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { availabilityRuleGroupSchema } from "@/lib/validations/availability";

// Optional integration: every handler below assumes DISCORD_BOT_TOKEN may simply be unset (self-
// hosted orgs that don't want a bot), so startDiscordBot() below is the only thing that decides
// whether any of this runs at all.

const DAY_CHOICES = [
  { name: "Sunday", value: "0" },
  { name: "Monday", value: "1" },
  { name: "Tuesday", value: "2" },
  { name: "Wednesday", value: "3" },
  { name: "Thursday", value: "4" },
  { name: "Friday", value: "5" },
  { name: "Saturday", value: "6" },
] as const;

const commandDefinitions = [
  new SlashCommandBuilder().setName("link").setDescription("Connect your Discord account to your Formation account"),
  new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect this server to your Formation organization")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("available")
    .setDescription("Add a weekly availability rule in Formation")
    .addStringOption((opt) =>
      opt
        .setName("day")
        .setDescription("Day of the week")
        .setRequired(true)
        .addChoices(...DAY_CHOICES),
    )
    .addStringOption((opt) => opt.setName("start").setDescription("Start time, 24h HH:MM (e.g. 18:00)").setRequired(true))
    .addStringOption((opt) => opt.setName("end").setDescription("End time, 24h HH:MM (e.g. 21:00)").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName("timezone")
        .setDescription("IANA timezone, e.g. America/Chicago — defaults to your Formation timezone")
        .setRequired(false),
    ),
].map((c) => c.toJSON());

function generateCode(): string {
  // Excludes visually ambiguous characters (0/O, 1/I) since a person retypes this by hand.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

const CODE_LIFETIME_MS = 10 * 60 * 1000;

let client: Client | null = null;

/** Starts the Discord bot's gateway connection. Safe to call repeatedly — no-ops after the first
 *  call, and no-ops entirely if DISCORD_BOT_TOKEN isn't set (bot is an optional integration). */
export function startDiscordBot() {
  if (client) return;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[discord-bot] DISCORD_BOT_TOKEN not set — Discord bot disabled.");
    return;
  }

  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", (c) => {
    console.log(`[discord-bot] Logged in as ${c.user.tag}.`);
    void registerCommandsForAllGuilds(c);
  });

  client.on("guildCreate", (guild) => {
    void registerGuildCommands(guild.id);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      if (interaction.commandName === "link") await handleLink(interaction);
      else if (interaction.commandName === "connect") await handleConnect(interaction);
      else if (interaction.commandName === "available") await handleAvailable(interaction);
    } catch (err) {
      console.error(`[discord-bot] /${interaction.commandName} failed:`, err);
      const payload = { content: "Something went wrong on Formation's end. Try again in a moment.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
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

async function handleAvailable(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: "Run this inside a server, not a DM.", ephemeral: true });
    return;
  }

  const org = await prisma.organization.findUnique({ where: { discordGuildId: interaction.guildId } });
  if (!org) {
    await interaction.reply({
      content: "This server isn't connected to a Formation org yet — an admin can connect it with /connect.",
      ephemeral: true,
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { discordUserId: interaction.user.id } });
  if (!user) {
    await interaction.reply({ content: "Your Discord account isn't linked to Formation yet — run /link first.", ephemeral: true });
    return;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    include: { role: { include: { permissions: true } } },
  });
  if (!membership) {
    await interaction.reply({ content: "You're not a member of this Formation organization.", ephemeral: true });
    return;
  }
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
  await interaction.reply({
    content: `✅ Added: **${dayLabel}s, ${start}–${end}** (${parsed.data.timezone})`,
    ephemeral: true,
  });
}
