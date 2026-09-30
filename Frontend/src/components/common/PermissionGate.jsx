import React from 'react'
import { usePermissions } from '../../context/PermissionContext.jsx'

export default function PermissionGate({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return fallback
  }

  let isAuthorized = true

  if (permission) {
    isAuthorized = hasPermission(permission)
  } else if (permissions.length > 0) {
    isAuthorized = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  if (!isAuthorized) {
    return fallback
  }

  return children
}
