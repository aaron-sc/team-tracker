-- team_members_invite is new — grant it to every org's existing system
-- "Captain" role, since ROLE_PRESETS only applies at org-creation time and
-- these roles already existed before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'team_members_invite'
FROM "Role" r
WHERE r."name" = 'Captain' AND r."isSystem" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'team_members_invite'
  );
