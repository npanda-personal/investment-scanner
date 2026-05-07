-- Epic 13: Authentication identity fields.

CREATE TABLE IF NOT EXISTS "app_users" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_users_email_key" ON "app_users"("email");

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
