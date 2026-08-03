import { useState, useEffect } from 'react'

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
      return {
        ...parsed,
        role: normalizeRole(parsed.role),
        email: parsed.email || '',
        name: parsed.name || parsed.email?.split('@')[0] || 'User',
      }
    }
  } catch (e) {}
  return { email: '', name: 'User', role: '' }
}

export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser)

  useEffect(() => {
    const sync = () => setUser(getStoredUser())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const initials = (user.name || user.email || 'U')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return { ...user, initials }
}

export default useCurrentUser
