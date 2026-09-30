/**
 * TWiTE Connect Dynamic RBAC Authorization Utility
 * Provides dynamic, data-driven permission checks for components, views, and navigation menus.
 * 
 * STRICT COMPLIANCE:
 * - Authorization is based strictly on the employee's effective permission map.
 * - NO hard-coded CEO, Admin, Manager, or designation bypasses.
 * - Fails closed when missing permissions.
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

  // Check structured permissions stored in user payload
  const userPermissions = user.permissions || user.effective_permissions || user.structured_permissions

  // 1. Dictionary permissions check: { "crm.leads.view": true }
  if (userPermissions && typeof userPermissions === 'object' && !Array.isArray(userPermissions)) {
    if (userPermissions[permissionKey] !== undefined) {
      return Boolean(userPermissions[permissionKey])
    }
  }

  // 2. Structured permission array check: [{ permission_key: 'crm.leads.view', is_granted: true }]
  if (Array.isArray(userPermissions)) {
    const match = userPermissions.find(
      (p) => (p.permission_key === permissionKey || p.key === permissionKey)
    )
    if (match) {
      return Boolean(match.is_granted ?? match.enabled ?? true)
    }
  }

  // Fail closed if permission key is not found in employee permission set
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
 * Checks if a user has ALL of the specified permissions enabled.
 * @param {Array<string>} permissionKeys
 * @param {Object} [userPayload]
 * @returns {boolean}
 */
export function hasAllPermissions(permissionKeys = [], userPayload = null) {
  if (!permissionKeys || permissionKeys.length === 0) return true
  return permissionKeys.every((key) => hasPermission(key, userPayload))
}

/**
 * Retrieves the data access scope for a specific permission ('OWN', 'TEAM', 'ORG').
 * @param {string} permissionKey
 * @param {Object} [userPayload]
 * @returns {string}
 */
export function getAccessScope(permissionKey, userPayload = null) {
  const user = userPayload || authSession.getStoredUser()
  if (!user) return 'OWN'

  const userScopes = user.scopes || user.scope_map
  if (userScopes && typeof userScopes === 'object' && userScopes[permissionKey]) {
    return String(userScopes[permissionKey]).toUpperCase()
  }

  const userPermissions = user.permissions || user.effective_permissions || user.structured_permissions
  if (Array.isArray(userPermissions)) {
    const match = userPermissions.find(
      (p) => (p.permission_key === permissionKey || p.key === permissionKey)
    )
    if (match && (match.data_scope || match.scope || match.access_scope)) {
      return String(match.data_scope || match.scope || match.access_scope).toUpperCase()
    }
  }

  return 'OWN'
}

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAccessScope,
}
