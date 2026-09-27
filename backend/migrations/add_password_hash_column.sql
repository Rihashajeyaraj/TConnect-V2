-- =============================================================================
-- Migration: Add password_hash Column to hrms.employees
-- Description: Adds a nullable password_hash column for Bcrypt password storage
-- Note: Does NOT drop legacy password columns (accessPassword / password)
-- =============================================================================

ALTER TABLE hrms.employees 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index on employee email for efficient lookup during password auth
CREATE INDEX IF NOT EXISTS idx_hrms_employees_email_lower ON hrms.employees (LOWER(email));
