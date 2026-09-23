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
  const userEmpCode = String(user.employee_code || user.employee_id || user.emp_code || '').toLowerCase().trim()
  const userId = String(user.id || user.user_id || '').toLowerCase().trim()
  const userName = String(user.name || user.full_name || '').toLowerCase().trim()

  if (!userEmail && !userEmpCode && !userId && !userName) return false

  const itemStaffEmail = String(
    item.assigned_to_email ||
    item.assignedToEmail ||
    item.executiveEmail ||
    item.staff_email ||
    item.owner_email ||
    item.employee_email ||
    item.user_email ||
    item.submitted_by_email ||
    item.created_by_email ||
    item.email ||
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

  // 1. Exact or partial match on Email
  if (userEmail && (itemStaffEmail === userEmail || itemAssignedTo === userEmail || (itemStaffEmail && itemStaffEmail.includes(userEmail)))) {
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

  // 4. Match on Full Name or partial name
  if (userName && itemAssignedTo && (itemAssignedTo === userName || userName.includes(itemAssignedTo) || itemAssignedTo.includes(userName))) {
    return true
  }

  // 5. Fallback: If record has no staff assignment tag at all, treat as shared/unassigned so newly created records don't vanish
  if (!itemStaffEmail && !itemEmpCode && !itemUserId && !itemAssignedTo) {
    return true
  }

  return false
}

/**
 * Filter an array of items to return only those belonging to the logged-in user.
 * Managers, Team Leads, CEOs, and Admins can view all team records.
 */
export function filterUserItems(itemsArr, user) {
  if (!Array.isArray(itemsArr)) return []
  if (!user) return []

  const role = String(user.role || user.designation || '').toLowerCase().trim()
  // Admin, CEO, Manager, Team Lead can view all team records
  if (
    role.includes('admin') ||
    role.includes('ceo') ||
    role.includes('manager') ||
    role.includes('lead') ||
    role.includes('super')
  ) {
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

  const isAdmin = role.includes('admin')
  const isCeo = role.includes('ceo')

  return notifications.filter((n) => {
    const cat = String(n.category || n.type || '').toUpperCase().trim()
    const recipEmail = String(n.recipient_email || n.assigned_to_email || n.email || '').toLowerCase().trim()
    const recipId = String(n.recipient_id || n.recipient_user_id || n.employee_id || n.user_id || '').toLowerCase().trim()
    const recipRole = String(n.recipient_role || n.role || 'all').toLowerCase().trim()
    const senderEmail = String(n.sender_email || '').toLowerCase().trim()
    const senderId = String(n.sender_id || n.employee_id || '').toLowerCase().trim()
    const mgrEmail = String(n.manager_email || n.reporting_manager_email || '').toLowerCase().trim()
    const mgrId = String(n.manager_id || n.reporting_manager_id || '').toLowerCase().trim()
    const titleMsg = `${n.title || ''} ${n.message || ''}`.toLowerCase()

    // 1. ADMIN PRIVACY RULE:
    // Admin receives ONLY system & admin task details. Admin MUST NOT receive executive chats, expense claims, location inquiries/replies, or live tracking!
    if (isAdmin) {
      if (
        cat.includes('INQUIRY') ||
        cat.includes('REPLY') ||
        cat.includes('EXPENSE') ||
        cat.includes('CLAIM') ||
        cat.includes('TRACKING') ||
        cat.includes('GPS') ||
        cat.includes('CHAT') ||
        cat.includes('MESSAGE')
      ) {
        return false
      }
      return (
        cat.includes('ADMIN') ||
        cat.includes('SYSTEM') ||
        cat.includes('USER') ||
        cat.includes('ROLE') ||
        cat.includes('SECURITY') ||
        recipRole.includes('admin') ||
        (recipEmail && userEmail && recipEmail === userEmail) ||
        (recipId && userEmpCode && recipId === userEmpCode)
      )
    }

    // 2. CEO PRIVACY RULE:
    // CEO receives high-level executive updates, but NOT private location inquiries/replies or private chats unless addressed to CEO
    if (isCeo) {
      if (cat.includes('INQUIRY') || cat.includes('REPLY') || cat.includes('CHAT') || cat.includes('MESSAGE')) {
        return (recipEmail && userEmail && recipEmail === userEmail) || (recipId && userEmpCode && recipId === userEmpCode)
      }
      return true
    }

    // 3. LOCATION INQUIRY & REPLY PRIVACY:
    // Must go ONLY to the explicit recipient or the explicit sender!
    if (cat.includes('INQUIRY') || cat.includes('REPLY')) {
      const isDirectRecipient = (recipEmail && userEmail && recipEmail === userEmail) || (recipId && userEmpCode && recipId === userEmpCode)
      const isDirectSender = (senderEmail && userEmail && senderEmail === userEmail) || (senderId && userEmpCode && senderId === userEmpCode)
      return isDirectRecipient || isDirectSender
    }

    // 4. EXPENSE CLAIMS & LIVE TRACKING REPORTING MANAGER PRIVACY:
    // Go ONLY to the submitting executive or their direct Reporting Manager!
    if (cat.includes('EXPENSE') || cat.includes('CLAIM') || cat.includes('TRACKING') || cat.includes('GPS') || cat.includes('LOCATION')) {
      const isOwner =
        (recipEmail && userEmail && recipEmail === userEmail) ||
        (recipId && userEmpCode && recipId === userEmpCode) ||
        (senderEmail && userEmail && senderEmail === userEmail) ||
        (senderId && userEmpCode && senderId === userEmpCode)
      const isReportingManager =
        role.includes('manager') && !role.includes('lead') && !role.includes('tl') &&
        ((mgrEmail && userEmail && mgrEmail === userEmail) || (mgrId && userEmpCode && mgrId === userEmpCode) || (recipEmail && userEmail && recipEmail === userEmail))
      return isOwner || isReportingManager
    }

    // 5. MANAGER / TEAM LEAD PRIVACY SCOPING
    if (role.includes('manager') || role.includes('lead') || role.includes('tl')) {
      const teamEmails = new Set(teamMembers.map((m) => String(m.email || '').toLowerCase().trim()).filter(Boolean))
      const teamEmpCodes = new Set(teamMembers.map((m) => String(m.employee_id || m.employee_code || m.id || '').toLowerCase().trim()).filter(Boolean))

      if (userEmail && (recipEmail === userEmail || mgrEmail === userEmail)) return true
      if (userEmpCode && (recipId === userEmpCode || mgrId === userEmpCode)) return true
      if (recipEmail && teamEmails.has(recipEmail)) return true
      if (recipId && teamEmpCodes.has(recipId)) return true

      const isTargetedToOtherMgr = mgrEmail && mgrEmail !== userEmail
      if ((recipRole.includes('manager') || recipRole === 'all') && !isTargetedToOtherMgr && !recipEmail) {
        return true
      }
      return false
    }

    // 6. EXECUTIVE / SALES PRIVACY SCOPING
    if (recipEmail && userEmail && recipEmail !== userEmail) return false
    if (recipId && userEmpCode && recipId !== userEmpCode) return false
    if (userEmail && recipEmail && recipEmail === userEmail) return true
    if (userEmpCode && recipId && recipId === userEmpCode) return true
    if (titleMsg.includes('you have been') || titleMsg.includes('assigned to you')) return true

    if (
      recipRole === 'all' ||
      recipRole === 'everyone' ||
      recipRole === 'general' ||
      recipRole.includes('sales') ||
      recipRole.includes('executive')
    ) {
      return true
    }

    return !recipEmail && !recipId
  })
}

export default {
  isItemOwnedByUser,
  filterUserItems,
  filterUserNotifications,
  clearUserCache,
}

