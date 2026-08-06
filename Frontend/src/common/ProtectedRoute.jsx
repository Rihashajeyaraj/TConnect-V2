import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'

function ProtectedRoute({ allowedRoles }) {
  const { showToast } = useToast()
  const rawToken = localStorage.getItem('token') || localStorage.getItem('access_token')
  const userStr = localStorage.getItem('user')

  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null

  let user = null
  try {
    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
      user = JSON.parse(userStr)
    }
  } catch (e) {
    user = null
  }

  const userRole = (user?.role || '').toLowerCase()
  const isAuthenticated = Boolean(token && user && typeof user === 'object')

  const isAllowed = isAuthenticated && (!allowedRoles || allowedRoles.length === 0 || allowedRoles.some((r) => {
    const roleLower = r.toLowerCase()
    return userRole.includes(roleLower) || roleLower.includes(userRole)
  }))

  // ALL HOOKS MUST BE AT THE TOP OF THE COMPONENT (Before any early returns)
  useEffect(() => {
    if (isAuthenticated && !isAllowed) {
      showToast(`Access Denied: Your account role does not have authorization for this portal.`, 'error')
    }
  }, [isAuthenticated, isAllowed, showToast])

  // Early Returns AFTER all hooks
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!isAllowed) {
    if (userRole.includes('admin') || userRole.includes('super')) {
      return <Navigate to="/admin" replace />
    } else if (userRole.includes('ceo')) {
      return <Navigate to="/ceo" replace />
    } else if (userRole.includes('manager')) {
      return <Navigate to="/manager" replace />
    } else if (userRole.includes('sales') || userRole.includes('executive')) {
      return <Navigate to="/sales" replace />
    }
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
