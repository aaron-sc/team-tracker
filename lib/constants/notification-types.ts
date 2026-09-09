// Every `type` string ever passed to createNotification() (lib/notifications/create.ts).
// Keep this in sync when a new notification type is introduced — it drives the mute checklist
// on the account page.
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  match_created: "New match scheduled",
  match_cancelled: "Match cancelled",
  practice_created: "New practice or scrim scheduled",
  practice_declined: "A player declines a practice or scrim",
  practice_cancelled: "Practice or scrim cancelled",
  announcement_published: "New announcement posted",
  scrim_request: "New scrim request",
  scrim_declined: "Scrim request declined",
  scrim_accepted: "Scrim confirmed",
  message: "Direct messages",
  prospect_stage: "Recruitment pipeline updates",
  invite_accepted: "Someone accepts your org invite",
  broadcast: "Admin broadcasts",
};
