-- ============================================================
--  TwiteConnect — Web Push Subscriptions Table
--  Run this in Supabase SQL Editor:
--  https://supabase.com/dashboard/project/_/sql/new
--
--  Schema: system
--  Purpose: Store per-device Web Push subscriptions so the
--           backend can dispatch background push notifications
--           (and update app-icon badges) while the app is closed.
-- ============================================================

-- Ensure system schema exists (idempotent)
CREATE SCHEMA IF NOT EXISTS system;

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS system.push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,          -- auth.uid() or employee_id
  user_email   TEXT,                          -- for lookup by email
  endpoint     TEXT        NOT NULL UNIQUE,   -- Browser push endpoint URL
  p256dh       TEXT        NOT NULL,          -- Browser public key
  auth         TEXT        NOT NULL,          -- Browser auth secret
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups (one user → multiple devices)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON system.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email
  ON system.push_subscriptions (user_email)
  WHERE user_email IS NOT NULL;

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION system.update_push_subscription_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at
  ON system.push_subscriptions;

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON system.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION system.update_push_subscription_timestamp();

-- Grant access to service_role (backend uses service role key)
GRANT ALL ON system.push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.push_subscriptions TO authenticated;

-- RLS: users can only see/manage their own subscriptions
ALTER TABLE system.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_user_access"
  ON system.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid()::text OR user_email = auth.jwt()->>'email')
  WITH CHECK (user_id = auth.uid()::text OR user_email = auth.jwt()->>'email');

-- Service role bypasses RLS automatically (needed for backend dispatch)
