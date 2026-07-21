import type { Permission } from "@/lib/generated/prisma/enums";

export type SessionMembership = {
  membershipId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  roleId: string;
  roleName: string;
  permissions: Permission[];
  teamIds: string[];
};
