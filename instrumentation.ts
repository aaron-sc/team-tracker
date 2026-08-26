export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDiscordReminderScheduler } = await import("@/lib/integrations/discord-reminders");
    startDiscordReminderScheduler();
  }
}
