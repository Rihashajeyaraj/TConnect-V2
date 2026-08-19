-- ============================================================
-- Live GPS Tracking Schema — TwiteConnect
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. tracking_sessions — one row per work session per executive
-- ============================================================
CREATE TABLE IF NOT EXISTS hrms.tracking_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id       TEXT NOT NULL,      -- hrms.employees.employee_id
    manager_id        TEXT,               -- hrms.employees.employee_id of manager
    start_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time          TIMESTAMPTZ,
    start_latitude    DOUBLE PRECISION,
    start_longitude   DOUBLE PRECISION,
    end_latitude      DOUBLE PRECISION,
    end_longitude     DOUBLE PRECISION,
    status            TEXT NOT NULL DEFAULT 'active',  -- active | ended | stale
    total_distance    DOUBLE PRECISION DEFAULT 0,      -- metres
    client_id         TEXT,
    client_name       TEXT,
    company_name      TEXT,
    client_address    TEXT,
    client_latitude   DOUBLE PRECISION,
    client_longitude  DOUBLE PRECISION,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_employee ON hrms.tracking_sessions (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status  ON hrms.tracking_sessions (status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_start   ON hrms.tracking_sessions (start_time DESC);

-- 2. tracking_locations — breadcrumb log; Realtime enabled
-- ============================================================
CREATE TABLE IF NOT EXISTS hrms.tracking_locations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_session_id  UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id          TEXT NOT NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    accuracy             DOUBLE PRECISION,   -- metres
    speed                DOUBLE PRECISION,   -- m/s
    heading              DOUBLE PRECISION,   -- degrees 0-360
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_locations_session    ON hrms.tracking_locations (tracking_session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_employee   ON hrms.tracking_locations (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_recorded   ON hrms.tracking_locations (recorded_at DESC);

-- 3. Enable Supabase Realtime on tracking tables
-- ============================================================
-- Requires Supabase Dashboard → Database → Replication → tracking_locations and tracking_sessions enabled.
-- Or run:
ALTER TABLE hrms.tracking_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_locations;

ALTER TABLE hrms.tracking_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_sessions;

-- 4. Row Level Security
-- ============================================================
ALTER TABLE hrms.tracking_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.tracking_locations ENABLE ROW LEVEL SECURITY;

-- Executives: only manage own sessions
CREATE POLICY "executive_own_sessions" ON hrms.tracking_sessions
    FOR ALL
    USING (employee_id = auth.uid()::text OR employee_id IN (
        SELECT employee_id FROM hrms.employees
        WHERE user_id = auth.uid()::text OR auth_user_id = auth.uid()::text
    ));

-- Managers: read sessions of assigned executives
-- Managers: read sessions of assigned executives
CREATE POLICY "manager_read_team_sessions" ON hrms.tracking_sessions
    FOR SELECT
    USING (
        employee_id IN (
            SELECT employee_id FROM hrms.employees
            WHERE user_id = auth.uid()::text OR auth_user_id = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM hrms.employees subordinate 
            JOIN hrms.employees manager ON (
                subordinate.reporting_manager = manager.employee_id 
                OR subordinate.reporting_manager_id = manager.employee_id 
                OR subordinate.reporting_manager_email = manager.email
            )
            WHERE subordinate.employee_id = hrms.tracking_sessions.employee_id 
              AND (
                  manager.user_id = auth.uid()::text 
                  OR manager.auth_user_id = auth.uid()::text 
                  OR manager.employee_id = auth.uid()::text
              )
        )
        OR auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO')
    );

-- Executives: only insert own breadcrumbs
CREATE POLICY "executive_own_locations" ON hrms.tracking_locations
    FOR INSERT
    WITH CHECK (employee_id IN (
        SELECT employee_id FROM hrms.employees
        WHERE user_id = auth.uid()::text OR auth_user_id = auth.uid()::text
    ));

-- Everyone: read locations of authorised employees
CREATE POLICY "manager_read_team_locations" ON hrms.tracking_locations
    FOR SELECT
    USING (
        employee_id IN (
            SELECT employee_id FROM hrms.employees
            WHERE user_id = auth.uid()::text OR auth_user_id = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM hrms.employees subordinate 
            JOIN hrms.employees manager ON (
                subordinate.reporting_manager = manager.employee_id 
                OR subordinate.reporting_manager_id = manager.employee_id 
                OR subordinate.reporting_manager_email = manager.email
            )
            WHERE subordinate.employee_id = hrms.tracking_locations.employee_id 
              AND (
                  manager.user_id = auth.uid()::text 
                  OR manager.auth_user_id = auth.uid()::text 
                  OR manager.employee_id = auth.uid()::text
              )
        )
        OR auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO')
    );

-- 5. Auto-mark stale sessions (optional pg_cron job — run manually if pg_cron available)
-- UPDATE hrms.tracking_sessions SET status = 'stale'
-- WHERE status = 'active' AND updated_at < NOW() - INTERVAL '30 minutes';
