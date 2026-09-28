-- =============================================================================
-- Migration: Create organization.employee_permissions Table
-- Description: Stores employee-wise page & action permissions and per-action data scope
-- Security: Revokes direct read/write access from anon/authenticated clients.
--           All operations must go through secured backend APIs via service_role/postgres.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS organization;

CREATE TABLE IF NOT EXISTS organization.employee_permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         TEXT NOT NULL,
    permission_key      VARCHAR(255) NOT NULL,
    module_key          VARCHAR(100) NOT NULL,
    page_key            VARCHAR(100) NOT NULL,
    action_key          VARCHAR(100) NOT NULL,
    is_granted          BOOLEAN NOT NULL DEFAULT TRUE,
    data_scope          VARCHAR(50) NOT NULL DEFAULT 'OWN', -- 'OWN' | 'TEAM' | 'ORG'
    is_customized       BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_permission UNIQUE (employee_id, permission_key)
);

-- Foreign Key to hrms.employees if hrms schema exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'hrms' AND table_name = 'employees'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_employee_permissions_employee'
        ) THEN
            ALTER TABLE organization.employee_permissions
            ADD CONSTRAINT fk_employee_permissions_employee
            FOREIGN KEY (employee_id) REFERENCES hrms.employees (employee_id) ON DELETE CASCADE;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_emp_permissions_lookup 
    ON organization.employee_permissions (employee_id, permission_key, is_granted);
CREATE INDEX IF NOT EXISTS idx_emp_permissions_emp_id 
    ON organization.employee_permissions (employee_id);

-- Strict Security Grants: Revoke direct client access (anon & authenticated)
-- Access is granted strictly through authenticated FastAPI endpoints using service_role / postgres
REVOKE ALL PRIVILEGES ON TABLE organization.employee_permissions FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE organization.employee_permissions TO service_role, postgres;
