import { Permission } from "@/lib/generated/prisma/enums";

export { Permission };

export const ALL_PERMISSIONS = Object.values(Permission);

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Organization",
    permissions: [
      Permission.org_settings_manage,
      Permission.org_roles_manage,
      Permission.org_members_manage,
      Permission.org_members_invite,
      Permission.org_members_remove,
      Permission.audit_log_view,
    ],
  },
  {
    label: "Roster & Teams",
    permissions: [
      Permission.team_create,
      Permission.team_edit,
      Permission.team_delete,
      Permission.roster_manage,
      Permission.team_members_invite,
    ],
  },
  {
    label: "Scheduling",
    permissions: [
      Permission.match_create,
      Permission.match_edit,
      Permission.match_delete,
      Permission.match_result_record,
      Permission.practice_create,
      Permission.practice_edit,
      Permission.practice_delete,
      Permission.attendance_manage,
    ],
  },
  {
    label: "Availability",
    permissions: [Permission.availability_manage_self, Permission.availability_manage_others],
  },
  {
    label: "Venues",
    permissions: [Permission.venue_create, Permission.venue_edit, Permission.venue_delete],
  },
  {
    label: "Recruitment",
    permissions: [Permission.recruitment_view, Permission.recruitment_manage, Permission.recruitment_delete],
  },
  {
    label: "Announcements",
    permissions: [Permission.announcement_create, Permission.announcement_pin, Permission.announcement_delete],
  },
  {
    label: "Notifications",
    permissions: [Permission.notification_send_broadcast],
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  org_settings_manage: "Manage org settings",
  org_roles_manage: "Manage roles & permissions",
  org_members_manage: "Manage member roles",
  org_members_invite: "Invite new members",
  org_members_remove: "Remove members",
  audit_log_view: "View audit log",
  team_create: "Create teams",
  team_edit: "Edit teams",
  team_delete: "Delete teams",
  roster_manage: "Manage roster (add/remove players, positions)",
  team_members_invite: "Invite players to own team(s) via link",
  match_create: "Create matches",
  match_edit: "Edit matches",
  match_delete: "Delete matches",
  match_result_record: "Record match results",
  practice_create: "Create practices/scrims",
  practice_edit: "Edit practices/scrims",
  practice_delete: "Delete practices/scrims",
  attendance_manage: "Manage attendance",
  availability_manage_self: "Manage own availability",
  availability_manage_others: "Manage others' availability",
  venue_create: "Create venues",
  venue_edit: "Edit venues",
  venue_delete: "Delete venues",
  recruitment_view: "View recruitment pipeline",
  recruitment_manage: "Manage recruitment prospects",
  recruitment_delete: "Delete recruitment prospects",
  announcement_create: "Create announcements",
  announcement_pin: "Pin announcements",
  announcement_delete: "Delete announcements",
  notification_send_broadcast: "Send broadcast notifications",
};

/** Default permission grants for system-seeded roles, applied at org creation time. */
export const ROLE_PRESETS: Record<string, { description: string; color: string; permissions: Permission[] }> = {
  Owner: {
    description: "Full control over the organization.",
    color: "#ef4444",
    permissions: ALL_PERMISSIONS,
  },
  Coach: {
    description: "Runs the team day-to-day: roster, scheduling, and recruitment input.",
    color: "#3b82f6",
    permissions: [
      Permission.roster_manage,
      Permission.match_create,
      Permission.match_edit,
      Permission.match_delete,
      Permission.match_result_record,
      Permission.practice_create,
      Permission.practice_edit,
      Permission.practice_delete,
      Permission.attendance_manage,
      Permission.availability_manage_others,
      Permission.venue_create,
      Permission.venue_edit,
      Permission.recruitment_view,
      Permission.recruitment_manage,
      Permission.announcement_create,
    ],
  },
  Manager: {
    description: "Handles org logistics: members, venues, recruitment, and communications.",
    color: "#8b5cf6",
    permissions: [
      Permission.org_members_invite,
      Permission.roster_manage,
      Permission.venue_create,
      Permission.venue_edit,
      Permission.venue_delete,
      Permission.recruitment_view,
      Permission.recruitment_manage,
      Permission.recruitment_delete,
      Permission.announcement_create,
      Permission.announcement_pin,
      Permission.announcement_delete,
      Permission.audit_log_view,
    ],
  },
  Captain: {
    description: "Team leader on the roster: helps schedule and track attendance.",
    color: "#f59e0b",
    permissions: [
      Permission.match_edit,
      Permission.practice_create,
      Permission.practice_edit,
      Permission.attendance_manage,
      Permission.availability_manage_self,
      Permission.team_members_invite,
    ],
  },
  Player: {
    description: "Roster player.",
    color: "#22c55e",
    permissions: [Permission.availability_manage_self],
  },
  Analyst: {
    description: "Scouts opponents and prospects.",
    color: "#06b6d4",
    permissions: [Permission.recruitment_view, Permission.recruitment_manage, Permission.match_edit],
  },
};
