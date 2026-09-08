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

/**
 * Filters notifications strictly according to privacy requirements:
 * 1. Sales Executive: Receives ONLY notifications meant for them or their own assignments/claims.
 * 2. Reporting Manager: Receives ONLY notifications for themselves or their direct team members.
 * 3. CEO & Admin: Oversee all system notifications.
 */
export function filterUserNotifications(notifications, user, teamMembers = []) {
  if (!Array.isArray(notifications)) return []
  if (!user) return []

  const role = String(user.role || user.designation || '').toLowerCase().trim()
  const userEmail = String(user.email || '').toLowerCase().trim()
  const userEmpCode = String(user.employee_code || user.employee_id || user.id || '').toLowerCase().trim()
  const userName = String(user.name || user.full_name || '').toLowerCase().trim()

  // Admin & CEO can view all system notifications
  if (role.includes('admin') || role.includes('ceo')) {
    return notifications
  }

  // MANAGER / TEAM LEAD PRIVACY SCOPING
  if (role.includes('manager') || role.includes('lead') || role.includes('tl')) {
    const teamEmails = new Set(teamMembers.map((m) => String(m.email || '').toLowerCase().trim()).filter(Boolean))
    const teamEmpCodes = new Set(teamMembers.map((m) => String(m.employee_id || m.employee_code || m.id || '').toLowerCase().trim()).filter(Boolean))
    const teamNames = new Set(teamMembers.map((m) => String(m.name || m.full_name || m.employee_name || '').toLowerCase().trim()).filter(Boolean))

    return notifications.filter((n) => {
      const recipEmail = String(n.recipient_email || n.assigned_to_email || n.email || '').toLowerCase().trim()
      const recipId = String(n.recipient_id || n.recipient_user_id || n.employee_id || n.user_id || '').toLowerCase().trim()
      const mgrEmail = String(n.manager_email || n.reporting_manager_email || '').toLowerCase().trim()
      const mgrId = String(n.manager_id || n.reporting_manager_id || '').toLowerCase().trim()
      const titleMsg = `${n.title || ''} ${n.message || ''}`.toLowerCase()

      // Direct match for manager
      if (userEmail && (recipEmail === userEmail || mgrEmail === userEmail)) return true
      if (userEmpCode && (recipId === userEmpCode || mgrId === userEmpCode)) return true

      // Belongs to team member reporting to this manager
      if (recipEmail && teamEmails.has(recipEmail)) return true
      if (recipId && teamEmpCodes.has(recipId)) return true
      for (const tName of teamNames) {
        if (tName && titleMsg.includes(tName)) return true
      }

      // Role broadcast for managers (if not targeted to another manager)
      const isTargetedToOtherMgr = mgrEmail && mgrEmail !== userEmail
      const recipRole = String(n.recipient_role || '').toLowerCase()
      if ((recipRole.includes('manager') || recipRole === 'all') && !isTargetedToOtherMgr && !recipEmail) {
        return true
      }

      return false
    })
  }

  // EXECUTIVE / SALES PRIVACY SCOPING (EXCLUSIVELY FOR THIS LOGGED-IN EXECUTIVE)
  return notifications.filter((n) => {
    const recipEmail = String(n.recipient_email || n.assigned_to_email || n.email || '').toLowerCase().trim()
    const recipId = String(n.recipient_id || n.recipient_user_id || n.employee_id || n.user_id || '').toLowerCase().trim()
    const recipName = String(n.recipient_name || n.assigned_to || n.employee_name || '').toLowerCase().trim()
    const titleMsg = `${n.title || ''} ${n.message || ''}`.toLowerCase()

    // 1. Direct match on email, employee code, or full name
    if (userEmail && recipEmail && recipEmail === userEmail) return true
    if (userEmpCode && recipId && recipId === userEmpCode) return true
    if (userName && recipName && recipName === userName) return true

    // 2. Explicit message targeting for this user
    if (titleMsg.includes('you have been') || titleMsg.includes('assigned to you')) return true
    if (userEmail && titleMsg.includes(userEmail)) return true
    if (userName && titleMsg.includes(userName)) return true

    // 3. Privacy barrier: if notification specifies another user's recipient details, FILTER IT OUT!
    if (recipEmail && recipEmail !== userEmail) return false
    if (recipId && recipId !== userEmpCode) return false

    // 4. Untargeted general system broadcasts
    const recipRole = String(n.recipient_role || '').toLowerCase()
    if (!recipEmail && !recipId && (recipRole === 'all' || recipRole === 'everyone' || recipRole === 'executive')) {
      return true
    }

    return false
  })
}

export default {
  isItemOwnedByUser,
  filterUserItems,
  filterUserNotifications,
  clearUserCache,
}

