import React, { useState, useEffect, useMemo, Fragment } from 'react'
import {
  ShieldCheck,
  Plus,
  Lock,
  Unlock,
  Check,
  X,
  Users,
  Search,
  Key,
  Edit3,
  Trash2,
  CheckCircle2,
  Sliders,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Briefcase,
  MapPin,
  Fingerprint,
  CalendarX,
  Coins,
  BarChart3,
  Map,
  Bell,
  UserPlus,
  ScrollText,
  AlertCircle,
  HelpCircle,
  Copy,
  Eye,
  Power,
  UserCheck,
  Filter,
  Layers,
  MoreVertical,
  CheckSquare,
  Square,
  Sparkles,
  Wrench,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '../../common/ToastContext.jsx'
import { usePermissions } from '../../context/PermissionContext.jsx'
import { settingsAPI, userAPI, hrmsAPI } from '../../services/api.js'

const getUserPhoto = (u) => {
  const p = u?.profile_photo || u?.avatar_url || u?.photo_url || u?.profile_photo_url || u?.avatar || u?.photo
  if (!p || typeof p !== 'string') return null
  const trimmed = p.trim()
  if (!trimmed || trimmed.includes('test_avatar') || trimmed.includes('example.com')) return null
  return trimmed
}

// System permissions list categorized by TWiTE Connect modules
const systemPermissionsList = [
  // CRM & Leads
  { permission_key: 'crm.leads.view', module: 'CRM & Leads', action: 'View', description: 'Allows viewing leads details and lists', hasScope: true },
  { permission_key: 'crm.leads.create', module: 'CRM & Leads', action: 'Create', description: 'Allows creating new leads', hasScope: false },
  { permission_key: 'crm.leads.edit', module: 'CRM & Leads', action: 'Edit', description: 'Allows editing leads information', hasScope: false },
  { permission_key: 'crm.leads.delete', module: 'CRM & Leads', action: 'Delete', description: 'Allows deleting leads records', hasScope: false },
  { permission_key: 'crm.leads.assign', module: 'CRM & Leads', action: 'Assign', description: 'Allows assigning leads to sales executives or team leads', hasScope: false },
  { permission_key: 'crm.leads.history', module: 'CRM & Leads', action: 'View History', description: 'Allows viewing lead assignment history and audit trails', hasScope: false },

  // Customers
  { permission_key: 'crm.customers.view', module: 'Customers', action: 'View', description: 'Allows viewing customer accounts and company profiles', hasScope: true },
  { permission_key: 'crm.customers.create', module: 'Customers', action: 'Create', description: 'Allows creating new customer records', hasScope: false },
  { permission_key: 'crm.customers.edit', module: 'Customers', action: 'Edit', description: 'Allows modifying customer details', hasScope: false },
  { permission_key: 'crm.customers.delete', module: 'Customers', action: 'Delete', description: 'Allows deleting customer records', hasScope: false },
  { permission_key: 'crm.customers.convert', module: 'Customers', action: 'Convert', description: 'Allows converting qualified leads to active customers', hasScope: false },

  // Visits
  { permission_key: 'visit.visits.view', module: 'Visits', action: 'View', description: 'Allows viewing field visits and schedules', hasScope: true },
  { permission_key: 'visit.visits.create', module: 'Visits', action: 'Create', description: 'Allows scheduling a field visit', hasScope: false },
  { permission_key: 'visit.visits.edit', module: 'Visits', action: 'Edit', description: 'Allows editing scheduled visit details', hasScope: false },
  { permission_key: 'visit.visits.cancel', module: 'Visits', action: 'Cancel', description: 'Allows cancelling scheduled visits', hasScope: false },
  { permission_key: 'visit.visits.history', module: 'Visits', action: 'View History', description: 'Allows viewing history/logs of customer visits', hasScope: false },

  // HRMS
  { permission_key: 'hrms.employees.view', module: 'HRMS', action: 'View', description: 'Allows viewing employee lists', hasScope: true },
  { permission_key: 'hrms.employees.profile_view', module: 'HRMS', action: 'View Profile', description: 'Allows viewing detailed employee profiles', hasScope: true },
  { permission_key: 'hrms.employees.own_profile_edit', module: 'HRMS', action: 'Edit Own Profile', description: 'Allows employees to edit their own profile', hasScope: false },
  { permission_key: 'hrms.employees.profile_edit', module: 'HRMS', action: 'Edit Employee Profile', description: 'Allows admin to edit employee profiles', hasScope: false },
  { permission_key: 'hrms.employees.create', module: 'HRMS', action: 'Create', description: 'Allows creating new employee records', hasScope: false },
  { permission_key: 'hrms.employees.status', module: 'HRMS', action: 'Manage Status', description: 'Allows altering employment status', hasScope: false },
  { permission_key: 'hrms.employees.reporting', module: 'HRMS', action: 'Manage Reporting Manager', description: 'Allows mapping reporting structures', hasScope: false },

  // Attendance
  { permission_key: 'hrms.attendance.mark', module: 'Attendance', action: 'Mark Own', description: 'Allows check-in and check-out tracking', hasScope: false },
  { permission_key: 'hrms.attendance.view_own', module: 'Attendance', action: 'View Own', description: 'Allows viewing personal attendance history', hasScope: false },
  { permission_key: 'hrms.attendance.view_team', module: 'Attendance', action: 'View Team', description: 'Allows viewing team attendance', hasScope: false },
  { permission_key: 'hrms.attendance.view_all', module: 'Attendance', action: 'View All', description: 'Allows viewing all employee attendance', hasScope: false },
  { permission_key: 'hrms.attendance.edit', module: 'Attendance', action: 'Edit', description: 'Allows editing attendance records', hasScope: false },

  // Leave Management
  { permission_key: 'hrms.leaves.apply', module: 'Leave Management', action: 'Apply Own', description: 'Allows applying for leaves', hasScope: false },
  { permission_key: 'hrms.leaves.view_own', module: 'Leave Management', action: 'View Own', description: 'Allows viewing personal leave requests', hasScope: false },
  { permission_key: 'hrms.leaves.view_team', module: 'Leave Management', action: 'View Team', description: 'Allows viewing team leave calendar', hasScope: false },
  { permission_key: 'hrms.leaves.approve_team', module: 'Leave Management', action: 'Approve Team', description: 'Allows approving team leave applications', hasScope: false },
  { permission_key: 'hrms.leaves.approve_all', module: 'Leave Management', action: 'Approve All', description: 'Allows approving any leave applications', hasScope: false },

  // Expenses & Finance
  { permission_key: 'finance.expenses.view_own', module: 'Expenses & Finance', action: 'View Own', description: 'Allows viewing personal expense claims', hasScope: false },
  { permission_key: 'finance.expenses.create', module: 'Expenses & Finance', action: 'Create', description: 'Allows submitting new expense claims', hasScope: false },
  { permission_key: 'finance.expenses.edit_own', module: 'Expenses & Finance', action: 'Edit Own', description: 'Allows editing personal expense claims', hasScope: false },
  { permission_key: 'finance.expenses.view_team', module: 'Expenses & Finance', action: 'View Team', description: 'Allows viewing team expense claims', hasScope: false },
  { permission_key: 'finance.expenses.approve', module: 'Expenses & Finance', action: 'Approve', description: 'Allows approving/rejecting expense claims', hasScope: false },
  { permission_key: 'finance.expenses.reports', module: 'Expenses & Finance', action: 'View Reports', description: 'Allows viewing company expense reports', hasScope: false },

  // Reports
  { permission_key: 'system.reports.view_own', module: 'Reports', action: 'View Own', description: 'Allows viewing personal performance reports', hasScope: false },
  { permission_key: 'system.reports.view_team', module: 'Reports', action: 'View Team', description: 'Allows viewing team performance reports', hasScope: false },
  { permission_key: 'system.reports.view_company', module: 'Reports', action: 'View Company', description: 'Allows viewing company sales/audit reports', hasScope: false },
  { permission_key: 'system.reports.export', module: 'Reports', action: 'Export', description: 'Allows exporting reports to CSV or PDF', hasScope: false },

  // Smart Client Map
  { permission_key: 'system.smart_map.view', module: 'Smart Client Map', action: 'View Map', description: 'Allows viewing the Smart Map', hasScope: false },
  { permission_key: 'system.smart_map.nearby', module: 'Smart Client Map', action: 'View Nearby', description: 'Allows viewing nearby customers', hasScope: false },
  { permission_key: 'system.smart_map.assigned', module: 'Smart Client Map', action: 'View Assigned', description: 'Allows viewing assigned customers on map', hasScope: false },
  { permission_key: 'system.smart_map.team', module: 'Smart Client Map', action: 'View Team Locations', description: 'Allows viewing active team locations', hasScope: false },

  // Notifications
  { permission_key: 'system.notifications.view', module: 'Notifications', action: 'View', description: 'Allows viewing personal notifications', hasScope: false },
  { permission_key: 'system.notifications.send', module: 'Notifications', action: 'Send', description: 'Allows broadcasting/sending notifications', hasScope: false },
  { permission_key: 'system.notifications.manage', module: 'Notifications', action: 'Manage', description: 'Allows setting up notification rules', hasScope: false },

  // Company Administration
  { permission_key: 'organization.company.profile_view', module: 'Company Administration', action: 'View Profile', description: 'Allows viewing company profile details', hasScope: false },
  { permission_key: 'organization.company.profile_edit', module: 'Company Administration', action: 'Edit Profile', description: 'Allows modifying company profile details', hasScope: false },
  { permission_key: 'organization.company.branches', module: 'Company Administration', action: 'Manage Branches', description: 'Allows managing branch details', hasScope: false },
  { permission_key: 'organization.company.departments', module: 'Company Administration', action: 'Manage Departments', description: 'Allows managing company departments', hasScope: false },
  { permission_key: 'organization.company.designations', module: 'Company Administration', action: 'Manage Designations', description: 'Allows managing company designations', hasScope: false },
  { permission_key: 'organization.company.products', module: 'Company Administration', action: 'Manage Products', description: 'Allows managing company products/services', hasScope: false },

  // User Management
  { permission_key: 'organization.users.view', module: 'User Management', action: 'View', description: 'Allows viewing user accounts list', hasScope: true },
  { permission_key: 'organization.users.create', module: 'User Management', action: 'Create', description: 'Allows creating new user accounts', hasScope: false },
  { permission_key: 'organization.users.edit', module: 'User Management', action: 'Edit', description: 'Allows editing user accounts', hasScope: false },
  { permission_key: 'organization.users.disable', module: 'User Management', action: 'Disable', description: 'Allows disabling user accounts', hasScope: false },
  { permission_key: 'organization.users.assign_roles', module: 'User Management', action: 'Assign Roles', description: 'Allows assigning roles to users', hasScope: false },
  { permission_key: 'organization.users.assign_manager', module: 'User Management', action: 'Assign Manager', description: 'Allows mapping reporting structures', hasScope: false },

  // Audit Logs
  { permission_key: 'system.audit.view', module: 'Audit Logs', action: 'View Logs', description: 'Allows viewing system audit logs', hasScope: true },
  { permission_key: 'system.audit.export', module: 'Audit Logs', action: 'Export Logs', description: 'Allows exporting audit logs to CSV', hasScope: false },
  { permission_key: 'system.audit.manage', module: 'Audit Logs', action: 'Manage settings', description: 'Allows purging or editing audit settings', hasScope: false },
]

const MODULE_LABELS_BY_ROLE = {
  'Sales Executive': [
    { key: 'dashboard', label: '📊 Sales Dashboard' },
    { key: 'map', label: '🗺️ Live Client Map' },
    { key: 'attendance', label: '⏱️ Attendance & Punch' },
    { key: 'customers', label: '👥 Customers / Clients' },
    { key: 'leads', label: '🎯 Leads & Visits' },
    { key: 'expenses', label: '💵 Expense Claims' },
    { key: 'hrms', label: '📄 HRMS & Leaves' },
    { key: 'todo', label: '📝 Tasks & Todos' },
  ],
  'Team Lead': [
    { key: 'dashboard', label: '📊 Team Lead Dashboard' },
    { key: 'map', label: '🗺️ Team Smart Map' },
    { key: 'team', label: '👨‍💼 Team Management' },
    { key: 'leads', label: '🎯 Leads & Pipeline' },
    { key: 'visits', label: '📍 Team Visits Log' },
    { key: 'attendance', label: '⏱️ Attendance Approvals' },
    { key: 'expenses', label: '💵 Expense Approvals' },
    { key: 'hrms', label: '📄 Team Lead HRMS' },
  ],
  'Sales Manager': [
    { key: 'dashboard', label: '📊 Manager Dashboard' },
    { key: 'map', label: '🗺️ Manager Smart Map' },
    { key: 'team', label: '👨‍💼 Team Management' },
    { key: 'leads', label: '🎯 Team Leads & Pipeline' },
    { key: 'customers', label: '👥 Customer Accounts' },
    { key: 'visits', label: '📍 Team Visits' },
    { key: 'attendance', label: '⏱️ Attendance Approvals' },
    { key: 'followups', label: '📞 Follow-ups' },
    { key: 'opportunities', label: '💼 Deals & Opportunities' },
    { key: 'expenses', label: '💵 Expense Approvals' },
    { key: 'reports', label: '📈 Sales & HR Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'calendar', label: '📅 Team Calendar' },
    { key: 'hrms', label: '📄 Manager HRMS' },
    { key: 'settings', label: '⚙️ Manager Settings' },
  ],
  'Super Admin': [
    { key: 'dashboard', label: '📊 System Dashboard' },
    { key: 'company', label: '🏢 Company Master Data' },
    { key: 'users', label: '👥 User Management' },
    { key: 'customers', label: '💼 Customer Accounts' },
    { key: 'roles', label: '🛡️ Role & Access Controls' },
    { key: 'hrms', label: '📄 System HRMS' },
    { key: 'reports', label: '📜 Audit Logs & Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'settings', label: '⚙️ System Settings' },
  ],
  'CEO / Founder': [
    { key: 'dashboard', label: '📊 Executive Dashboard' },
    { key: 'customers', label: '👥 Customer Portfolio' },
    { key: 'team_management', label: '👨‍💼 Team Management' },
    { key: 'sales_revenue', label: '📈 Revenue & Sales Overview' },
    { key: 'hrms', label: '📄 Executive HRMS' },
    { key: 'reports', label: '📜 Executive Reports' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'settings', label: '⚙️ Executive Settings' },
    { key: 'expenses', label: '💵 Expense Management' },
  ]
}

const ACTION_KEYS = [
  { key: 'view', label: 'View', icon: '👀', color: 'blue' },
  { key: 'create_edit', label: 'Edit', icon: '✏️', color: 'indigo' },
  { key: 'approve', label: 'Approve', icon: '✅', color: 'emerald' },
  { key: 'assign', label: 'Assign', icon: '🔄', color: 'amber' },
  { key: 'delete', label: 'Delete', icon: '🗑️', color: 'rose' },
  { key: 'export', label: 'Export', icon: '📥', color: 'purple' },
]

const SUB_ACTION_ITEMS = {
  view: [
    { key: 'open_page', label: 'Open Page', desc: 'Allow user to open page route' },
    { key: 'view_cards', label: 'View Cards', desc: 'Display summary KPI cards' },
    { key: 'view_details', label: 'View Details', desc: 'Open full record detail views' },
  ],
  create_edit: [
    { key: 'create_records', label: 'Create Records', desc: 'Add new visits, leads, or claims' },
    { key: 'edit_records', label: 'Edit Fields', desc: 'Modify existing record information' },
    { key: 'update_status', label: 'Update Status', desc: 'Change lead stage or request status' },
  ],
  approve: [
    { key: 'approve_leaves', label: 'Leave Approvals', desc: 'Approve or reject leave requests' },
    { key: 'approve_expenses', label: 'Expense Approvals', desc: 'Approve or reject expense claims' },
    { key: 'approve_attendance', label: 'Attendance Approvals', desc: 'Validate check-in & punch logs' },
    { key: 'acknowledge_eod', label: 'EOD Acknowledgment', desc: 'Acknowledge end-of-day reports' },
  ],
  assign: [
    { key: 'assign_leads', label: 'Assign Leads', desc: 'Distribute leads to sales executives' },
    { key: 'assign_customers', label: 'Assign Customers', desc: 'Map customer accounts to reps' },
    { key: 'map_hierarchy', label: 'Map Hierarchy', desc: 'Assign reporting manager & TL' },
  ],
  delete: [
    { key: 'delete_leads', label: 'Delete Leads', desc: 'Remove lead/opportunity records' },
    { key: 'delete_customers', label: 'Delete Customers', desc: 'Remove customer accounts' },
    { key: 'delete_expenses', label: 'Delete Expenses', desc: 'Purge expense claim entries' },
    { key: 'delete_users', label: 'Delete Users', desc: 'Deactivate or delete user accounts' },
  ],
  export: [
    { key: 'export_excel', label: 'Export Excel (.xlsx)', desc: 'Download Excel spreadsheet' },
    { key: 'export_csv', label: 'Export CSV (.csv)', desc: 'Download CSV raw dataset' },
    { key: 'export_pdf', label: 'Export PDF Reports', desc: 'Generate printable PDF reports' },
  ],
}

const MODULE_SPECIFIC_SUB_ACTIONS = {
  dashboard: {
    view: [
      { key: 'view_kpi_cards', label: 'View KPI Summary Cards', desc: 'Revenue, Target, Lead counts' },
      { key: 'view_charts', label: 'View Performance Charts', desc: 'Sales trends and target vs actual graphs' },
      { key: 'view_leaderboard', label: 'View Top Performers', desc: 'Team ranking and performance scores' },
    ],
    create_edit: [
      { key: 'customize_layout', label: 'Customize Dashboard Widgets', desc: 'Reorder and pin widget cards' },
      { key: 'set_period_filter', label: 'Modify Target Periods', desc: 'Toggle monthly / quarterly view' },
    ],
    export: [
      { key: 'export_dashboard_pdf', label: 'Export Dashboard Summary (PDF)', desc: 'Generate printable executive report' },
    ],
  },
  map: {
    view: [
      { key: 'view_live_gps', label: 'View Live GPS Locations', desc: 'Real-time field rep coordinates' },
      { key: 'view_nearby_clients', label: 'View Nearby Customer Radius', desc: 'Client pins within 5km/10km' },
      { key: 'view_geofence', label: 'View Geofence Boundaries', desc: 'Branch and client location perimeters' },
    ],
    create_edit: [
      { key: 'update_location_ping', label: 'Manual GPS Check-in', desc: 'Ping current location manually' },
      { key: 'adjust_geofence', label: 'Adjust Geofence Radius', desc: 'Set location accuracy threshold' },
    ],
    export: [
      { key: 'export_map_kml', label: 'Export Route Map Data (CSV/KML)', desc: 'Download route history coordinates' },
    ],
  },
  attendance: {
    view: [
      { key: 'view_punch_logs', label: 'View Punch In/Out Logs', desc: 'Daily check-in timestamps' },
      { key: 'view_selfie_photos', label: 'View Selfie Biometric Photos', desc: 'Facial verification images' },
      { key: 'view_gps_stamps', label: 'View GPS Location Stamps', desc: 'Punch location coordinates' },
    ],
    create_edit: [
      { key: 'clock_in_out', label: 'Clock In / Clock Out', desc: 'Perform daily attendance punch' },
      { key: 'manual_attendance_entry', label: 'Request Attendance Adjustment', desc: 'Submit missing punch request' },
      { key: 'log_on_duty', label: 'Submit On-Duty (OD) Request', desc: 'Log client visit out-of-office punch' },
    ],
    approve: [
      { key: 'approve_attendance_logs', label: 'Approve Attendance Adjustments', desc: 'Validate employee punch requests' },
      { key: 'validate_face_liveness', label: 'Validate Face Liveness Logs', desc: 'Verify biometric selfie matches' },
      { key: 'acknowledge_late_punch', label: 'Acknowledge Late Check-ins', desc: 'Review grace period exceptions' },
    ],
    export: [
      { key: 'export_attendance_excel', label: 'Export Attendance Register (Excel)', desc: 'Monthly attendance summary' },
    ],
  },
  customers: {
    view: [
      { key: 'view_customer_profiles', label: 'View Customer Company Profiles', desc: 'Business details & contacts' },
      { key: 'view_purchase_history', label: 'View Order & Purchase History', desc: 'Past invoices & deal values' },
      { key: 'view_contact_persons', label: 'View Key Contacts & Phone Nos', desc: 'Decision makers directory' },
    ],
    create_edit: [
      { key: 'create_customer', label: 'Create New Customer Account', desc: 'Register company profile' },
      { key: 'edit_customer_fields', label: 'Edit Customer Information', desc: 'Update contact details & address' },
      { key: 'convert_lead_customer', label: 'Convert Lead to Customer', desc: 'Transform qualified lead to account' },
    ],
    assign: [
      { key: 'assign_customer_rep', label: 'Assign Account Manager / Rep', desc: 'Map customer account to sales rep' },
    ],
    delete: [
      { key: 'delete_customer_account', label: 'Delete Customer Record', desc: 'Remove customer profile' },
      { key: 'archive_client', label: 'Archive Inactive Account', desc: 'Soft-delete inactive clients' },
    ],
    export: [
      { key: 'export_customers_excel', label: 'Export Customer Directory (Excel)', desc: 'Full accounts list' },
      { key: 'export_customer_pdf', label: 'Export Account Statements (PDF)', desc: 'Printable client portfolio' },
    ],
  },
  leads: {
    view: [
      { key: 'view_lead_pipeline', label: 'View Pipeline & Stage Cards', desc: 'Active deal stages and values' },
      { key: 'view_visit_history', label: 'View Field Visit Logs & Notes', desc: 'Past customer interactions' },
      { key: 'view_lead_contacts', label: 'View Prospect Contact Info', desc: 'Phone, email, and company details' },
    ],
    create_edit: [
      { key: 'create_new_lead', label: 'Create New Lead / Deal', desc: 'Add new sales prospect' },
      { key: 'update_lead_stage', label: 'Update Deal Stage / Pipeline Status', desc: 'Move lead through sales funnel' },
      { key: 'log_visit_outcome', label: 'Log Visit Notes & Follow-up Date', desc: 'Record meeting feedback' },
    ],
    approve: [
      { key: 'approve_deal_discount', label: 'Approve Deal Discounts & Pricing', desc: 'Validate special pricing requests' },
    ],
    assign: [
      { key: 'assign_lead_executive', label: 'Assign Lead to Sales Executive', desc: 'Distribute incoming leads' },
      { key: 'reassign_territory', label: 'Reassign Unattended Leads', desc: 'Transfer leads between reps' },
    ],
    delete: [
      { key: 'delete_lead_record', label: 'Delete Lead Record', desc: 'Remove prospect from system' },
      { key: 'mark_lead_lost', label: 'Mark Lead as Lost / Junk', desc: 'Close unqualified deal' },
    ],
    export: [
      { key: 'export_leads_excel', label: 'Export Leads Pipeline (Excel)', desc: 'Full pipeline dataset' },
    ],
  },
  expenses: {
    view: [
      { key: 'view_expense_claims', label: 'View Expense Claims', desc: 'Travel & food claim entries' },
      { key: 'view_expense_receipts', label: 'View Bill Receipts & Images', desc: 'Uploaded invoice documents' },
      { key: 'view_reimbursement_status', label: 'View Reimbursement Status', desc: 'Pending vs Paid claims' },
    ],
    create_edit: [
      { key: 'submit_expense_claim', label: 'Submit New Expense Claim', desc: 'Add travel/food expense entry' },
      { key: 'upload_bills', label: 'Upload Receipt Attachments', desc: 'Attach proof photos' },
      { key: 'edit_pending_claim', label: 'Edit Draft Claim Details', desc: 'Modify submitted claim fields' },
    ],
    approve: [
      { key: 'approve_claim', label: 'Approve Expense Claims', desc: 'Validate and approve for payout' },
      { key: 'reject_claim', label: 'Reject Claim with Reason', desc: 'Decline invalid claim request' },
      { key: 'return_claim', label: 'Return for Revision', desc: 'Send claim back to employee' },
    ],
    delete: [
      { key: 'delete_draft_expense', label: 'Delete Draft Expense Claim', desc: 'Remove unsubmitted claim' },
    ],
    export: [
      { key: 'export_expenses_excel', label: 'Export Expense Report (Excel)', desc: 'Download monthly claims summary' },
      { key: 'export_tax_receipts_pdf', label: 'Export Tax Receipts (PDF)', desc: 'Generate PDF voucher statement' },
    ],
  },
  hrms: {
    view: [
      { key: 'view_employee_directory', label: 'View Employee Roster & Profiles', desc: 'Full staff list and hierarchy' },
      { key: 'view_leave_balances', label: 'View Leave Balances & History', desc: 'Sick, casual, and annual leaves' },
      { key: 'view_salary_slips', label: 'View Salary Payslips', desc: 'Monthly compensation breakdown' },
    ],
    create_edit: [
      { key: 'apply_leave', label: 'Submit Leave Application', desc: 'Apply for time off' },
      { key: 'edit_own_profile', label: 'Update Profile & Emergency Info', desc: 'Edit personal & contact details' },
      { key: 'edit_employee_record', label: 'Edit Employee Master Profile', desc: 'Update designation and department' },
    ],
    approve: [
      { key: 'approve_leave_request', label: 'Approve Leave Applications', desc: 'Validate employee leave requests' },
      { key: 'approve_salary_revision', label: 'Approve Salary & Compensation', desc: 'Validate pay revisions' },
    ],
    assign: [
      { key: 'assign_reporting_manager', label: 'Assign Reporting Manager & TL', desc: 'Set employee hierarchy' },
    ],
    delete: [
      { key: 'deactivate_employee', label: 'Deactivate Employee Account', desc: 'Disable employee login access' },
    ],
    export: [
      { key: 'export_hrms_excel', label: 'Export Employee Roster (Excel)', desc: 'Full employee database' },
    ],
  },
  team: {
    view: [
      { key: 'view_team_roster', label: 'View Team Members List', desc: 'Assigned executives and TLs' },
      { key: 'view_team_activity', label: 'View Team Activity Logs', desc: 'Daily visits and calls summary' },
    ],
    create_edit: [
      { key: 'update_team_member', label: 'Update Team Member Info', desc: 'Edit executive details' },
    ],
    assign: [
      { key: 'assign_executive_tl', label: 'Assign Executive to Team Lead', desc: 'Map reporting hierarchy' },
    ],
    export: [
      { key: 'export_team_list', label: 'Export Team Structure (Excel)', desc: 'Download reporting map' },
    ],
  },
  reports: {
    view: [
      { key: 'view_sales_reports', label: 'View Sales & Revenue Reports', desc: 'Monthly performance data' },
      { key: 'view_audit_logs', label: 'View System Audit Trail Logs', desc: 'Security and change history' },
    ],
    create_edit: [
      { key: 'submit_eod_report', label: 'Submit End of Day (EOD) Report', desc: 'Daily work log submission' },
    ],
    approve: [
      { key: 'acknowledge_eod', label: 'Acknowledge EOD Reports', desc: 'Validate team EOD submissions' },
    ],
    export: [
      { key: 'export_audit_csv', label: 'Export Audit Logs (CSV/Excel)', desc: 'Download system audit trails' },
      { key: 'export_performance_pdf', label: 'Export Performance Reports (PDF)', desc: 'Printable executive summary' },
    ],
  },
  settings: {
    view: [
      { key: 'view_company_settings', label: 'View Organization Profile Settings', desc: 'GST, company tax, logo' },
      { key: 'view_rbac_settings', label: 'View Role & Permission Matrix', desc: 'RBAC default master templates' },
    ],
    create_edit: [
      { key: 'update_company_profile', label: 'Edit Company Profile & Logo', desc: 'Update legal name & branding' },
      { key: 'update_master_rbac', label: 'Update Master Role Templates', desc: 'Modify default permission presets' },
    ],
    delete: [
      { key: 'delete_custom_role', label: 'Delete Custom Role', desc: 'Remove non-system role template' },
    ],
  },
}

export const getModuleSubActions = (modKey, actKey) => {
  const modSpecific = MODULE_SPECIFIC_SUB_ACTIONS[modKey]?.[actKey];
  if (modSpecific && modSpecific.length > 0) {
    return modSpecific;
  }
  return SUB_ACTION_ITEMS[actKey] || [];
};

const STANDARD_MASTER_ROLE_DEFAULTS = {
  'Sales Executive': {
    dashboard: { view: true, export: true },
    map: { view: true, export: true },
    attendance: { view: true, create_edit: true, export: true },
    customers: { view: true, export: true },
    leads: { view: true, create_edit: true, export: true },
    expenses: { view: true, create_edit: true, export: true },
    hrms: { view: true },
    todo: { view: true, create_edit: true },
  },
  'Team Lead': {
    dashboard: { view: true, export: true },
    map: { view: true, export: true },
    team: { view: true, assign: true, export: true },
    leads: { view: true, create_edit: true, assign: true, export: true },
    visits: { view: true, export: true },
    attendance: { view: true, approve: true, export: true },
    expenses: { view: true, approve: true, export: true },
    hrms: { view: true, approve: true },
  },
  'Sales Manager': {
    dashboard: { view: true, export: true },
    map: { view: true, export: true },
    team: { view: true, create_edit: true, assign: true, delete: true, export: true },
    leads: { view: true, create_edit: true, assign: true, delete: true, export: true },
    customers: { view: true, create_edit: true, assign: true, delete: true, export: true },
    visits: { view: true, export: true },
    attendance: { view: true, approve: true, export: true },
    followups: { view: true, create_edit: true },
    opportunities: { view: true, create_edit: true, export: true },
    expenses: { view: true, approve: true, export: true },
    reports: { view: true, export: true },
    notifications: { view: true, create_edit: true },
    leaderboard: { view: true },
    calendar: { view: true, create_edit: true },
    hrms: { view: true, approve: true },
    settings: { view: true, create_edit: true },
  },
  'Super Admin': {
    dashboard: { view: true, create_edit: true, approve: true, assign: true, delete: true, export: true },
    company: { view: true, create_edit: true, delete: true, export: true },
    users: { view: true, create_edit: true, assign: true, delete: true, export: true },
    customers: { view: true, create_edit: true, assign: true, delete: true, export: true },
    roles: { view: true, create_edit: true, delete: true, export: true },
    hrms: { view: true, create_edit: true, approve: true, delete: true, export: true },
    reports: { view: true, export: true },
    notifications: { view: true, create_edit: true, delete: true },
    settings: { view: true, create_edit: true, delete: true },
  },
  'CEO / Founder': {
    dashboard: { view: true, export: true },
    customers: { view: true, export: true },
    team_management: { view: true, export: true },
    sales_revenue: { view: true, export: true },
    hrms: { view: true, export: true },
    reports: { view: true, export: true },
    notifications: { view: true },
    settings: { view: true },
    expenses: { view: true, approve: true, export: true },
  }
}

export const getMasterPermissionsForRole = (roleName, rolesList = []) => {
  if (!roleName) return STANDARD_MASTER_ROLE_DEFAULTS['Sales Executive']
  const normRoleKey = (roleName || '').toLowerCase().includes('ceo') ? 'CEO / Founder'
    : (roleName || '').toLowerCase().includes('admin') ? 'Super Admin'
    : (roleName || '').toLowerCase().includes('lead') ? 'Team Lead'
    : (roleName || '').toLowerCase().includes('manager') ? 'Sales Manager'
    : 'Sales Executive';

  const targetNorm = normRoleKey.toLowerCase().replace(/[^a-z0-9]/g, '')

  let searchList = Array.isArray(rolesList) && rolesList.length > 0 ? rolesList : []
  if (!searchList || searchList.length === 0) {
    try {
      const saved = localStorage.getItem('tconnect_master_role_templates')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          searchList = parsed
        }
      }
    } catch (e) {}
  }

  const found = (searchList || []).find((r) => {
    const rName = (r.name || r.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    return rName === targetNorm || rName.includes(targetNorm) || targetNorm.includes(rName)
  })

  if (found && found.custom_permissions && Object.keys(found.custom_permissions).length > 0) {
    return found.custom_permissions
  }

  return STANDARD_MASTER_ROLE_DEFAULTS[normRoleKey] || STANDARD_MASTER_ROLE_DEFAULTS['Sales Executive']
}

function PermissionMatrixEditor({
  role = 'Sales Executive',
  permissions = {},
  onChange,
  disabled = false,
  isDefaultMode = false,
  onSwitchToManual
}) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [activePopover, setActivePopover] = useState(null)

  const normRole = (role || '').toLowerCase().includes('ceo') ? 'CEO / Founder'
    : (role || '').toLowerCase().includes('admin') ? 'Super Admin'
    : (role || '').toLowerCase().includes('lead') ? 'Team Lead'
    : (role || '').toLowerCase().includes('manager') ? 'Sales Manager'
    : 'Sales Executive';

  const allModules = MODULE_LABELS_BY_ROLE[normRole] || MODULE_LABELS_BY_ROLE['Sales Executive'];

  const filteredModules = useMemo(() => {
    if (selectedDept === 'ALL') return allModules;
    return allModules.filter(m => {
      const k = m.key;
      if (selectedDept === 'sales') return ['dashboard', 'map', 'leads', 'customers', 'visits', 'opportunities', 'followups', 'sales_revenue', 'todo'].includes(k);
      if (selectedDept === 'hrms') return ['attendance', 'hrms', 'team', 'users', 'team_management'].includes(k);
      if (selectedDept === 'finance') return ['expenses', 'company', 'reports'].includes(k);
      if (selectedDept === 'ops') return ['map', 'visits', 'notifications', 'calendar', 'leaderboard'].includes(k);
      if (selectedDept === 'it') return ['roles', 'users', 'settings', 'reports', 'company'].includes(k);
      return true;
    });
  }, [allModules, selectedDept]);

  const handleToggleAction = (modKey, actKey) => {
    if (disabled) return
    if (isDefaultMode && onSwitchToManual) {
      onSwitchToManual()
    }
    const currentMod = permissions[modKey] || {};
    const currentState = currentMod[actKey];
    const isCurrentlyActive = typeof currentState === 'boolean' ? currentState : (currentState?.enabled ?? (actKey === 'view'));

    const updatedMod = {
      ...currentMod,
      [actKey]: !isCurrentlyActive
    };

    onChange({
      ...permissions,
      [modKey]: updatedMod
    });
  };

  const handleToggleSubAction = (modKey, actKey, subKey) => {
    if (disabled) return
    if (isDefaultMode && onSwitchToManual) {
      onSwitchToManual()
    }
    const currentMod = permissions[modKey] || {};
    const currentAct = currentMod[actKey];
    let subObj = typeof currentAct === 'object' && currentAct !== null ? { ...currentAct } : { enabled: true };

    subObj[subKey] = !Boolean(subObj[subKey] !== undefined ? subObj[subKey] : true);

    onChange({
      ...permissions,
      [modKey]: {
        ...currentMod,
        [actKey]: subObj
      }
    });
  };

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-sans relative text-left ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">🔐</span>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              TwiteConnect Permission Matrix ({normRole})
              {isDefaultMode && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                  ⚡ Master Role Preset Active
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold">
              {isDefaultMode
                ? `Inheriting master settings for '${normRole}'. Click any pill to convert to Manual Custom Override.`
                : 'Click any action pill to toggle or customize sub-actions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dept:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
          >
            <option value="ALL">🏢 All Departments</option>
            <option value="sales">🎯 Sales & BD</option>
            <option value="hrms">👥 Human Resources (HR)</option>
            <option value="finance">💵 Finance & Accounts</option>
            <option value="ops">📍 Operations & Field Ops</option>
            <option value="it">⚙️ IT & System Admin</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filteredModules.map((mod) => {
          const modPerm = permissions[mod.key] || {};

          return (
            <div key={mod.key} className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="font-bold text-xs text-slate-900">{mod.label}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap relative">
                {ACTION_KEYS.map((act) => {
                  const actVal = modPerm[act.key];
                  const isActive = typeof actVal === 'boolean' ? actVal : (actVal?.enabled ?? (act.key === 'view'));
                  const isPopoverOpen = activePopover?.modKey === mod.key && activePopover?.actKey === act.key;
                  const subItems = getModuleSubActions(mod.key, act.key);

                  return (
                    <div key={act.key} className="relative">
                      <div className="flex items-center">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleToggleAction(mod.key, act.key)}
                          className={`px-2.5 py-1 rounded-l-lg text-[10px] font-extrabold transition cursor-pointer border-y border-l flex items-center gap-1 ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span>{act.icon}</span>
                          <span>{act.label}</span>
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return
                            if (isPopoverOpen) {
                              setActivePopover(null);
                            } else {
                              setActivePopover({ modKey: mod.key, actKey: act.key });
                            }
                          }}
                          className={`px-1.5 py-1 rounded-r-lg text-[9px] font-black border transition cursor-pointer ${
                            isActive
                              ? 'bg-blue-700 text-white border-blue-600 hover:bg-blue-800'
                              : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                          title="Customize sub-actions"
                        >
                          ▼
                        </button>
                      </div>

                      {isPopoverOpen && !disabled && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 text-left space-y-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-extrabold text-[11px] text-slate-900 flex items-center gap-1">
                              {act.icon} {act.label} Sub-Actions
                            </span>
                            <button
                              type="button"
                              onClick={() => setActivePopover(null)}
                              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {subItems.map((sub) => {
                              const subVal = typeof actVal === 'object' && actVal !== null && actVal[sub.key] !== undefined ? actVal[sub.key] : true;
                              return (
                                <label
                                  key={sub.key}
                                  className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(subVal)}
                                    onChange={() => handleToggleSubAction(mod.key, act.key, sub.key)}
                                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div>
                                    <p className="font-bold text-[11px] text-slate-800 leading-tight">{sub.label}</p>
                                    <p className="text-[9px] text-slate-400 font-medium leading-tight">{sub.desc}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActivePopover(null)}
                            className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-2xs hover:bg-blue-700 transition cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INITIAL_MASTER_ROLES = [
  { id: 'sales_executive', name: 'Sales Executive', isSystem: true, status: 'Active', description: 'Field sales visits, attendance tracking, and lead pipeline management.', custom_permissions: STANDARD_MASTER_ROLE_DEFAULTS['Sales Executive'] },
  { id: 'team_lead', name: 'Team Lead', isSystem: true, status: 'Active', description: 'Oversee field team, approve leaves/expenses, and assign lead pipelines.', custom_permissions: STANDARD_MASTER_ROLE_DEFAULTS['Team Lead'] },
  { id: 'sales_manager', name: 'Sales Manager', isSystem: true, status: 'Active', description: 'Sales team management, field activity tracking, and performance reporting.', custom_permissions: STANDARD_MASTER_ROLE_DEFAULTS['Sales Manager'] },
  { id: 'super_admin', name: 'Super Admin', isSystem: true, status: 'Active', description: 'Full administrative control over all organization modules.', custom_permissions: STANDARD_MASTER_ROLE_DEFAULTS['Super Admin'] },
  { id: 'ceo_founder', name: 'CEO / Founder', isSystem: true, status: 'Active', description: 'Executive level dashboard, company performance metrics, and audit overview.', custom_permissions: STANDARD_MASTER_ROLE_DEFAULTS['CEO / Founder'] },
]

function RoleManagement() {
  const { showToast } = useToast()
  const { refreshPermissions } = usePermissions()

  const [activeTab, setActiveTab] = useState('users')
  const [allEmployees, setAllEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // Left panel filters
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')

  // Selected employee state
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [loadingEmpPermissions, setLoadingEmpPermissions] = useState(false)
  const [permMode, setPermMode] = useState('default') // 'default' | 'manual'
  const [permissionState, setPermissionState] = useState({}) // { key: { is_granted: bool, scope: string } }
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [resettingPermissions, setResettingPermissions] = useState(false)

  // Master templates state for roles tab
  const [masterRoles, setMasterRoles] = useState([
    { id: 'super_admin', name: 'Super Admin', isSystem: true, description: 'Full administrative control over all organization modules.' },
    { id: 'sales_manager', name: 'Sales Manager', isSystem: true, description: 'Sales team management, field activity tracking, and performance reporting.' },
    { id: 'team_lead', name: 'Team Lead', isSystem: true, description: 'Oversee field team, approve leaves/expenses, and assign lead pipelines.' },
    { id: 'sales_executive', name: 'Sales Executive', isSystem: true, description: 'Field sales visits, attendance tracking, and lead pipeline management.' },
  ])

  // Full registry of canonical permissions grouped by module
  const CANONICAL_CATEGORIES = [
    {
      category: 'CRM',
      title: 'CRM & Customer Pipeline',
      items: [
        { key: 'crm.leads.view', name: 'Leads', action: 'View', supportsScope: true },
        { key: 'crm.leads.create', name: 'Leads', action: 'Create', supportsScope: false },
        { key: 'crm.leads.edit', name: 'Leads', action: 'Edit', supportsScope: false },
        { key: 'crm.leads.delete', name: 'Leads', action: 'Delete', supportsScope: false },
        { key: 'crm.leads.assign', name: 'Leads', action: 'Assign', supportsScope: false },
        { key: 'crm.customers.view', name: 'Customers', action: 'View', supportsScope: true },
        { key: 'crm.customers.create', name: 'Customers', action: 'Create', supportsScope: false },
        { key: 'crm.customers.edit', name: 'Customers', action: 'Edit', supportsScope: false },
        { key: 'crm.customers.delete', name: 'Customers', action: 'Delete', supportsScope: false },
        { key: 'crm.customers.convert', name: 'Customers', action: 'Convert', supportsScope: false },
      ],
    },
    {
      category: 'HRMS',
      title: 'HRMS & Employee Management',
      items: [
        { key: 'hrms.employees.view', name: 'Employees', action: 'View', supportsScope: true },
        { key: 'hrms.employees.create', name: 'Employees', action: 'Create', supportsScope: false },
        { key: 'hrms.employees.edit', name: 'Employees', action: 'Edit', supportsScope: false },
        { key: 'hrms.employees.status', name: 'Employees', action: 'Status / Deactivate', supportsScope: false },
        { key: 'hrms.employees.reporting', name: 'Employees', action: 'Reporting Hierarchy', supportsScope: false },
        { key: 'hrms.holidays.manage', name: 'Holidays', action: 'Manage Calendar', supportsScope: false },
      ],
    },
    {
      category: 'Attendance & Leaves',
      title: 'Attendance & Time Off',
      items: [
        { key: 'hrms.attendance.mark', name: 'Attendance', action: 'Mark Own Check-in', supportsScope: false },
        { key: 'hrms.attendance.view_own', name: 'Attendance', action: 'View Own', supportsScope: false },
        { key: 'hrms.attendance.view_team', name: 'Attendance', action: 'View Team', supportsScope: false },
        { key: 'hrms.attendance.view_all', name: 'Attendance', action: 'View All', supportsScope: false },
        { key: 'hrms.attendance.approve', name: 'Attendance', action: 'Approve Punch Logs', supportsScope: false },
        { key: 'hrms.leaves.view', name: 'Leaves', action: 'View Calendar', supportsScope: false },
        { key: 'hrms.leaves.apply', name: 'Leaves', action: 'Apply Leave', supportsScope: false },
        { key: 'hrms.leaves.cancel', name: 'Leaves', action: 'Cancel Leave', supportsScope: false },
        { key: 'hrms.leaves.approve_team', name: 'Leaves', action: 'Approve Team', supportsScope: false },
        { key: 'hrms.leaves.approve_all', name: 'Leaves', action: 'Approve All', supportsScope: false },
      ],
    },
    {
      category: 'Visits',
      title: 'Field Visits & Client Logs',
      items: [
        { key: 'visit.visits.view', name: 'Visits', action: 'View Log', supportsScope: true },
        { key: 'visit.visits.create', name: 'Visits', action: 'Create / Schedule', supportsScope: false },
        { key: 'visit.visits.edit', name: 'Visits', action: 'Edit Notes', supportsScope: false },
        { key: 'visit.visits.cancel', name: 'Visits', action: 'Cancel Visit', supportsScope: false },
      ],
    },
    {
      category: 'Spatial Map',
      title: 'Spatial Map & Field Tracking',
      items: [
        { key: 'spatial.map.view', name: 'Live Map', action: 'View Own Location', supportsScope: false },
        { key: 'spatial.map.view_team', name: 'Live Map', action: 'View Team Map', supportsScope: false },
        { key: 'spatial.map.view_all', name: 'Live Map', action: 'View All Field Map', supportsScope: false },
      ],
    },
    {
      category: 'Expenses',
      title: 'Expense Claims & Reimbursement',
      items: [
        { key: 'expenses.view', name: 'Expenses', action: 'View Claims', supportsScope: true },
        { key: 'expenses.create', name: 'Expenses', action: 'Create Claim', supportsScope: false },
        { key: 'expenses.edit', name: 'Expenses', action: 'Edit Claim', supportsScope: false },
        { key: 'expenses.approve', name: 'Expenses', action: 'Approve Claim', supportsScope: false },
        { key: 'expenses.return', name: 'Expenses', action: 'Return for Correction', supportsScope: false },
      ],
    },
    {
      category: 'Reports & Analytics',
      title: 'Business Performance Reports',
      items: [
        { key: 'reports.view', name: 'Reports', action: 'View Analytics', supportsScope: false },
        { key: 'reports.export', name: 'Reports', action: 'Export Excel/PDF', supportsScope: false },
      ],
    },
    {
      category: 'Admin Portal',
      title: 'System Administration',
      items: [
        { key: 'admin.users.view', name: 'User Management', action: 'View Users Directory', supportsScope: true },
        { key: 'admin.users.create', name: 'User Management', action: 'Create User Account', supportsScope: false },
        { key: 'admin.users.edit', name: 'User Management', action: 'Edit User Info', supportsScope: false },
        { key: 'admin.users.disable', name: 'User Management', action: 'Disable / Lock Access', supportsScope: false },
        { key: 'admin.permissions.manage', name: 'Role Management', action: 'Manage RBAC Matrix', supportsScope: false },
      ],
    },
    {
      category: 'Audit & Compliance',
      title: 'System Audit Trails',
      items: [
        { key: 'system.audit.view', name: 'Audit Logs', action: 'View Security Audit', supportsScope: true },
        { key: 'system.audit.export', name: 'Audit Logs', action: 'Export Audit Logs', supportsScope: false },
      ],
    },
    {
      category: 'Settings',
      title: 'System & Organization Settings',
      items: [
        { key: 'system.settings.view', name: 'Settings', action: 'View Company Config', supportsScope: false },
        { key: 'system.settings.edit', name: 'Settings', action: 'Edit Master Settings', supportsScope: false },
      ],
    },
    {
      category: 'Sales Targets',
      title: 'Sales & Activity Targets',
      items: [
        { key: 'sales.targets.view', name: 'Targets', action: 'View Quotas', supportsScope: false },
        { key: 'sales.targets.manage', name: 'Targets', action: 'Assign Targets', supportsScope: false },
        { key: 'sales.activities.view', name: 'Activities', action: 'View Activity Feed', supportsScope: false },
        { key: 'sales.activities.log', name: 'Activities', action: 'Log Activity', supportsScope: false },
      ],
    },
    {
      category: 'Tasks & To-Do',
      title: 'Task Management',
      items: [
        { key: 'todo.tasks.view', name: 'Tasks', action: 'View Tasks', supportsScope: false },
        { key: 'todo.tasks.manage', name: 'Tasks', action: 'Manage & Assign Tasks', supportsScope: false },
      ],
    },
    {
      category: 'Finance & Org',
      title: 'Commission & Handbook',
      items: [
        { key: 'finance.commission.view', name: 'Commission', action: 'View Statements', supportsScope: false },
        { key: 'finance.commission.manage', name: 'Commission', action: 'Manage Payouts', supportsScope: false },
        { key: 'organization.handbook.view', name: 'Handbook', action: 'View Policies', supportsScope: false },
        { key: 'organization.handbook.manage', name: 'Handbook', action: 'Manage Policies', supportsScope: false },
      ],
    },
  ]

  // Load employee directory
  const loadEmployeeRoster = async () => {
    setLoadingEmployees(true)
    try {
      let empList = []
      const res = await userAPI.getUsers({ bypassCache: true }).catch(() => null)
      const rawData = res?.data || res
      if (Array.isArray(rawData) && rawData.length > 0) {
        empList = rawData
      } else if (res?.users && Array.isArray(res.users)) {
        empList = res.users
      }

      if (!empList || empList.length === 0) {
        const hrmsRes = await hrmsAPI.getEmployees().catch(() => null)
        const rawHrms = hrmsRes?.data?.employees || hrmsRes?.data || hrmsRes?.employees || hrmsRes
        if (Array.isArray(rawHrms) && rawHrms.length > 0) {
          empList = rawHrms
        }
      }

      setAllEmployees(empList || [])

      if (empList && empList.length > 0 && !selectedEmp) {
        handleSelectEmployee(empList[0])
      }
    } catch (err) {
      console.error('Failed to load employee roster:', err)
      showToast('Error loading employee directory', 'error')
    } finally {
      setLoadingEmployees(false)
    }
  }

  useEffect(() => {
    loadEmployeeRoster()
  }, [])

  // Load specific employee's permissions from API
  const handleSelectEmployee = async (emp) => {
    if (!emp) return
    setSelectedEmp(emp)
    setLoadingEmpPermissions(true)

    const empId = emp.employee_id || emp.employee_code || emp.id
    try {
      const res = await userAPI.getUserPermissions(empId)
      const data = res?.data || res

      const isCustomized = Boolean(data?.is_customized || data?.is_manual)
      setPermMode(isCustomized ? 'manual' : 'default')

      // Build dictionary for matrix: { [key]: { is_granted: boolean, scope: string } }
      const dict = {}

      // Default: ALL permissions enabled by default with ORG scope
      CANONICAL_CATEGORIES.forEach((cat) => {
        cat.items.forEach((item) => {
          dict[item.key] = {
            is_granted: true,
            scope: 'ORG',
          }
        })
      })

      // If backend returns detailed permission rows / dict
      if (data?.permissions && typeof data.permissions === 'object') {
        Object.entries(data.permissions).forEach(([k, val]) => {
          const isGranted = typeof val === 'boolean' ? val : Boolean(val?.is_granted ?? val?.enabled ?? true)
          const scopeVal = data?.scopes?.[k] || val?.data_scope || val?.scope || 'ORG'
          dict[k] = {
            is_granted: isGranted,
            scope: scopeVal,
          }
        })
      }

      setPermissionState(dict)
    } catch (err) {
      console.warn(`Could not load permissions for user ${empId}, initializing with default template:`, err?.message)
      setPermMode('default')
      const dict = {}
      CANONICAL_CATEGORIES.forEach((cat) => {
        cat.items.forEach((item) => {
          dict[item.key] = { is_granted: true, scope: 'ORG' }
        })
      })
      setPermissionState(dict)
    } finally {
      setLoadingEmpPermissions(false)
    }
  }

  // Handle individual permission toggle or scope change
  const handlePermissionChange = (key, changes) => {
    if (permMode === 'default') {
      setPermMode('manual') // Automatically switch to manual override mode when edited
    }
    setPermissionState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...changes,
      },
    }))
  }

  // Save Employee Custom Permissions
  const handleSavePermissions = async () => {
    if (!selectedEmp) return
    setSavingPermissions(true)
    const empId = selectedEmp.employee_id || selectedEmp.employee_code || selectedEmp.id

    try {
      const permissionsArray = Object.entries(permissionState).map(([key, val]) => ({
        permission_key: key,
        is_granted: Boolean(val.is_granted),
        data_scope: val.scope || 'ORG',
      }))

      const payload = {
        is_manual: permMode === 'manual',
        mode: permMode,
        permissions: permissionsArray,
      }

      await userAPI.updateUserPermissions(empId, payload)
      if (refreshPermissions) {
        await refreshPermissions()
      }

      showToast(`Permissions successfully saved for ${selectedEmp.first_name || selectedEmp.name || empId}!`, 'success')

      setAllEmployees((prev) =>
        prev.map((e) =>
          (e.employee_id || e.id) === empId ? { ...e, is_customized: permMode === 'manual' } : e
        )
      )
    } catch (err) {
      console.error('Error saving user permissions:', err)
      showToast(err?.message || 'Failed to save user permissions', 'error')
    } finally {
      setSavingPermissions(false)
    }
  }

  // Reset Employee Permissions to Default
  const handleResetToDefault = async () => {
    if (!selectedEmp) return
    const empName = selectedEmp.first_name || selectedEmp.name || selectedEmp.employee_id
    if (!window.confirm(`Are you sure you want to reset all permissions for ${empName} to default? This will clear all manual overrides.`)) {
      return
    }

    setResettingPermissions(true)
    const empId = selectedEmp.employee_id || selectedEmp.employee_code || selectedEmp.id

    try {
      await userAPI.resetUserPermissions(empId)
      if (refreshPermissions) {
        await refreshPermissions()
      }

      setPermMode('default')

      // Reset state to ALL granted
      const dict = {}
      CANONICAL_CATEGORIES.forEach((cat) => {
        cat.items.forEach((item) => {
          dict[item.key] = { is_granted: true, scope: 'ORG' }
        })
      })
      setPermissionState(dict)

      showToast(`All permissions reset to default for ${empName}!`, 'success')

      setAllEmployees((prev) =>
        prev.map((e) =>
          (e.employee_id || e.id) === empId ? { ...e, is_customized: false } : e
        )
      )
    } catch (err) {
      console.error('Error resetting permissions:', err)
      showToast(err?.message || 'Failed to reset permissions', 'error')
    } finally {
      setResettingPermissions(false)
    }
  }

  // Filtered employees roster
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (roleFilter !== 'ALL') {
        const des = (emp.designation || emp.role || '').toLowerCase()
        if (!des.includes(roleFilter.toLowerCase())) return false
      }
      if (deptFilter !== 'ALL') {
        const dept = (emp.department || '').toLowerCase()
        if (!dept.includes(deptFilter.toLowerCase())) return false
      }
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase().trim()
        const name = (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase()
        const email = (emp.work_email || emp.email || '').toLowerCase()
        const code = (emp.employee_id || emp.employee_code || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !code.includes(q)) return false
      }
      return true
    })
  }, [allEmployees, roleFilter, deptFilter, employeeSearch])

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#D4ECFC]/25 border border-[#64B5F6]/25 rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#1E88E5]" /> Role & Permission Management
          </h1>
          <p className="text-xs text-[#64748B] font-semibold mt-1">
            Manage employee-specific permission overrides or inspect master canonical RBAC role defaults.
          </p>

          <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#0B2545] to-[#1E88E5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Employee Access Control
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-gradient-to-r from-[#0B2545] to-[#1E88E5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" /> Master Role Presets
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: EMPLOYEE PERMISSION MANAGER */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Employee Selector */}
          <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-[#0B2545] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1E88E5]" /> Select Employee ({filteredEmployees.length})
              </h2>
              <span className="text-[10px] font-bold text-slate-400">Total: {allEmployees.length}</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name, email, employee code..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E88E5] font-semibold"
              />
            </div>

            {/* Role & Dept Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Role / Designation</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Admin">System Admin</option>
                  <option value="Manager">Sales Manager</option>
                  <option value="Lead">Team Lead</option>
                  <option value="Executive">Sales Executive</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">All Depts</option>
                  <option value="Sales">Sales & BD</option>
                  <option value="HR">HR & Admin</option>
                  <option value="Operations">Operations</option>
                  <option value="IT">IT Support</option>
                </select>
              </div>
            </div>

            {/* Employee Cards Directory */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loadingEmployees ? (
                <div className="text-center py-12 text-xs font-bold text-slate-400">Loading employees roster...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-500">No matching employees found.</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const empId = emp.employee_id || emp.employee_code || emp.id
                  const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || empId
                  const email = emp.work_email || emp.email || 'No email'
                  const des = emp.designation || emp.role || 'Employee'
                  const status = emp.status || 'Active'
                  const isSelected = (selectedEmp?.employee_id || selectedEmp?.id) === empId
                  const isCustom = emp.is_customized || emp.is_manual

                  return (
                    <div
                      key={empId}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#1E88E5] bg-[#D4ECFC]/30 shadow-xs ring-2 ring-[#1E88E5]/15'
                          : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-extrabold text-xs flex items-center justify-center shrink-0 border border-white shadow-2xs">
                          {getUserPhoto(emp) ? (
                            <img src={getUserPhoto(emp)} alt={empName} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            empName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-[#0B2545] truncate">{empName}</h4>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">{empId}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold truncate">{email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-extrabold border border-blue-100 truncate">
                              {des}
                            </span>
                            {isCustom ? (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-extrabold border border-indigo-100">
                                Manual
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold border border-emerald-100">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronDown className="-rotate-90 w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected Employee Permission Control */}
          {selectedEmp ? (
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              {/* Employee Summary Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-extrabold text-base flex items-center justify-center shrink-0 border-2 border-white shadow-xs">
                    {(selectedEmp.name || selectedEmp.first_name || 'E').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-[#0B2545] text-base">
                      {selectedEmp.name || `${selectedEmp.first_name || ''} ${selectedEmp.last_name || ''}`}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {selectedEmp.work_email || selectedEmp.email} · ID: {selectedEmp.employee_id || selectedEmp.employee_code || selectedEmp.id}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {selectedEmp.designation || selectedEmp.role || 'Employee'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {selectedEmp.department || 'General Department'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mode Selector & Control Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPermMode('default')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                        permMode === 'default'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Default Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermMode('manual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                        permMode === 'manual'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" /> Manual Custom Mode
                    </button>
                  </div>

                  <button
                    onClick={handleResetToDefault}
                    disabled={resettingPermissions}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border border-slate-200"
                    title="Reset all permissions to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                  </button>

                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                    className="px-4 py-2 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingPermissions ? (
                      <span className="animate-spin text-xs">🌀 Saving...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save User Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Mode Banner Indicator */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
                  permMode === 'default'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{permMode === 'default' ? '✨' : '⚙️'}</span>
                  <div>
                    <span className="font-black uppercase tracking-wider block text-[10px]">
                      {permMode === 'default' ? 'MASTER DEFAULT ACTIVE' : 'MANUAL CUSTOM OVERRIDE'}
                    </span>
                    <p className="text-[11px] font-semibold opacity-90">
                      {permMode === 'default'
                        ? 'Employee inherits all standard canonical permissions. Toggling any switch below converts mode to Manual override.'
                        : 'Employee has user-specific tailored permissions saved in database organization.employee_permissions.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Canonical Permission Matrix */}
              {loadingEmpPermissions ? (
                <div className="py-20 text-center text-xs font-bold text-slate-400">Loading user effective permissions...</div>
              ) : (
                <div className="space-y-6">
                  {CANONICAL_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-extrabold text-xs text-[#0B2545] uppercase tracking-wider">{cat.title}</h3>
                        <span className="text-[10px] font-bold text-slate-400">{cat.items.length} permissions</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {cat.items.map((item) => {
                          const state = permissionState[item.key] || { is_granted: true, scope: 'ORG' }
                          const isGranted = Boolean(state.is_granted)
                          const currentScope = state.scope || 'ORG'

                          return (
                            <div key={item.key} className="p-3 bg-white hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900">{item.name}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{item.action}</span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.key}</p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* Scope Dropdown */}
                                {item.supportsScope && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Scope:</span>
                                    <select
                                      disabled={!isGranted}
                                      value={currentScope}
                                      onChange={(e) => handlePermissionChange(item.key, { scope: e.target.value })}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
                                        !isGranted
                                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                          : 'bg-white text-[#0B2545] border-slate-300 focus:border-[#1E88E5]'
                                      }`}
                                    >
                                      <option value="ORG">ORG (Full Organization)</option>
                                      <option value="TEAM">TEAM (Reporting Team)</option>
                                      <option value="OWN">OWN (Self Only)</option>
                                    </select>
                                  </div>
                                )}

                                {/* Enable / Disable Switch */}
                                <button
                                  type="button"
                                  onClick={() => handlePermissionChange(item.key, { is_granted: !isGranted })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                                    isGranted
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-300'
                                  }`}
                                >
                                  {isGranted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                  {isGranted ? 'Enabled' : 'Disabled'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-3xl p-16 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-700 text-base">Select an employee from the directory</h3>
              <p className="text-xs text-slate-400 font-medium">Click any employee on the left roster to view and customize their access permissions.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MASTER ROLE PRESETS (READ-ONLY REFERENCE) */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-[#0B2545] text-base">System Master Role Presets</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Default canonical access level definitions for system roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masterRoles.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-[#0B2545] uppercase tracking-wider">{r.name}</h3>
                  <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">System Default</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{r.description}</p>
                <div className="pt-2 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Inherits full canonical permission defaults
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
