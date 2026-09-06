import { clearUserCache } from './userScope.js'

/**
 * Centralized Canonical Auth Session Management Utility for TwiteConnect (TConnect)
 */

export function getStoredToken() {
  try {
    const rawToken =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('tc_persistent_token')
    if (rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.trim() !== '') {
      return rawToken.trim()
    }
  } catch (_) {}
  return null
}

export function getStoredRefreshToken() {
  try {
    const rawRefresh =
      localStorage.getItem('refresh_token') ||
      localStorage.getItem('tc_persistent_refresh_token')
    if (rawRefresh && rawRefresh !== 'undefined' && rawRefresh !== 'null' && rawRefresh.trim() !== '') {
      return rawRefresh.trim()
    }
  } catch (_) {}
  return null
}

export function getStoredUser() {
  try {
    const userStr =
      localStorage.getItem('user') ||
      localStorage.getItem('tc_persistent_user')
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      const userObj = JSON.parse(userStr)
      if (userObj && typeof userObj === 'object') {
        return userObj
      }
    }
  } catch (_) {}
  return null
}

export function normalizeRole(user) {
  if (!user) return ''
  const roleStr = String(
    user.role ||
    user.designation ||
    user.user_metadata?.role ||
    user.user_metadata?.designation ||
    ''
  ).toLowerCase().trim()

  if (
    roleStr.includes('ceo') ||
    roleStr.includes('founder') ||
    roleStr.includes('chief executive') ||
    roleStr.includes('managing director')
  ) {
    return 'ceo'
  }
  if (roleStr.includes('admin') || roleStr.includes('super')) {
    return 'admin'
  }
  if (
    roleStr.includes('team lead') ||
    roleStr.includes('lead') ||
    roleStr.includes('tl')
  ) {
    return 'team_lead'
  }
  if (roleStr.includes('manager')) {
    return 'manager'
  }
  if (
    roleStr.includes('sales') ||
    roleStr.includes('executive') ||
    roleStr.includes('specialist') ||
    roleStr.includes('representative')
  ) {
    return 'sales'
  }
  return 'sales'
}

export function getDashboardForUser(user) {
  if (!user) return '/sales'

  const roleStr = String(user.role || user.designation || '').toLowerCase().trim()
  if (roleStr.includes('team lead') || roleStr.includes('lead') || roleStr.includes('tl')) {
    return '/team-lead/dashboard'
  }

  if (user.dashboard && typeof user.dashboard === 'string' && user.dashboard.startsWith('/')) {
    return user.dashboard
  }

  const normalized = normalizeRole(user)
  switch (normalized) {
    case 'ceo':
      return '/ceo'
    case 'admin':
      return '/admin'
    case 'team_lead':
      return '/team-lead/dashboard'
    case 'manager':
      return '/manager'
    case 'sales':
    default:
      return '/sales/dashboard'
  }
}

export function saveSession(sessionData) {
  if (!sessionData) return

  const token = sessionData.access_token || sessionData.token
  const refreshToken = sessionData.refresh_token
  const user = sessionData.user

  if (token) {
    try {
      localStorage.setItem('token', token)
      localStorage.setItem('access_token', token)
      localStorage.setItem('tc_persistent_token', token)
    } catch (_) {}
  }

  if (refreshToken) {
    try {
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('tc_persistent_refresh_token', refreshToken)
    } catch (_) {}
  }

  if (user) {
    try {
      const userStr = typeof user === 'string' ? user : JSON.stringify(user)
      localStorage.setItem('user', userStr)
      localStorage.setItem('tc_persistent_user', userStr)
    } catch (_) {}
  }
}

export function restoreSession() {
  const token = getStoredToken()
  const user = getStoredUser()
  const refreshToken = getStoredRefreshToken()

  if (!token || !user) {
    return null
  }

  // Synchronize keys back into primary localStorage slots if missing
  saveSession({ access_token: token, refresh_token: refreshToken, user })

  return { token, refreshToken, user }
}

export function clearSession() {
  clearUserCache()
}

