-- Epic 13: Authentication identity fields.

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
