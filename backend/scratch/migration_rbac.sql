-- ============================================================
-- TwiteConnect: RBAC Schema Migration
-- ============================================================

-- Create Roles table
CREATE TABLE IF NOT EXISTS organization.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Permissions table
CREATE TABLE IF NOT EXISTS organization.permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    permission_key TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Role-Permissions table
CREATE TABLE IF NOT EXISTS organization.role_permissions (
    role_id TEXT REFERENCES organization.roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES organization.permissions(id) ON DELETE CASCADE,
    access_scope TEXT NOT NULL DEFAULT 'All', -- 'Own', 'Assigned', 'Team', 'Company', 'All'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (role_id, permission_id)
);

-- Create User-Roles table
CREATE TABLE IF NOT EXISTS organization.user_roles (
    user_id UUID NOT NULL,
    role_id TEXT REFERENCES organization.roles(id) ON DELETE CASCADE,
    assigned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- SEED DATA: Standard Roles
-- ============================================================
INSERT INTO organization.roles (id, name, description, is_system_role, is_active)
VALUES 
('super_admin', 'Super Admin', 'Unrestricted access to all company configurations, database tables, settings and high-level operations.', TRUE, TRUE),
('ceo', 'CEO / Founder', 'Access company dashboard, all employee performance summaries, company reports, and target metrics.', TRUE, TRUE),
('admin', 'Admin', 'Manage user accounts, roles and system permission mapping, branches, and master business configurations.', TRUE, TRUE),
('sales_manager', 'Sales Manager', 'Oversee sales executives, monitor team performance, assign leads, approve visits and team expenses.', TRUE, TRUE),
('sales_executive', 'Sales Executive', 'Register field visits, log attendance, capture lead updates, request expense reimbursement, and track personal sales achievements.', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, is_system_role = EXCLUDED.is_system_role;

-- ============================================================
-- SEED DATA: Standard Permissions
-- ============================================================
INSERT INTO organization.permissions (id, module, action, permission_key, description)
VALUES
-- CRM & Leads
('crm_leads_view', 'CRM & Leads', 'View', 'crm.leads.view', 'Allows viewing leads details'),
('crm_leads_create', 'CRM & Leads', 'Create', 'crm.leads.create', 'Allows creating new leads'),
('crm_leads_edit', 'CRM & Leads', 'Edit', 'crm.leads.edit', 'Allows editing leads information'),
('crm_leads_delete', 'CRM & Leads', 'Delete', 'crm.leads.delete', 'Allows deleting leads'),
('crm_leads_assign', 'CRM & Leads', 'Assign', 'crm.leads.assign', 'Allows assigning leads to sales executives'),
('crm_leads_history', 'CRM & Leads', 'View History', 'crm.leads.history', 'Allows viewing lead assignment and status history'),

-- Customers
('crm_customers_view', 'Customers', 'View', 'crm.customers.view', 'Allows viewing customer accounts'),
('crm_customers_create', 'Customers', 'Create', 'crm.customers.create', 'Allows creating new customer records'),
('crm_customers_edit', 'Customers', 'Edit', 'crm.customers.edit', 'Allows modifying customer details'),
('crm_customers_delete', 'Customers', 'Delete', 'crm.customers.delete', 'Allows deleting customer records'),
('crm_customers_convert', 'Customers', 'Convert', 'crm.customers.convert', 'Allows converting a qualified lead into a customer'),

-- Visits
('visit_visits_view', 'Visits', 'View', 'visit.visits.view', 'Allows viewing field visits and schedules'),
('visit_visits_create', 'Visits', 'Create', 'visit.visits.create', 'Allows scheduling a field visit'),
('visit_visits_edit', 'Visits', 'Edit', 'visit.visits.edit', 'Allows editing scheduled visit details'),
('visit_visits_cancel', 'Visits', 'Cancel', 'visit.visits.cancel', 'Allows cancelling scheduled visits'),
('visit_visits_history', 'Visits', 'View History', 'visit.visits.history', 'Allows viewing history/logs of customer visits'),

-- HRMS
('hrms_employees_view', 'HRMS', 'View', 'hrms.employees.view', 'Allows viewing employee lists'),
('hrms_employees_profile_view', 'HRMS', 'View Profile', 'hrms.employees.profile_view', 'Allows viewing detailed employee profiles'),
('hrms_employees_own_profile_edit', 'HRMS', 'Edit Own Profile', 'hrms.employees.own_profile_edit', 'Allows employees to edit their own profile information'),
('hrms_employees_profile_edit', 'HRMS', 'Edit Employee Profile', 'hrms.employees.profile_edit', 'Allows administrators to edit employee profiles'),
('hrms_employees_create', 'HRMS', 'Create', 'hrms.employees.create', 'Allows creating new employee records'),
('hrms_employees_status', 'HRMS', 'Manage Status', 'hrms.employees.status', 'Allows terminating or altering employment status'),
('hrms_employees_reporting', 'HRMS', 'Manage Reporting Manager', 'hrms.employees.reporting', 'Allows mapping reporting lines and manager links'),

-- Attendance
('hrms_attendance_mark', 'Attendance', 'Mark Own', 'hrms.attendance.mark', 'Allows check-in and check-out tracking'),
('hrms_attendance_view_own', 'Attendance', 'View Own', 'hrms.attendance.view_own', 'Allows viewing personal attendance history'),
('hrms_attendance_view_team', 'Attendance', 'View Team', 'hrms.attendance.view_team', 'Allows managers to view team attendance'),
('hrms_attendance_view_all', 'Attendance', 'View All', 'hrms.attendance.view_all', 'Allows viewing all employee attendance'),
('hrms_attendance_edit', 'Attendance', 'Edit', 'hrms.attendance.edit', 'Allows editing attendance records'),

-- Leave Management
('hrms_leaves_apply', 'Leave Management', 'Apply Own', 'hrms.leaves.apply', 'Allows applying for leaves'),
('hrms_leaves_view_own', 'Leave Management', 'View Own', 'hrms.leaves.view_own', 'Allows viewing personal leave requests'),
('hrms_leaves_view_team', 'Leave Management', 'View Team', 'hrms.leaves.view_team', 'Allows viewing team leave calendar'),
('hrms_leaves_approve_team', 'Leave Management', 'Approve Team', 'hrms.leaves.approve_team', 'Allows approving team leave applications'),
('hrms_leaves_approve_all', 'Leave Management', 'Approve All', 'hrms.leaves.approve_all', 'Allows approving any leave applications'),

-- Expenses / Finance
('finance_expenses_view_own', 'Expenses / Finance', 'View Own', 'finance.expenses.view_own', 'Allows viewing personal expense claims'),
('finance_expenses_create', 'Expenses / Finance', 'Create', 'finance.expenses.create', 'Allows submitting new expense claims'),
('finance_expenses_edit_own', 'Expenses / Finance', 'Edit Own', 'finance.expenses.edit_own', 'Allows editing personal expense claims'),
('finance_expenses_view_team', 'Expenses / Finance', 'View Team', 'finance.expenses.view_team', 'Allows viewing team expense claims'),
('finance_expenses_approve', 'Expenses / Finance', 'Approve', 'finance.expenses.approve', 'Allows approving/rejecting expense claims'),
('finance_expenses_reports', 'Expenses / Finance', 'View Financial Reports', 'finance.expenses.reports', 'Allows viewing company expense reports'),

-- Reports
('system_reports_view_own', 'Reports', 'View Own', 'system.reports.view_own', 'Allows viewing personal performance reports'),
('system_reports_view_team', 'Reports', 'View Team', 'system.reports.view_team', 'Allows viewing team performance reports'),
('system_reports_view_company', 'Reports', 'View Company', 'system.reports.view_company', 'Allows viewing company sales and audit reports'),
('system_reports_export', 'Reports', 'Export', 'system.reports.export', 'Allows exporting reports to CSV or PDF'),

-- Smart Client Map
('system_smart_map_view', 'Smart Client Map', 'View Smart Map', 'system.smart_map.view', 'Allows viewing the Smart Map view'),
('system_smart_map_nearby', 'Smart Client Map', 'View Nearby', 'system.smart_map.nearby', 'Allows viewing nearby customers'),
('system_smart_map_assigned', 'Smart Client Map', 'View Assigned', 'system.smart_map.assigned', 'Allows viewing assigned customers on the map'),
('system_smart_map_team', 'Smart Client Map', 'View Team Locations', 'system.smart_map.team', 'Allows viewing active team locations on the map'),

-- Notifications
('system_notifications_view', 'Notifications', 'View', 'system.notifications.view', 'Allows viewing personal notifications'),
('system_notifications_send', 'Notifications', 'Send', 'system.notifications.send', 'Allows broadcasting/sending notifications'),
('system_notifications_manage', 'Notifications', 'Manage', 'system.notifications.manage', 'Allows settings up notification rules'),

-- Company Administration
('organization_company_profile_view', 'Company Administration', 'View Profile', 'organization.company.profile_view', 'Allows viewing company details'),
('organization_company_profile_edit', 'Company Administration', 'Edit Profile', 'organization.company.profile_edit', 'Allows modifying company details'),
('organization_company_branches', 'Company Administration', 'Manage Branches', 'organization.company.branches', 'Allows managing branch details'),
('organization_company_departments', 'Company Administration', 'Manage Departments', 'organization.company.departments', 'Allows managing departments'),
('organization_company_designations', 'Company Administration', 'Manage Designations', 'organization.company.designations', 'Allows managing designations'),
('organization_company_products', 'Company Administration', 'Manage Products & Services', 'organization.company.products', 'Allows managing company products'),

-- User Management
('organization_users_view', 'User Management', 'View', 'organization.users.view', 'Allows viewing users'),
('organization_users_create', 'User Management', 'Create', 'organization.users.create', 'Allows creating new user accounts'),
('organization_users_edit', 'User Management', 'Edit', 'organization.users.edit', 'Allows editing user accounts'),
('organization_users_disable', 'User Management', 'Disable', 'organization.users.disable', 'Allows disabling user accounts'),
('organization_users_assign_roles', 'User Management', 'Assign Roles', 'organization.users.assign_roles', 'Allows assigning roles to users'),
('organization_users_assign_manager', 'User Management', 'Assign Manager', 'organization.users.assign_manager', 'Allows mapping reporting structures'),

-- Audit Logs
('system_audit_view', 'Audit Logs', 'View', 'system.audit.view', 'Allows viewing system audit logs'),
('system_audit_export', 'Audit Logs', 'Export', 'system.audit.export', 'Allows exporting system audit logs'),
('system_audit_manage', 'Audit Logs', 'Manage', 'system.audit.manage', 'Allows archiving or purging audit logs')
ON CONFLICT (id) DO UPDATE 
SET module = EXCLUDED.module, action = EXCLUDED.action, permission_key = EXCLUDED.permission_key, description = EXCLUDED.description;

-- ============================================================
-- SEED DATA: Default Role-Permissions
-- ============================================================
-- Super Admin: Full Permissions
INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'super_admin', id, 'All' FROM organization.permissions
ON CONFLICT DO NOTHING;

-- CEO / Founder: Full View, Approve, Reports
INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'ceo', id, 'All' FROM organization.permissions
ON CONFLICT DO NOTHING;

-- Admin: Administration & User Management, profile configuration
INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'admin', id, 'Company' FROM organization.permissions
WHERE module IN ('HRMS', 'Company Administration', 'User Management', 'Audit Logs')
ON CONFLICT DO NOTHING;

-- Sales Manager: Team Scope for CRM, Visits, HRMS View, Attendance, Expense, Reports
INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'sales_manager', id, 'Team' FROM organization.permissions
WHERE module IN ('CRM & Leads', 'Customers', 'Visits', 'Smart Client Map')
ON CONFLICT DO NOTHING;

INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'sales_manager', id, 'Team' FROM organization.permissions
WHERE permission_key IN (
    'hrms.employees.view', 'hrms.employees.profile_view', 'hrms.employees.own_profile_edit',
    'hrms.attendance.view_own', 'hrms.attendance.view_team', 'hrms.attendance.mark',
    'hrms.leaves.apply', 'hrms.leaves.view_own', 'hrms.leaves.view_team', 'hrms.leaves.approve_team',
    'finance.expenses.view_own', 'finance.expenses.create', 'finance.expenses.edit_own', 'finance.expenses.view_team', 'finance.expenses.approve',
    'system.reports.view_own', 'system.reports.view_team', 'system.reports.export',
    'system.notifications.view', 'system.notifications.send'
)
ON CONFLICT DO NOTHING;

-- Sales Executive: Own/Assigned Scope for CRM, Visits, Expenses, Attendance, Leave
INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'sales_executive', id, 'Assigned' FROM organization.permissions
WHERE module IN ('CRM & Leads', 'Customers', 'Visits', 'Smart Client Map')
ON CONFLICT DO NOTHING;

INSERT INTO organization.role_permissions (role_id, permission_id, access_scope)
SELECT 'sales_executive', id, 'Own' FROM organization.permissions
WHERE permission_key IN (
    'hrms.employees.own_profile_edit', 'hrms.employees.profile_view',
    'hrms.attendance.mark', 'hrms.attendance.view_own',
    'hrms.leaves.apply', 'hrms.leaves.view_own',
    'finance.expenses.view_own', 'finance.expenses.create', 'finance.expenses.edit_own',
    'system.reports.view_own', 'system.notifications.view'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: Map Existing Users from hrms.employees to organization.user_roles
-- ============================================================
INSERT INTO organization.user_roles (user_id, role_id)
SELECT DISTINCT 
    (user_id::uuid), 
    CASE 
        WHEN lower(role) LIKE '%super%admin%' THEN 'super_admin'
        WHEN lower(role) LIKE '%ceo%' OR lower(role) LIKE '%founder%' OR lower(role) LIKE '%managing%director%' THEN 'ceo'
        WHEN lower(role) LIKE '%admin%' THEN 'admin'
        WHEN lower(role) LIKE '%manager%' THEN 'sales_manager'
        ELSE 'sales_executive'
    END
FROM hrms.employees
WHERE user_id IS NOT NULL AND user_id::text != ''
ON CONFLICT DO NOTHING;
