/**
 * TWiTE Connect Dynamic RBAC Authorization Utility
 * Provides dynamic, data-driven permission checks for components, views, and navigation menus.
 */

import authSession from './authSession.js'

/**
 * Checks if a user has a specific permission enabled.
 * @param {string} permissionKey - e.g. 'crm.leads.view', 'hrms.attendance.mark'
 * @param {Object} [userPayload] - Optional user object. If omitted, uses current logged-in session user.
 * @returns {boolean}
 */
export function hasPermission(permissionKey, userPayload = null) {
  if (!permissionKey) return true

  const user = userPayload || authSession.getStoredUser()
  if (!user) return false

  // System Admin & CEO roles bypass all permission restrictions
  const roleNorm = authSession.normalizeRole(user)
  if (roleNorm === 'admin' || roleNorm === 'ceo') {
    return true
  }

  // Check structured permissions stored in user payload or local role permissions cache
  const userPermissions = user.permissions || user.structured_permissions || []

  // Structured permission array check
  if (Array.isArray(userPermissions)) {
    const match = userPermissions.find(
      (p) => p.permission_key === permissionKey || p.key === permissionKey
    )
    if (match) {
      return Boolean(match.enabled ?? true)
    }
  }

  // Fallback role-level heuristics for legacy sessions
  const keyLower = permissionKey.toLowerCase()
  if (roleNorm === 'manager' || roleNorm === 'team_lead') {
    if (keyLower.includes('delete') && (keyLower.includes('users') || keyLower.includes('company'))) {
      return false
    }
    return true
  }

  if (roleNorm === 'sales') {
    if (keyLower.includes('own') || keyLower.includes('mark') || keyLower.includes('view')) {
      return true
    }
    if (keyLower.includes('delete') || keyLower.includes('manage') || keyLower.includes('admin')) {
      return false
    }
    return true
  }

  return false
}

/**
 * Checks if a user has ANY of the specified permissions enabled.
 * @param {Array<string>} permissionKeys
 * @param {Object} [userPayload]
 * @returns {boolean}
 */
export function hasAnyPermission(permissionKeys = [], userPayload = null) {
  if (!permissionKeys || permissionKeys.length === 0) return true
  return permissionKeys.some((key) => hasPermission(key, userPayload))
}

/**
 * Retrieves the data access scope for a specific permission ('Own', 'Assigned', 'Team', 'Company', 'All').
 * @param {string} permissionKey
 * @param {Object} [userPayload]
 * @returns {string}
 */
export function getAccessScope(permissionKey, userPayload = null) {
  const user = userPayload || authSession.getStoredUser()
  if (!user) return 'Own'

  const roleNorm = authSession.normalizeRole(user)
  if (roleNorm === 'admin' || roleNorm === 'ceo') return 'All'
  if (roleNorm === 'manager' || roleNorm === 'team_lead') return 'Team'

  const userPermissions = user.permissions || user.structured_permissions || []
  if (Array.isArray(userPermissions)) {
    const match = userPermissions.find(
      (p) => p.permission_key === permissionKey || p.key === permissionKey
    )
    if (match && match.access_scope) {
      return match.access_scope
    }
  }

  return 'Own'
}

export default {
  hasPermission,
  hasAnyPermission,
  getAccessScope,
}
