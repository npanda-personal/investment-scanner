CREATE TABLE IF NOT EXISTS "app_users" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT,
  "passwordHash" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_users_email_key" ON "app_users"("email");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "alertEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
  "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_key" ON "notification_preferences"("userId");
CREATE INDEX IF NOT EXISTS "notification_events_userId_createdAt_idx" ON "notification_events"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "notification_events_status_idx" ON "notification_events"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_userId_fkey'
  ) THEN
    ALTER TABLE "notification_preferences"
      ADD CONSTRAINT "notification_preferences_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_events_userId_fkey'
  ) THEN
    ALTER TABLE "notification_events"
      ADD CONSTRAINT "notification_events_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
