-- Epic 12: Subscription, feature gating, usage metering, and SaaS readiness.

CREATE TABLE IF NOT EXISTS "app_users" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_users_email_key" ON "app_users"("email");

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_userId_key" ON "user_subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "user_subscriptions_planCode_idx" ON "user_subscriptions"("planCode");

CREATE TABLE IF NOT EXISTS "usage_counters" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_counters_userId_key_periodStart_key" ON "usage_counters"("userId", "key", "periodStart");
CREATE INDEX IF NOT EXISTS "usage_counters_key_periodStart_idx" ON "usage_counters"("key", "periodStart");

ALTER TABLE "portfolios" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "watchlists" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "alert_rules" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "backtest_strategies" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "backtest_runs" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "portfolios_userId_idx" ON "portfolios"("userId");
CREATE INDEX IF NOT EXISTS "watchlists_userId_idx" ON "watchlists"("userId");
CREATE INDEX IF NOT EXISTS "alert_rules_userId_idx" ON "alert_rules"("userId");
CREATE INDEX IF NOT EXISTS "backtest_strategies_userId_idx" ON "backtest_strategies"("userId");
CREATE INDEX IF NOT EXISTS "backtest_runs_userId_idx" ON "backtest_runs"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_userId_fkey') THEN
    ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_userId_fkey') THEN
    ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_userId_fkey') THEN
    ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlists_userId_fkey') THEN
    ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_rules_userId_fkey') THEN
    ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'backtest_strategies_userId_fkey') THEN
    ALTER TABLE "backtest_strategies" ADD CONSTRAINT "backtest_strategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'backtest_runs_userId_fkey') THEN
    ALTER TABLE "backtest_runs" ADD CONSTRAINT "backtest_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
