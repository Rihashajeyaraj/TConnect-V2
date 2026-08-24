-- ============================================================
-- TwiteConnect Real-Time Tracking Events & Session Updates
-- Path: backend/migrations/create_tracking_events.sql
-- ============================================================

-- 1. Ensure tracking_sessions has all expected columns
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_latitude DOUBLE PRECISION;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_longitude DOUBLE PRECISION;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS last_stationary_alert INTEGER DEFAULT 0;

-- 2. Create tracking_events table
CREATE TABLE IF NOT EXISTS hrms.tracking_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    manager_id  TEXT,
    event_type  TEXT NOT NULL, -- CLIENT_REACHED, CLIENT_LEFT, STATIONARY_2_MIN, ROUTE_DEVIATION, etc.
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    client_id   TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON hrms.tracking_events (session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_employee ON hrms.tracking_events (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created_at ON hrms.tracking_events (created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE hrms.tracking_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "executive_insert_own_events" ON hrms.tracking_events;
DROP POLICY IF EXISTS "manager_read_team_events" ON hrms.tracking_events;

-- Create Policies
CREATE POLICY "executive_insert_own_events" ON hrms.tracking_events
    FOR INSERT
    TO authenticated
    WITH CHECK (employee_id IN (
        SELECT employee_id FROM hrms.employees
        WHERE user_id = auth.uid()::text OR auth_user_id = auth.uid()::text
    ));

CREATE POLICY "manager_read_team_events" ON hrms.tracking_events
    FOR SELECT
    TO authenticated
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
            WHERE subordinate.employee_id = hrms.tracking_events.employee_id 
              AND (
                  manager.user_id = auth.uid()::text 
                  OR manager.auth_user_id = auth.uid()::text 
                  OR manager.employee_id = auth.uid()::text
              )
        )
        OR auth.jwt() ->> 'role' IN ('Admin', 'Super Admin', 'System Admin', 'CEO')
    );

-- 5. Grant access privileges
GRANT ALL PRIVILEGES ON TABLE hrms.tracking_events TO anon, authenticated, service_role, postgres;

-- 6. Add hrms.tracking_events to Supabase Realtime publication
ALTER TABLE hrms.tracking_events REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'hrms' 
          AND tablename = 'tracking_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_events;
    END IF;
END $$;
