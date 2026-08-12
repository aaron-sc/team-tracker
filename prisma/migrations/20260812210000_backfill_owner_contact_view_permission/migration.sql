-- org_members_contact_view is new — grant it to every org's existing system
-- "Owner" role, since ROLE_PRESETS only applies at org-creation time and
-- these roles already existed before this permission did.
INSERT INTO "RolePermission" ("id", "roleId", "permission")
SELECT lower(hex(randomblob(16))), r."id", 'org_members_contact_view'
FROM "Role" r
WHERE r."name" = 'Owner' AND r."isSystem" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r."id" AND rp."permission" = 'org_members_contact_view'
  );