export const DEFAULT_ROLE_PERMISSIONS = {
  sales: {
    dashboard: { view: true, create_edit: false, approve: false, delete: false, export: false },
    map: { view: true, create_edit: true, approve: false, delete: false, export: false },
    attendance: { view: true, create_edit: true, approve: false, delete: false, export: false },
    customers: { view: true, create_edit: true, approve: false, delete: false, export: true },
    leads: { view: true, create_edit: true, approve: false, delete: false, export: true },
    expenses: { view: true, create_edit: true, approve: false, delete: false, export: false },
    hrms: { view: true, create_edit: true, approve: false, delete: false, export: false },
    todo: { view: true, create_edit: true, approve: false, delete: true, export: false },
  },
  team_lead: {
    dashboard: { view: true, create_edit: false, approve: false, delete: false, export: false },
    map: { view: true, create_edit: true, approve: false, delete: false, export: false },
    team: { view: true, create_edit: true, approve: false, delete: false, export: true },
    leads: { view: true, create_edit: true, approve: false, delete: false, export: true },
    visits: { view: true, create_edit: true, approve: false, delete: false, export: true },
    attendance: { view: true, create_edit: true, approve: true, delete: false, export: true },
    expenses: { view: true, create_edit: true, approve: true, delete: false, export: true },
    hrms: { view: true, create_edit: true, approve: false, delete: false, export: false },
  },
  manager: {
    dashboard: { view: true, create_edit: false, approve: false, delete: false, export: false },
    map: { view: true, create_edit: true, approve: false, delete: false, export: true },
    team: { view: true, create_edit: true, approve: true, delete: false, export: true },
    leads: { view: true, create_edit: true, approve: true, delete: true, export: true },
    customers: { view: true, create_edit: true, approve: true, delete: true, export: true },
    visits: { view: true, create_edit: true, approve: false, delete: false, export: true },
    attendance: { view: true, create_edit: true, approve: true, delete: false, export: true },
    followups: { view: true, create_edit: true, approve: false, delete: false, export: false },
    opportunities: { view: true, create_edit: true, approve: true, delete: false, export: true },
    expenses: { view: true, create_edit: true, approve: true, delete: true, export: true },
    reports: { view: true, create_edit: false, approve: false, delete: false, export: true },
    notifications: { view: true, create_edit: true, approve: false, delete: false, export: false },
    leaderboard: { view: true, create_edit: false, approve: false, delete: false, export: false },
    calendar: { view: true, create_edit: true, approve: false, delete: false, export: false },
    hrms: { view: true, create_edit: true, approve: true, delete: false, export: true },
    settings: { view: true, create_edit: true, approve: false, delete: false, export: false },
  },
  admin: {
    dashboard: { view: true, create_edit: true, approve: true, delete: true, export: true },
    company: { view: true, create_edit: true, approve: true, delete: true, export: true },
    users: { view: true, create_edit: true, approve: true, delete: true, export: true },
    customers: { view: true, create_edit: true, approve: true, delete: true, export: true },
    roles: { view: true, create_edit: true, approve: true, delete: true, export: true },
    hrms: { view: true, create_edit: true, approve: true, delete: true, export: true },
    reports: { view: true, create_edit: true, approve: true, delete: true, export: true },
    notifications: { view: true, create_edit: true, approve: true, delete: true, export: true },
    settings: { view: true, create_edit: true, approve: true, delete: true, export: true },
  },
  ceo: {
    dashboard: { view: true, create_edit: true, approve: true, delete: true, export: true },
    customers: { view: true, create_edit: true, approve: true, delete: true, export: true },
    team_management: { view: true, create_edit: true, approve: true, delete: true, export: true },
    hrms: { view: true, create_edit: true, approve: true, delete: true, export: true },
    sales_revenue: { view: true, create_edit: true, approve: true, delete: true, export: true },
    reports: { view: true, create_edit: true, approve: true, delete: true, export: true },
    notifications: { view: true, create_edit: true, approve: true, delete: true, export: true },
    settings: { view: true, create_edit: true, approve: true, delete: true, export: true },
    expenses: { view: true, create_edit: true, approve: true, delete: true, export: true },
  }
}

export function hasPermission(user, moduleKey, actionKey = 'view') {
  if (!user) return false
  const role = normalizeRole(user)
  if (role === 'ceo' || role === 'admin') return true

  const customPerms = user.custom_permissions || user.permissions
  if (customPerms && typeof customPerms === 'object' && customPerms[moduleKey]) {
    const modPerm = customPerms[moduleKey]
    if (typeof modPerm === 'boolean') return modPerm
    if (typeof modPerm === 'object' && modPerm[actionKey] !== undefined) {
      return Boolean(modPerm[actionKey])
    }
  }

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role]
  if (roleDefaults && roleDefaults[moduleKey]) {
    const defaultMod = roleDefaults[moduleKey]
    if (typeof defaultMod === 'boolean') return defaultMod
    if (typeof defaultMod === 'object' && defaultMod[actionKey] !== undefined) {
      return Boolean(defaultMod[actionKey])
    }
  }

  return true
}

export default {
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  normalizeRole,
  getDashboardForUser,
  saveSession,
  restoreSession,
  clearSession,
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
}
