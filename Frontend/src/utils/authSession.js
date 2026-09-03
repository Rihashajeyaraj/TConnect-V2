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
  return ''
}

export function getDashboardForUser(user) {
  if (!user) return '/sales'

  if (user.dashboard && typeof user.dashboard === 'string' && user.dashboard.startsWith('/')) {
    return user.dashboard
  }

  const normalized = normalizeRole(user)
  switch (normalized) {
    case 'ceo':
      return '/ceo'
    case 'admin':
      return '/admin'
    case 'manager':
      return '/manager'
    case 'sales':
    default:
      return '/sales'
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

export default {
  getStoredToken,
  getStoredRefreshToken,
  getStoredUser,
  normalizeRole,
  getDashboardForUser,
  saveSession,
  restoreSession,
  clearSession,
}
