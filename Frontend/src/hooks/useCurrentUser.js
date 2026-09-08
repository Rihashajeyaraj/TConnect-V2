import React, { useState, useEffect, useMemo, useRef } from 'react'

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
    const sync = () => {
      const fresh = getStoredUser()
      setUser((prev) => {
        if (
          prev.id === fresh.id &&
          prev.email === fresh.email &&
          prev.role === fresh.role &&
          prev.name === fresh.name &&
          prev.employee_code === fresh.employee_code
        ) {
          return prev
        }
        return fresh
      })
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const memoizedUser = useMemo(() => {
    const initials = (user.name || user.email || 'U')
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('')

    return { ...user, initials }
  }, [user.id, user.user_id, user.email, user.role, user.name, user.employee_code, user.employee_id, user.full_name])

  // Stable reference caching to prevent unnecessary re-renders in useEffect dependencies
  const userRef = useRef(memoizedUser)
  if (
    userRef.current.id !== memoizedUser.id ||
    userRef.current.email !== memoizedUser.email ||
    userRef.current.role !== memoizedUser.role ||
    userRef.current.name !== memoizedUser.name ||
    userRef.current.employee_code !== memoizedUser.employee_code
  ) {
    userRef.current = memoizedUser
  }

  return userRef.current
}

export default useCurrentUser
