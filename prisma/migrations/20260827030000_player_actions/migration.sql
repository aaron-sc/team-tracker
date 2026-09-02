-- CreateTable
CREATE TABLE "PlayerAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "teamMembershipId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerAction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerAction_teamMembershipId_fkey" FOREIGN KEY ("teamMembershipId") REFERENCES "TeamMembership" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- player_actions_manage is new — grant it to every org's existing system Owner, Coach, and
-- Manager roles, since ROLE_PRESETS only applies at org-creation time and these roles already
-- existed before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'player_actions_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Coach', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'player_actions_manage'
  );
