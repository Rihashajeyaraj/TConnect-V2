import { normalizeRole } from '../hooks/useCurrentUser.js'

const ROLE_ROUTE_MAP = {
  ceo: '/ceo',
  admin: '/admin',
  'sales manager': '/manager',
  manager: '/manager',
  'team lead': '/manager',
  tl: '/manager',
  'sales executive': '/sales',
  sales: '/sales',
  executive: '/sales',
}

export function getRouteForRole(role) {
  const normalized = normalizeRole(role).toLowerCase()
  for (const [key, route] of Object.entries(ROLE_ROUTE_MAP)) {
    if (normalized.includes(key)) return route
  }
  return '/sales'
}

export function isRoleAllowed(userRole, allowedRoles) {
  if (!allowedRoles?.length) return true
  const normalized = normalizeRole(userRole).toLowerCase()
  return allowedRoles.some((r) => {
    const allowed = normalizeRole(r).toLowerCase()
    return normalized.includes(allowed) || allowed.includes(normalized)
  })
}

export const CORE_ROLES = ['CEO', 'Admin', 'Sales Manager', 'Team Lead', 'Sales Executive']

export function isCeoRole(role) {
  const r = normalizeRole(role).toLowerCase()
  return r.includes('ceo')
}

export function isAdminRole(role) {
  const r = normalizeRole(role).toLowerCase()
  return r === 'admin' || r.includes('admin')
}
