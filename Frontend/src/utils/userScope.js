/**
 * Centralized User Scoping & Data Isolation Utilities for TwiteConnect
 */

/**
 * Checks if a data record/item belongs strictly to the currently logged-in user.
 * Matches across possible backend/frontend schema attributes:
 * - email / assigned_to_email / assignedToEmail / executiveEmail
 * - employee_code / employee_id / emp_code
 * - user_id / userId / visitor_id / id
 * - assigned_to / assignedTo / executive / accountManager
 */
export function isItemOwnedByUser(item, user) {
  if (!item || !user) return false

  const userEmail = String(user.email || '').toLowerCase().trim()
  const userEmpCode = String(user.employee_code || user.employee_id || '').toLowerCase().trim()
  const userId = String(user.id || user.user_id || '').toLowerCase().trim()
  const userName = String(user.name || user.full_name || '').toLowerCase().trim()

  if (!userEmail && !userEmpCode && !userId && !userName) return false

  const itemEmail = String(
    item.assigned_to_email ||
    item.assignedToEmail ||
    item.executiveEmail ||
    item.email ||
    item.owner_email ||
    ''
  ).toLowerCase().trim()

  const itemEmpCode = String(
    item.employee_code ||
    item.employee_id ||
    item.emp_code ||
    item.employeeCode ||
    ''
  ).toLowerCase().trim()

  const itemUserId = String(
    item.user_id ||
    item.userId ||
    item.visitor_id ||
    item.created_by ||
    ''
  ).toLowerCase().trim()

  const itemAssignedTo = String(
    item.assigned_to ||
    item.assignedTo ||
    item.executive ||
    item.accountManager ||
    item.sales_executive ||
    item.employee_name ||
    item.employeeName ||
    item.submitted_by ||
    ''
  ).toLowerCase().trim()

  // 1. Exact match on Email
  if (userEmail && (itemEmail === userEmail || itemAssignedTo === userEmail)) {
    return true
  }

  // 2. Exact match on Employee Code / ID
  if (userEmpCode && itemEmpCode === userEmpCode) {
    return true
  }

  // 3. Exact match on User ID
  if (userId && itemUserId === userId) {
    return true
  }

  // 4. Exact match on Full Name if email/empcode not set on record
  if (userName && (itemAssignedTo === userName || (itemAssignedTo && userName.startsWith(itemAssignedTo)))) {
    return true
  }

  return false
}

/**
 * Filter an array of items to return only those belonging to the logged-in user.
 * If the user is an Admin, Super Admin, or Manager with team view, optionally bypass or apply team scope.
 */
export function filterUserItems(itemsArr, user) {
  if (!Array.isArray(itemsArr)) return []
  if (!user || !user.email) return []

  const role = String(user.role || '').toLowerCase().trim()
  // Admin & CEO can view all records
  if (role === 'admin' || role === 'super admin' || role === 'system admin' || role === 'ceo') {
    return itemsArr
  }

  return itemsArr.filter((item) => isItemOwnedByUser(item, user))
}

/**
 * Wipes all application cached data from localStorage and sessionStorage on logout.
 */
export function clearUserCache() {
  try {
    const keysToRemove = [
      'token',
      'access_token',
      'refresh_token',
      'tc_persistent_token',
      'tc_persistent_refresh_token',
      'user',
      'tc_persistent_user',
      'role',
      'user_role',
      'tc_sm_leads',
      'tc_customer_accounts',
      'tc_sales_visits',
      'tc_sales_followups',
      'tc_sales_expenses',
      'tc_attendance_logs',
      'tc_leave_requests',
      'tc_manager_leave_requests',
      'tc_manager_documents',
      'tc_se_documents',
      'tc_eod_reports',
      'tc_tasks',
      'tc_3d_todos',
      'tc_opportunities',
      'tc_app_notifications',
      'tc_user_profile',
    ]

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
    })

    // Also clear all keys starting with tc_
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('tc_')) {
        localStorage.removeItem(key)
      }
    })

    sessionStorage.clear()
  } catch (e) {
    console.warn('Error clearing user cache on logout:', e)
  }
}

export default {
  isItemOwnedByUser,
  filterUserItems,
  clearUserCache,
}
