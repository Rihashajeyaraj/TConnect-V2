import React, { useState, useEffect, useMemo } from 'react'

/** Normalize legacy role names (e.g. Super Admin → Admin) */
export function normalizeRole(role) {
  if (!role) return ''
  const r = role.trim()
  if (r.toLowerCase() === 'super admin' || r === 'System Admin') return 'Admin'
  return r
}

export function getStoredUser() {
  try {
    const saved = localStorage.getItem('user')
    if (saved) {
      const parsed = JSON.parse(saved)
      const email = (parsed.email || '').toLowerCase().trim()
      const emailPrefix = email ? email.split('@')[0] : 'user'
      const sanitizedId = email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'user_default'

      return {
        id: parsed.id || parsed.user_id || parsed.sub || `usr_${sanitizedId}`,
        user_id: parsed.user_id || parsed.id || parsed.sub || `usr_${sanitizedId}`,
        employee_id: parsed.employee_id || parsed.employee_code || `EMP-${emailPrefix.toUpperCase()}`,
        employee_code: parsed.employee_code || parsed.employee_id || `EMP-${emailPrefix.toUpperCase()}`,
        email: email,
        name: parsed.name || parsed.full_name || emailPrefix || 'User',
        full_name: parsed.full_name || parsed.name || emailPrefix || 'User',
        role: normalizeRole(parsed.role),
        designation: parsed.designation || 'Sales Executive',
      }
    }
  } catch (e) {}
  return { id: '', user_id: '', employee_id: '', employee_code: '', email: '', name: 'User', full_name: 'User', role: '', designation: '' }
}

export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser)

  useEffect(() => {
    const sync = () => setUser(getStoredUser())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return useMemo(() => {
    const initials = (user.name || user.email || 'U')
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('')

    return { ...user, initials }
  }, [user.id, user.email, user.role, user.name, user.employee_code, user.full_name])
}

export default useCurrentUser
