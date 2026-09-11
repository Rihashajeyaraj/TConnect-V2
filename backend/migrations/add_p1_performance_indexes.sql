-- ── TwiteConnect P1 Performance Migration: PostgreSQL Composite Indexes ──

-- 1. CRM Leads Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_status_created 
ON crm.leads (assigned_to, status, created_at);

CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_email 
ON crm.leads (assigned_to_email);

CREATE INDEX IF NOT EXISTS idx_public_leads_assigned_status_created 
ON public.leads (assigned_to, status, created_at);

-- 2. CRM Customers Indexes
CREATE INDEX IF NOT EXISTS idx_crm_customers_created_lead 
ON crm.customers (created_by, lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_customers_assigned_email 
ON crm.customers (assigned_to_email);

CREATE INDEX IF NOT EXISTS idx_public_customers_created_lead 
ON public.customers (created_by, lead_id);

-- 3. HRMS Employee Locations Indexes
CREATE INDEX IF NOT EXISTS idx_hrms_employee_locations_emp_updated 
ON hrms.employee_locations (employee_id, updated_at);

-- 4. HRMS Tracking Locations Indexes
CREATE INDEX IF NOT EXISTS idx_hrms_tracking_locations_sess_recorded 
ON hrms.tracking_locations (tracking_session_id, recorded_at);

-- 5. HRMS Attendance Indexes
CREATE INDEX IF NOT EXISTS idx_hrms_attendance_emp_date 
ON hrms.attendance (employee_id, date);
