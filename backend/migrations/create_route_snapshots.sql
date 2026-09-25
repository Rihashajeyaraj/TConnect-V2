-- ============================================================
-- Route Snapshots Table & 30-Day Automatic Cleanup Schema
-- Run this in Supabase SQL Editor or Database Query Tool
-- ============================================================

-- 1. Create hrms.route_snapshots table
CREATE TABLE IF NOT EXISTS hrms.route_snapshots (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id       TEXT NOT NULL,
    employee_name     TEXT,
    snapshot_type     TEXT NOT NULL,        -- 'START_LOCATION' | 'MID_TRIP' | 'DESTINATION_REACHED'
    badge_number      INTEGER DEFAULT 1,     -- 1, 2, or 3
    title             TEXT NOT NULL,         -- 'Trip Started', 'Mid Trip', 'Destination Reached'
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude          DOUBLE PRECISION NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    address           TEXT,
    image_url         TEXT,                  -- Static Map URL or Supabase Storage bucket path
    image_data        TEXT,                  -- Base64 encoded snapshot thumbnail (optional)
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- 2. Create public.route_snapshots table (for public schema fallback access)
CREATE TABLE IF NOT EXISTS public.route_snapshots (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        TEXT,
    employee_id       TEXT NOT NULL,
    employee_name     TEXT,
    snapshot_type     TEXT NOT NULL,
    badge_number      INTEGER DEFAULT 1,
    title             TEXT NOT NULL,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude          DOUBLE PRECISION NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    address           TEXT,
    image_url         TEXT,
    image_data        TEXT,
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- 3. Indexes for fast lookups & retention purging
CREATE INDEX IF NOT EXISTS idx_route_snapshots_session     ON hrms.route_snapshots (session_id);
CREATE INDEX IF NOT EXISTS idx_route_snapshots_employee    ON hrms.route_snapshots (employee_id);
CREATE INDEX IF NOT EXISTS idx_route_snapshots_created_at  ON hrms.route_snapshots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_snapshots_expires_at  ON hrms.route_snapshots (expires_at);

CREATE INDEX IF NOT EXISTS idx_pub_route_snapshots_session  ON public.route_snapshots (session_id);
CREATE INDEX IF NOT EXISTS idx_pub_route_snapshots_employee ON public.route_snapshots (employee_id);
CREATE INDEX IF NOT EXISTS idx_pub_route_snapshots_expires  ON public.route_snapshots (expires_at);

-- 4. Enable Supabase Realtime (Optional)
ALTER TABLE hrms.route_snapshots REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.route_snapshots;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Stored Function to Automatically Clear Snapshots Older Than 30 Days
CREATE OR REPLACE FUNCTION hrms.cleanup_expired_route_snapshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    pub_deleted_count INTEGER := 0;
BEGIN
    -- Delete from hrms.route_snapshots where creation date > 30 days or expired
    DELETE FROM hrms.route_snapshots
    WHERE created_at < (NOW() - INTERVAL '30 days')
       OR expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete from public.route_snapshots
    DELETE FROM public.route_snapshots
    WHERE created_at < (NOW() - INTERVAL '30 days')
       OR expires_at <= NOW();
    GET DIAGNOSTICS pub_deleted_count = ROW_COUNT;

    RETURN deleted_count + pub_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to automatically run retention cleanup on new snapshot insertion
CREATE OR REPLACE FUNCTION hrms.trigger_auto_prune_route_snapshots()
RETURNS TRIGGER AS $$
BEGIN
    -- Prune expired records older than 30 days automatically
    DELETE FROM hrms.route_snapshots
    WHERE created_at < (NOW() - INTERVAL '30 days') OR expires_at <= NOW();

    DELETE FROM public.route_snapshots
    WHERE created_at < (NOW() - INTERVAL '30 days') OR expires_at <= NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_prune_snapshots ON hrms.route_snapshots;
CREATE TRIGGER trg_auto_prune_snapshots
AFTER INSERT ON hrms.route_snapshots
FOR EACH STATEMENT
EXECUTE FUNCTION hrms.trigger_auto_prune_route_snapshots();

-- 7. Optional pg_cron job schedule (Runs daily at 3:00 AM if pg_cron is enabled in Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'daily-cleanup-route-snapshots',
            '0 3 * * *',
            'SELECT hrms.cleanup_expired_route_snapshots();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
