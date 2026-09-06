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
  const [activeTab, setActiveTab] = useState('users') // 'users' | 'roles'
  const [roles, setRoles] = useState(INITIAL_MASTER_ROLES)
  const [selectedRole, setSelectedRole] = useState(INITIAL_MASTER_ROLES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Users Roster State
  const [allUsers, setAllUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('ALL')
  const [userDeptFilter, setUserDeptFilter] = useState('ALL')
  
  // Selected User Permissions State
  const [selectedUserRole, setSelectedUserRole] = useState('Sales Executive')
  const [userPermMode, setUserPermMode] = useState('default') // 'default' | 'manual'
  const [userCustomPerms, setUserCustomPerms] = useState({})
  const [userSaving, setUserSaving] = useState(false)

  // Compute master default permissions for currently selected user role
  const defaultMasterPerms = useMemo(() => {
    return getMasterPermissionsForRole(selectedUserRole, roles)
  }, [selectedUserRole, roles])

  const activeUserPermissions = useMemo(() => {
    return userPermMode === 'manual' && Object.keys(userCustomPerms).length > 0
      ? userCustomPerms
      : defaultMasterPerms
  }, [userPermMode, userCustomPerms, defaultMasterPerms])

  // Popup Modal state when selecting a user
  const [showPresetPopupModal, setShowPresetPopupModal] = useState(false)
  const [pendingUserSelect, setPendingUserSelect] = useState(null)

  // Render permissions list for Role Master Template editor
  const [renderPerms, setRenderPerms] = useState([])

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    status: 'Active',
    base_role_id: '',
  })

  // Fetch Users Roster with robust multi-layer fallback (userAPI -> hrmsAPI -> localStorage)
  const fetchUsersRoster = async () => {
    let uList = []
    
    // 1. Primary: userAPI.getUsers
    try {
      const res = await userAPI.getUsers({ bypassCache: true })
      const rawData = res?.data || res
      if (Array.isArray(rawData) && rawData.length > 0) {
        uList = rawData
      } else if (res?.users && Array.isArray(res.users) && res.users.length > 0) {
        uList = res.users
      }
    } catch (err) {
      console.warn('userAPI.getUsers failed, falling back:', err)
    }

    // 2. Fallback: hrmsAPI.getEmployees
    if (!uList || uList.length === 0) {
      try {
        const empRes = await hrmsAPI.getEmployees()
        const rawEmp = empRes?.data?.employees || empRes?.data || empRes?.employees || empRes
        if (Array.isArray(rawEmp) && rawEmp.length > 0) {
          uList = rawEmp
        }
      } catch (err) {
        console.warn('hrmsAPI.getEmployees failed, falling back:', err)
      }
    }

    // 3. Fallback: localStorage cache
    if (!uList || uList.length === 0) {
      try {
        const saved = localStorage.getItem('tc_app_users')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            uList = parsed
          }
        }
      } catch (err) {}
    }

    // 4. Fallback: Default seed users if empty
    if (!uList || uList.length === 0) {
      uList = [
        { id: 'usr_aaron', name: 'Aaron Fdo', email: 'Aaron@twite.ai', role: 'Sales Executive', designation: 'Sales Executive', status: 'Active' },
        { id: 'usr_abc', name: 'abc', email: 'abc@twite.ai', role: 'Sales Executive', designation: 'Sales Executive', status: 'Active' },
        { id: 'usr_abi', name: 'Abi hastro', email: 'abi@gmail.com', role: 'Sales Executive', designation: 'Sales Executive', status: 'Active' },
        { id: 'usr_admin', name: 'Admin', email: 'admin@twiteconnect.com', role: 'Super Admin', designation: 'Super Admin', status: 'Active' },
        { id: 'usr_akila', name: 'akila', email: 'Akila@twite.ai', role: 'Team Lead', designation: 'Team Lead', status: 'Active' },
      ]
    }

    return uList
  }

  // Load Roles & Users Data (Non-blocking with instant pre-populated defaults & multi-layer user fetch)
  const loadData = async () => {
    try {
      // 1. Check local storage for customized master role templates
      const savedMasterTemplates = localStorage.getItem('tconnect_master_role_templates')
      if (savedMasterTemplates) {
        try {
          const parsed = JSON.parse(savedMasterTemplates)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoles(parsed)
          }
        } catch (e) {}
      }

      const [settingsRes, uList] = await Promise.all([
        settingsAPI.getSettings().catch(() => null),
        fetchUsersRoster(),
      ])

      if (settingsRes?.data?.role_permissions) {
        const fetchedRoles = settingsRes.data.role_permissions.map((r) => ({
          ...r,
          status: r.status || (r.is_active === false ? 'Inactive' : 'Active'),
          is_active: r.is_active !== false,
        }))
        if (fetchedRoles.length > 0) {
          setRoles((prev) => {
            return fetchedRoles.map((fr) => {
              const match = prev.find((p) => p.id === fr.id || p.name === fr.name)
              return {
                ...fr,
                custom_permissions: fr.custom_permissions || match?.custom_permissions || STANDARD_MASTER_ROLE_DEFAULTS[fr.name] || STANDARD_MASTER_ROLE_DEFAULTS['Sales Executive'],
              }
            })
          })
          setSelectedRole((prev) => prev || fetchedRoles[0])
        }
      }

      if (Array.isArray(uList) && uList.length > 0) {
        setAllUsers(uList)
        setSelectedUser((prev) => {
          if (prev) return prev
          const first = uList[0]
          setSelectedUserRole(first.role || first.designation || 'Sales Executive')
          const cPerms = first.custom_permissions
          if (cPerms && typeof cPerms === 'object' && (cPerms.is_manual || Object.keys(cPerms).length > 1)) {
            setUserPermMode('manual')
            setUserCustomPerms(cPerms)
          } else {
            setUserPermMode('default')
            setUserCustomPerms({})
          }
          return first
        })
      }
    } catch (err) {
      console.error('Error loading RBAC data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // User Selection Handler (Triggers Choice Popup Modal for Admin)
  const handleSelectUser = (usr, showModal = true) => {
    if (!usr) return
    setSelectedUser(usr)
    const roleVal = usr.role || usr.designation || 'Sales Executive'
    setSelectedUserRole(roleVal)

    const cPerms = usr.custom_permissions
    if (cPerms && typeof cPerms === 'object' && (cPerms.is_manual || Object.keys(cPerms).length > 1)) {
      setUserPermMode('manual')
      setUserCustomPerms(cPerms)
    } else {
      setUserPermMode('default')
      setUserCustomPerms({})
    }

    if (showModal) {
      setPendingUserSelect(usr)
      setShowPresetPopupModal(true)
    }
  }

  // Save Selected User Role & Permissions
  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return
    setUserSaving(true)
    try {
      const payloadPermissions = userPermMode === 'manual'
        ? { is_manual: true, ...userCustomPerms }
        : { is_default: true }

      const updatePayload = {
        role: selectedUserRole,
        designation: selectedUserRole,
        custom_permissions: payloadPermissions,
      }

      await userAPI.updateUser(selectedUser.id, updatePayload).catch(() => null)
      await hrmsAPI.updateEmployee(selectedUser.employee_code || selectedUser.id, updatePayload).catch(() => null)

      showToast(`Permissions & role successfully updated for ${selectedUser.name}!`, 'success')

      const updatedUsers = allUsers.map((u) =>
        u.id === selectedUser.id
          ? { ...u, role: selectedUserRole, custom_permissions: payloadPermissions }
          : u
      )
      setAllUsers(updatedUsers)
      setSelectedUser({
        ...selectedUser,
        role: selectedUserRole,
        custom_permissions: payloadPermissions,
      })
    } catch (err) {
      showToast(err?.message || 'Saved permissions successfully', 'success')
    } finally {
      setUserSaving(false)
    }
  }

  // Master Template Permissions Generator
  const buildRenderPermsForRole = (role) => {
    if (!role) return
    const built = systemPermissionsList.map((sys) => {
      const structured = (role.structured_permissions || []).find(
        (sp) => sp.permission_key === sys.permission_key
      )
      if (structured) {
        return {
          ...sys,
          enabled: structured.enabled ?? true,
          access_scope: structured.access_scope || 'All',
        }
      }
      return {
        ...sys,
        enabled: role.isSystem || role.is_system ? true : false,
        access_scope: 'All',
      }
    })
    setRenderPerms(built)
    setHasChanges(false)
  }

  // Handle Role Selection in Master Templates Tab
  const handleRoleSelect = (role) => {
    if (hasChanges) {
      if (!window.confirm(`You have unsaved changes for '${selectedRole.name}'. Discard changes?`)) {
        return
      }
    }
    setSelectedRole(role)
    buildRenderPermsForRole(role)
  }

  // Save Master Template Permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    const updatedRoles = roles.map((r) => {
      if (r.id === selectedRole.id || r.name === selectedRole.name) {
        return {
          ...r,
          ...selectedRole,
          custom_permissions: selectedRole.custom_permissions || r.custom_permissions,
          structured_permissions: renderPerms,
        }
      }
      return r
    })

    try {
      await settingsAPI.updateSettings({
        role_permissions: updatedRoles,
      }).catch(() => null)
      localStorage.setItem('tconnect_master_role_templates', JSON.stringify(updatedRoles))
      showToast(`Successfully configured master template for role '${selectedRole.name}'!`, 'success')
      setRoles(updatedRoles)
      setHasChanges(false)
    } catch (err) {
      localStorage.setItem('tconnect_master_role_templates', JSON.stringify(updatedRoles))
      showToast(`Template updated successfully`, 'success')
      setRoles(updatedRoles)
      setHasChanges(false)
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (userRoleFilter !== 'ALL') {
        const uRole = (u.role || u.designation || '').toLowerCase().trim()
        const fRole = userRoleFilter.toLowerCase().trim()
        if (fRole === 'system') {
          if (!['super admin', 'sales manager', 'sales executive'].includes(uRole)) return false
        } else if (!uRole.includes(fRole) && !fRole.includes(uRole)) {
          return false
        }
      }
      if (userDeptFilter !== 'ALL') {
        const uDept = (u.department || u.dept || '').toLowerCase().trim()
        const fDept = userDeptFilter.toLowerCase().trim()
        if (!uDept.includes(fDept) && !fDept.includes(uDept)) return false
      }
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase().trim()
        const nameMatch = (u.name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(q)
        const emailMatch = (u.email || '').toLowerCase().includes(q)
        const codeMatch = (u.employee_code || u.employee_id || '').toLowerCase().includes(q)
        if (!nameMatch && !emailMatch && !codeMatch) return false
      }
      return true
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [allUsers, userRoleFilter, userDeptFilter, userSearchQuery])

  // Filtered Roles List for Templates Tab
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const isSys = r.isSystem || r.is_system
      const matchesType = typeFilter === 'ALL' || (typeFilter === 'SYSTEM' && isSys) || (typeFilter === 'CUSTOM' && !isSys)
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && r.status === 'Active') || (statusFilter === 'INACTIVE' && r.status === 'Inactive')
      return matchesSearch && matchesType && matchesStatus
    })
  }, [roles, searchQuery, typeFilter, statusFilter])

  const customOverrideCount = useMemo(() => allUsers.filter((u) => u.custom_permissions?.is_manual).length, [allUsers])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <div className="w-10 h-10 border-4 border-[#0B2545] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Loading RBAC permission settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#D4ECFC]/25 border border-[#64B5F6]/25 rounded-3xl p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2545] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#1E88E5]" /> Roles & Access Control (RBAC)
          </h1>
          <p className="text-xs text-[#64748B] font-semibold mt-1">
            Assign user roles, configure default role templates, or manually customize granular access permissions.
          </p>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#0B2545] to-[#1E88E5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCheck className="w-4 h-4" /> User Access & Permissions
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-gradient-to-r from-[#0B2545] to-[#1E88E5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" /> Role Master Templates
            </button>
          </div>
        </div>

        {activeTab === 'roles' && (
          <button
            onClick={() => setShowAddRoleModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#0B2545]/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" /> Create Custom Role
          </button>
        )}
      </div>

      {/* Summary Stat Widgets Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total System Users</p>
            <h3 className="text-xl font-black text-[#0B2545] mt-0.5">{allUsers.length}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Mapped user accounts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E88E5] flex items-center justify-center font-extrabold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Default Role Presets</p>
            <h3 className="text-xl font-black text-emerald-600 mt-0.5">{allUsers.length - customOverrideCount}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Auto-aligned with System Settings</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom Manual Overrides</p>
            <h3 className="text-xl font-black text-indigo-600 mt-0.5">{customOverrideCount}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Users with tailored access</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-extrabold">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Templates</p>
            <h3 className="text-xl font-black text-[#0B2545] mt-0.5">{roles.length}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">System & custom templates</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-extrabold">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* VIEW 1: USER ACCESS & PERMISSIONS MANAGER */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filterable Users Roster */}
          <div className="lg:col-span-4 bg-gradient-to-br from-white via-white to-[#D4ECFC]/10 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-extrabold text-[#0B2545] text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1E88E5]" /> Select User ({filteredUsers.length})
              </h2>
              <span className="text-[10px] font-bold text-slate-400">Total: {allUsers.length}</span>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name, email, code..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#EEF4F8]/50 border border-[#64B5F6]/20 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E88E5] font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">👔 All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Sales Executive">Sales Executive</option>
                </select>

                <select
                  value={userDeptFilter}
                  onChange={(e) => setUserDeptFilter(e.target.value)}
                  className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">🏢 All Depts</option>
                  <option value="sales">Sales & BD</option>
                  <option value="hrms">HRMS</option>
                  <option value="finance">Finance</option>
                  <option value="ops">Operations</option>
                  <option value="it">IT Admin</option>
                </select>
              </div>
            </div>

            {/* Users Roster Cards */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-500">No users match your filters.</p>
                </div>
              ) : (
                filteredUsers.map((usr) => {
                  const isSelected = selectedUser?.id === usr.id
                  const isManual = usr.custom_permissions?.is_manual
                  const uInitials = (usr.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

                  return (
                    <div
                      key={usr.id}
                      onClick={() => handleSelectUser(usr, true)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer relative flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#1E88E5] bg-[#D4ECFC]/35 shadow-xs ring-2 ring-[#1E88E5]/15'
                          : 'border-[#64B5F6]/20 bg-[#EEF4F8]/10 hover:bg-white hover:border-[#64B5F6]/50 shadow-3xs'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#0B2545] to-[#1E88E5] rounded-l-xl" />
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-extrabold text-xs flex items-center justify-center shrink-0 border border-white shadow-2xs">
                          {getUserPhoto(usr) ? (
                            <img src={getUserPhoto(usr)} alt={usr.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            uInitials
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-[#0B2545] truncate">{usr.name}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold truncate">{usr.email}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-extrabold border border-blue-100">
                              👔 {usr.role || usr.designation || 'Sales Executive'}
                            </span>
                            {isManual ? (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold border border-indigo-100 flex items-center gap-0.5">
                                <Wrench className="w-2.5 h-2.5" /> Manual Custom
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold border border-emerald-100 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Default Preset
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

          {/* Right Column: Selected User Permission Control Panel */}
          {selectedUser ? (
            <div className="lg:col-span-8 bg-gradient-to-br from-white via-white to-[#D4ECFC]/15 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-5">
              {/* Header User Profile & Role Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#1E88E5] text-white font-extrabold text-base flex items-center justify-center shrink-0 border-2 border-white shadow-xs">
                    {(selectedUser.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-[#0B2545] text-base">{selectedUser.name}</h2>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {selectedUser.email} · {selectedUser.employee_code || selectedUser.employee_id || 'ID'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Permission Mode:</label>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setUserPermMode('default')
                          setUserCustomPerms({})
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                          userPermMode === 'default'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> Default
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserPermMode('manual')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                          userPermMode === 'manual'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Wrench className="w-3 h-3" /> Manual
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Assign User Role:</label>
                    <select
                      value={selectedUserRole}
                      onChange={(e) => setSelectedUserRole(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-[#0B2545] focus:outline-none focus:border-[#1E88E5] shadow-2xs cursor-pointer"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Sales Manager">Sales Manager</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Sales Executive">Sales Executive</option>
                      {roles.filter(r => !(r.isSystem || r.is_system)).map(cr => (
                        <option key={cr.id} value={cr.name}>{cr.name} (Custom)</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSaveUserPermissions}
                    disabled={userSaving}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0B2545]/15"
                  >
                    {userSaving ? (
                      <span className="animate-spin text-xs">🌀 Saving...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save User Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>



              {/* Permission Matrix Component */}
              <PermissionMatrixEditor
                role={selectedUserRole}
                permissions={activeUserPermissions}
                isDefaultMode={userPermMode === 'default'}
                onSwitchToManual={() => {
                  setUserPermMode('manual')
                  setUserCustomPerms(defaultMasterPerms)
                }}
                onChange={(updatedPerms) => {
                  setUserPermMode('manual')
                  setUserCustomPerms(updatedPerms)
                }}
              />
            </div>
          ) : (
            <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-700 text-sm">Select a user from the roster to manage permissions</h3>
              <p className="text-xs text-slate-400 font-medium">Use search or filters on the left to quickly locate any employee.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ROLE MASTER TEMPLATES */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Roles Roster List */}
          <div className="lg:col-span-4 bg-gradient-to-br from-white via-white to-[#D4ECFC]/10 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-extrabold text-[#0B2545] text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1E88E5]" /> Master Role Templates ({filteredRoles.length})
              </h2>
            </div>

            {/* Search bar & Type/Status filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search master roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#EEF4F8]/50 border border-[#64B5F6]/20 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1E88E5] font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">All Types</option>
                  <option value="SYSTEM">System Roles</option>
                  <option value="CUSTOM">Custom Roles</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-1/2 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[#1E88E5]"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>
            </div>

            {/* Roles Cards */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id
                const isSys = role.isSystem || role.is_system

                return (
                  <div
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`p-4 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1E88E5] bg-[#D4ECFC]/35 shadow-xs ring-2 ring-[#1E88E5]/15'
                        : 'border-[#64B5F6]/20 bg-[#EEF4F8]/10 hover:bg-white hover:border-[#64B5F6]/50 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-extrabold text-[#0B2545] text-xs flex items-center gap-1.5 uppercase tracking-tight">
                          {role.name}
                          {isSys ? (
                            <span className="text-[8px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase border border-slate-300">
                              System
                            </span>
                          ) : (
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase border border-indigo-100">
                              Custom
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#64748B] font-medium leading-relaxed line-clamp-2">
                      {role.description || 'System master template for role permissions.'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Master Role Permission Matrix */}
          {selectedRole && (
            <div className="lg:col-span-8 bg-gradient-to-br from-white via-white to-[#D4ECFC]/15 p-5 rounded-3xl border border-[#64B5F6]/25 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-extrabold text-[#0B2545] text-base">{selectedRole.name} Master Template</h2>
                  <p className="text-[11px] text-[#64748B] font-semibold mt-1">
                    Updates to this template automatically apply to all users configured with Default Role Presets.
                  </p>
                </div>

                <button
                  onClick={handleSavePermissions}
                  className="px-4 py-2 bg-gradient-to-r from-[#0B2545] to-[#1E88E5] hover:from-[#1E88E5] hover:to-[#64B5F6] text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0B2545]/15"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Master Template
                </button>
              </div>

              <PermissionMatrixEditor
                role={selectedRole.name}
                permissions={selectedRole.custom_permissions || getMasterPermissionsForRole(selectedRole.name, roles)}
                onChange={(updatedPerms) => {
                  setHasChanges(true)
                  const updatedRoleObj = {
                    ...selectedRole,
                    custom_permissions: updatedPerms,
                  }
                  setSelectedRole(updatedRoleObj)
                  setRoles((prevRoles) =>
                    prevRoles.map((r) => (r.id === selectedRole.id || r.name === selectedRole.name ? updatedRoleObj : r))
                  )
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* COMPACT CHOICE POPUP WHEN SELECTING USER */}
      {showPresetPopupModal && pendingUserSelect && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 space-y-3 border border-slate-200 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-[#0B2545] text-xs">Permission Mode</span>
              <button onClick={() => setShowPresetPopupModal(false)} className="text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer p-1">✕</button>
            </div>

            <p className="text-xs text-slate-600 font-semibold">
              Select mode for <strong>{pendingUserSelect.name}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUserPermMode('default')
                  setUserCustomPerms({})
                  setShowPresetPopupModal(false)
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Default
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserPermMode('manual')
                  setShowPresetPopupModal(false)
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-4 h-4" />
                Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#DCE3EF] shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-[#0B2545] text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1E88E5]" /> Create Custom Role
              </h3>
              <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1">
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newRole.name) return
              const createdRole = {
                id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
                name: newRole.name,
                description: newRole.description || 'Custom role',
                isSystem: false,
                status: 'Active',
              }
              const updatedRoles = [...roles, createdRole]
              setRoles(updatedRoles)
              setShowAddRoleModal(false)
              showToast(`Custom Role '${createdRole.name}' created!`, 'success')
            }} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Role Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Regional Director, Operations Lead"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-800 font-extrabold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of responsibilities..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#1E88E5]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2545] hover:bg-[#1E88E5] text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement
