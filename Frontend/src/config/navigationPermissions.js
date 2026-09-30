/**
 * Centralized Sidebar & Route Permission Mapping Configuration
 * Maps route paths & menu identifiers to their authoritative permission requirement keys.
 * 
 * Used for filtering sidebar menus and enforcing route guards.
 */

export const ROUTE_PERMISSION_MAP = {
  // CRM / Leads
  '/sales/leads': 'crm.leads.view',
  '/manager/leads': 'crm.leads.view',
  '/team-lead/leads': 'crm.leads.view',
  '/ceo/leads': 'crm.leads.view',

  // CRM / Customers & Clients
  '/sales/customers': 'crm.customers.view',
  '/manager/customers': 'crm.customers.view',
  '/team-lead/customers': 'crm.customers.view',
  '/ceo/customers': 'crm.customers.view',
  '/admin/customers': 'crm.customers.view',

  // Visits & Client Log
  '/sales/client-log': 'visit.visits.view',
  '/sales/visits': 'visit.visits.view',
  '/manager/visits': 'visit.visits.view',
  '/team-lead/visits': 'visit.visits.view',

  // Spatial & Smart Radar Maps
  '/sales/map': 'spatial.map.view',
  '/manager/map': 'spatial.map.view',
  '/team-lead/map': 'spatial.map.view',
  '/ceo/smart-map': 'spatial.map.view',

  // Expenses
  '/sales/expenses': 'expenses.view',
  '/manager/expenses': 'expenses.view',
  '/team-lead/expenses': 'expenses.view',
  '/ceo/expenses': 'expenses.view',

  // HRMS & Employee Management / Team Management
  '/sales/hrms': 'hrms.employees.view',
  '/manager/hrms': 'hrms.employees.view',
  '/team-lead/hrms': 'hrms.employees.view',
  '/ceo/hrms': 'hrms.employees.view',
  '/admin/hrms': 'hrms.employees.view',
  '/ceo/team-management': 'hrms.employees.view',
  '/manager/team': 'hrms.employees.view',
  '/team-lead/team': 'hrms.employees.view',

  // Reports
  '/manager/reports': 'reports.view',
  '/team-lead/reports': 'reports.view',
  '/ceo/reports': 'reports.view',
  '/ceo/sales-revenue': 'reports.view',
  '/admin/reports': 'reports.view',

  // Tasks & To-Do
  '/sales/todo': 'todo.tasks.view',
  '/manager/todo': 'todo.tasks.view',
  '/team-lead/todo': 'todo.tasks.view',

  // Settings & Company Overview
  '/manager/settings': 'system.settings.view',
  '/team-lead/settings': 'system.settings.view',
  '/ceo/settings': 'system.settings.view',
  '/admin/settings': 'system.settings.view',
  '/admin/company': 'system.settings.view',

  // Admin / User Management / Role Management / Audit
  '/admin/users': 'admin.users.view',
  '/admin/roles': 'admin.permissions.manage',
  '/admin/audit': 'system.audit.view',
}

/**
 * Filter an array of navigation items based on the employee's effective permission context.
 * Items without explicit permission requirements remain visible (e.g. Dashboard, Notifications).
 */
export function filterNavigationItems(items = [], hasPermissionFn) {
  if (!items || !Array.isArray(items)) return []
  if (typeof hasPermissionFn !== 'function') return items

  return items.filter((item) => {
    const requiredPermission = item.permission || ROUTE_PERMISSION_MAP[item.path]
    if (!requiredPermission) return true
    return hasPermissionFn(requiredPermission)
  })
}

export default {
  ROUTE_PERMISSION_MAP,
  filterNavigationItems,
}
