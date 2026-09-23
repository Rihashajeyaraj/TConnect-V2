-- =============================================================================
-- MASTER SUPABASE DATABASE SCHEMA & MIGRATION SCRIPT
-- TwiteConnect — Smart Radar Map, Live GPS Tracking, & Executive Reports
-- Run this script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Run)
-- =============================================================================

-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS hrms;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS system;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. HRMS EMPLOYEES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             TEXT UNIQUE NOT NULL,
    employee_code           TEXT UNIQUE,
    user_id                 TEXT,
    auth_user_id            TEXT,
    name                    TEXT NOT NULL,
    full_name               TEXT,
    email                   TEXT UNIQUE NOT NULL,
    phone                   TEXT,
    role                    TEXT DEFAULT 'Sales Executive',
    designation             TEXT DEFAULT 'Sales Executive',
    department              TEXT DEFAULT 'Sales & BD',
    dept                    TEXT DEFAULT 'Sales & BD',
    status                  TEXT DEFAULT 'Active',
    work_location           TEXT DEFAULT 'Chennai',
    work_mode               TEXT DEFAULT 'Field',
    reporting_manager       TEXT,
    reporting_manager_id    TEXT,
    reporting_manager_name  TEXT,
    reporting_manager_email TEXT,
    reporting_team_lead     TEXT,
    reporting_team_lead_name TEXT,
    reporting_team_lead_email TEXT,
    profile_photo           TEXT,
    documents               JSONB DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hrms_employees_id ON hrms.employees (employee_id);
CREATE INDEX IF NOT EXISTS idx_hrms_employees_email ON hrms.employees (email);

-- =============================================================================
-- 2. EMPLOYEE LIVE LOCATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.employee_locations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   TEXT UNIQUE NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    accuracy      DOUBLE PRECISION DEFAULT 0.0,
    speed         DOUBLE PRECISION,
    heading       DOUBLE PRECISION,
    is_online     BOOLEAN DEFAULT TRUE,
    last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_locations_emp_id ON hrms.employee_locations (employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_locations_last_seen ON hrms.employee_locations (last_seen_at DESC);

-- =============================================================================
-- 3. TRACKING SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.tracking_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             TEXT NOT NULL,
    manager_id              TEXT,
    start_time              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time                TIMESTAMPTZ,
    start_latitude          DOUBLE PRECISION,
    start_longitude         DOUBLE PRECISION,
    end_latitude            DOUBLE PRECISION,
    end_longitude           DOUBLE PRECISION,
    status                  TEXT NOT NULL DEFAULT 'active', -- active | ended | stale
    total_distance          DOUBLE PRECISION DEFAULT 0,
    client_id               TEXT,
    client_name             TEXT,
    company_name            TEXT,
    client_address          TEXT,
    client_latitude         DOUBLE PRECISION,
    client_longitude        DOUBLE PRECISION,
    route_polyline          TEXT,
    client_reached          BOOLEAN DEFAULT FALSE,
    reached_at              TIMESTAMPTZ,
    left_client             BOOLEAN DEFAULT FALSE,
    left_at                 TIMESTAMPTZ,
    last_stationary_alert   INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on tracking_sessions for backward compatibility
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_latitude DOUBLE PRECISION;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_longitude DOUBLE PRECISION;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS client_reached BOOLEAN DEFAULT FALSE;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS reached_at TIMESTAMPTZ;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS left_client BOOLEAN DEFAULT FALSE;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE hrms.tracking_sessions ADD COLUMN IF NOT EXISTS last_stationary_alert INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_emp ON hrms.tracking_sessions (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status ON hrms.tracking_sessions (status);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_start ON hrms.tracking_sessions (start_time DESC);

-- =============================================================================
-- 4. TRACKING BREADCRUMB LOCATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.tracking_locations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_session_id  UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id          TEXT NOT NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    accuracy             DOUBLE PRECISION,
    speed                DOUBLE PRECISION,
    heading              DOUBLE PRECISION,
    recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_locations_sess ON hrms.tracking_locations (tracking_session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_emp ON hrms.tracking_locations (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_locations_time ON hrms.tracking_locations (recorded_at DESC);

-- =============================================================================
-- 5. TRACKING EVENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.tracking_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    manager_id  TEXT,
    event_type  TEXT NOT NULL, -- CLIENT_REACHED, CLIENT_LEFT, STATIONARY_5_MIN, ROUTE_DEVIATION, VISIT_STARTED, VISIT_COMPLETED
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    client_id   TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_sess ON hrms.tracking_events (session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_emp ON hrms.tracking_events (employee_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON hrms.tracking_events (created_at DESC);

-- =============================================================================
-- 6. EXECUTIVE SALES REPORTS TABLE (WEEKLY / MONTHLY TO CEO)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.sales_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type   TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
    report_period TEXT NOT NULL,
    manager_id    TEXT NOT NULL,
    manager_name  TEXT NOT NULL,
    manager_email TEXT NOT NULL,
    metrics       JSONB NOT NULL,
    status        TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Pending Review', 'Reviewed')),
    ceo_remarks   TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    submitted_at  TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_reports_period ON hrms.sales_reports (report_period);
CREATE INDEX IF NOT EXISTS idx_sales_reports_mgr ON hrms.sales_reports (manager_email);

-- Fallback tables in crm and public schemas
CREATE TABLE IF NOT EXISTS crm.sales_reports (LIKE hrms.sales_reports INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.sales_reports (LIKE hrms.sales_reports INCLUDING ALL);

-- =============================================================================
-- 7. EOD DAILY WORK REPORTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.eod_reports (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id        TEXT NOT NULL,
    employee_name      TEXT NOT NULL,
    executive_name     TEXT,
    executive_email    TEXT,
    employee_code      TEXT,
    report_date        DATE DEFAULT CURRENT_DATE,
    visits_count       INTEGER DEFAULT 0,
    followups_scheduled INTEGER DEFAULT 0,
    tasks_accomplished TEXT,
    key_highlights     TEXT,
    blockers           TEXT,
    status             TEXT DEFAULT 'Pending Review',
    manager_comment    TEXT DEFAULT '',
    ceo_remarks        TEXT DEFAULT '',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. FIELD VISITS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS crm.field_visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        TEXT UNIQUE,
    client_name     TEXT NOT NULL,
    company_name    TEXT,
    customer_name   TEXT,
    employee_id     TEXT NOT NULL,
    sales_rep_id    TEXT,
    visitor_name    TEXT,
    location        TEXT,
    address         TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    check_in_time   TIMESTAMPTZ DEFAULT NOW(),
    check_out_time  TIMESTAMPTZ,
    duration        TEXT,
    status          TEXT DEFAULT 'Completed',
    purpose         TEXT,
    remarks         TEXT,
    date            DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. EXECUTIVE TRIP REPORTS TABLE (TRIP SUMMARY & METRICS SCORECARD)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.executive_trip_reports (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id        TEXT NOT NULL,
    employee_code      TEXT,
    employee_name      TEXT NOT NULL,
    report_date        DATE DEFAULT CURRENT_DATE,
    total_distance_km  DOUBLE PRECISION DEFAULT 0.0,
    trip_duration      TEXT DEFAULT '0h 0m',
    peak_speed_kmh     DOUBLE PRECISION DEFAULT 0.0,
    avg_speed_kmh      DOUBLE PRECISION DEFAULT 0.0,
    overspeed_warnings INTEGER DEFAULT 0,
    trip_start_time    TIMESTAMPTZ,
    trip_start_address TEXT,
    trip_end_time      TIMESTAMPTZ,
    trip_end_address   TEXT,
    dest_arrival_time  TIMESTAMPTZ,
    dest_address       TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_reports_emp_date ON hrms.executive_trip_reports (employee_id, report_date DESC);

-- =============================================================================
-- 10. IDLE PERIOD AUDIT LOGS TABLE (STATIONARY STOPS > 5 MINS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hrms.idle_periods (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID REFERENCES hrms.tracking_sessions(id) ON DELETE CASCADE,
    employee_id        TEXT NOT NULL,
    employee_name      TEXT,
    start_time         TIMESTAMPTZ NOT NULL,
    end_time           TIMESTAMPTZ NOT NULL,
    duration_mins      INTEGER NOT NULL,
    duration_formatted TEXT,
    location_address   TEXT,
    latitude           DOUBLE PRECISION NOT NULL,
    longitude          DOUBLE PRECISION NOT NULL,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idle_periods_emp ON hrms.idle_periods (employee_id);
CREATE INDEX IF NOT EXISTS idx_idle_periods_sess ON hrms.idle_periods (session_id);

-- =============================================================================
-- 11. ENABLE SUPABASE REALTIME REPLICATION ON TRACKING TABLES
-- =============================================================================
ALTER TABLE hrms.employee_locations REPLICA IDENTITY FULL;
ALTER TABLE hrms.tracking_sessions  REPLICA IDENTITY FULL;
ALTER TABLE hrms.tracking_locations REPLICA IDENTITY FULL;
ALTER TABLE hrms.tracking_events    REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'hrms' AND tablename = 'employee_locations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.employee_locations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'hrms' AND tablename = 'tracking_sessions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_sessions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'hrms' AND tablename = 'tracking_locations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_locations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'hrms' AND tablename = 'tracking_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE hrms.tracking_events;
    END IF;
END $$;

-- =============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- =============================================================================
ALTER TABLE hrms.employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.tracking_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.tracking_locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.tracking_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.sales_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.eod_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.executive_trip_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.idle_periods           ENABLE ROW LEVEL SECURITY;

-- Grant Full Privileges to Roles
GRANT ALL ON ALL TABLES IN SCHEMA hrms TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA crm TO anon, authenticated, service_role, postgres;

-- Open Read/Write Policies for Authenticated Users
DROP POLICY IF EXISTS "authenticated_read_employees" ON hrms.employees;
CREATE POLICY "authenticated_read_employees" ON hrms.employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_locations" ON hrms.employee_locations;
CREATE POLICY "authenticated_read_locations" ON hrms.employee_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_locations_upsert" ON hrms.employee_locations;
CREATE POLICY "authenticated_all_locations_upsert" ON hrms.employee_locations FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_sessions" ON hrms.tracking_sessions;
CREATE POLICY "authenticated_read_sessions" ON hrms.tracking_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_sessions" ON hrms.tracking_sessions;
CREATE POLICY "authenticated_all_sessions" ON hrms.tracking_sessions FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_breadcrumbs" ON hrms.tracking_locations;
CREATE POLICY "authenticated_read_breadcrumbs" ON hrms.tracking_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_breadcrumbs" ON hrms.tracking_locations;
CREATE POLICY "authenticated_all_breadcrumbs" ON hrms.tracking_locations FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_events" ON hrms.tracking_events;
CREATE POLICY "authenticated_read_events" ON hrms.tracking_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_all_events" ON hrms.tracking_events;
CREATE POLICY "authenticated_all_events" ON hrms.tracking_events FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_sales_reports" ON hrms.sales_reports;
CREATE POLICY "authenticated_sales_reports" ON hrms.sales_reports FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_executive_trip_reports" ON hrms.executive_trip_reports;
CREATE POLICY "authenticated_executive_trip_reports" ON hrms.executive_trip_reports FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_idle_periods" ON hrms.idle_periods;
CREATE POLICY "authenticated_idle_periods" ON hrms.idle_periods FOR ALL TO authenticated USING (true);

-- Done!
