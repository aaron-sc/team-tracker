-- Email verification is new — grandfather in every account that already
-- existed before this feature shipped, so nobody with a working account
-- gets locked out by a verification email they never had a chance to click.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
