-- asset_manage is new — grant it to every org's existing system "Owner" and
-- "Manager" roles, since ROLE_PRESETS only applies at org-creation time and
-- these roles already existed before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'asset_manage'
FROM "Role" r
WHERE r."name" IN ('Owner', 'Manager') AND r."isSystem" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'asset_manage'
  );
