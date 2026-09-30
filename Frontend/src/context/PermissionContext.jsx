import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import authSession from '../utils/authSession.js'
import { getApiBaseUrl } from '../utils/apiConfig.js'

const PermissionContext = createContext({
  permissions: {},
  scopes: {},
  loading: true,
  error: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  getScope: () => 'OWN',
  refreshPermissions: async () => {},
})

export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState({})
  const [scopes, setScopes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadEmployeePermissions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const storedUser = authSession.getStoredUser()
      if (!storedUser) {
        setPermissions({})
        setScopes({})
        setLoading(false)
        return
      }

      let permDict = {}
      let scopeDict = {}

      // 1. Check permissions object directly attached on user object (e.g. from login / auth payload)
      if (storedUser.permissions && typeof storedUser.permissions === 'object' && !Array.isArray(storedUser.permissions)) {
        permDict = { ...storedUser.permissions }
        if (storedUser.scopes && typeof storedUser.scopes === 'object') {
          scopeDict = { ...storedUser.scopes }
        }
      } else if (Array.isArray(storedUser.permissions) || Array.isArray(storedUser.structured_permissions)) {
        const arr = storedUser.permissions || storedUser.structured_permissions
        arr.forEach((p) => {
          const key = p.permission_key || p.key
          if (key) {
            permDict[key] = Boolean(p.is_granted ?? p.enabled ?? true)
            if (p.data_scope || p.scope) {
              scopeDict[key] = p.data_scope || p.scope
            }
          }
        })
      }

      // 2. Fetch fresh effective permissions from backend API to ensure real-time accuracy
      const token = authSession.getStoredToken()
      if (token) {
        try {
          const empId = storedUser.employee_code || storedUser.employee_id || storedUser.id || storedUser.user_id || 'self'
          const res = await fetch(`${getApiBaseUrl()}/users/${encodeURIComponent(empId)}/permissions`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (res.ok) {
            const json = await res.json()
            const data = json?.data || json
            if (data && data.permissions && typeof data.permissions === 'object') {
              permDict = { ...permDict, ...data.permissions }
            }
            if (data && data.scopes && typeof data.scopes === 'object') {
              scopeDict = { ...scopeDict, ...data.scopes }
            }
          }
        } catch (apiErr) {
          // If network error or non-admin call, keep loaded perms from session payload
          console.warn('[PermissionContext] API fetch notice:', apiErr?.message)
        }
      }

      setPermissions(permDict)
      setScopes(scopeDict)
    } catch (err) {
      console.error('[PermissionContext] Error loading permissions:', err)
      setError(err)
      setPermissions({})
      setScopes({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmployeePermissions()
  }, [loadEmployeePermissions])

  /**
   * Evaluates if the employee possesses an explicit capability key.
   * Default state: All canonical permissions enabled unless explicitly set to false by Admin.
   * NO role/designation bypass logic.
   */
  const hasPermission = useCallback((permissionKey) => {
    if (!permissionKey) return true
    if (loading) return false
    if (error) return false

    // Explicit false means Admin explicitly disabled this permission for the employee.
    // If undefined or true, employee inherits default enabled access.
    return permissions[permissionKey] !== false
  }, [loading, error, permissions])

  const hasAnyPermission = useCallback((permissionKeys = []) => {
    if (!permissionKeys || permissionKeys.length === 0) return true
    return permissionKeys.some((key) => hasPermission(key))
  }, [hasPermission])

  const hasAllPermissions = useCallback((permissionKeys = []) => {
    if (!permissionKeys || permissionKeys.length === 0) return true
    return permissionKeys.every((key) => hasPermission(key))
  }, [hasPermission])

  const getScope = useCallback((permissionKey) => {
    if (!permissionKey) return 'OWN'
    return scopes[permissionKey] || 'OWN'
  }, [scopes])

  const value = useMemo(() => ({
    permissions,
    scopes,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getScope,
    refreshPermissions: loadEmployeePermissions,
  }), [permissions, scopes, loading, error, hasPermission, hasAnyPermission, hasAllPermissions, getScope, loadEmployeePermissions])

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

export default PermissionContext
