import { Navigate, Outlet } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'

function ProtectedRoute({ allowedRoles }) {
  const { showToast } = useToast()
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  const userStr = localStorage.getItem('user')

  // 1. Check if user is authenticated with a valid JWT token
  if (!token || !userStr) {
    return <Navigate to="/" replace />
  }

  let user = null
  try {
    user = JSON.parse(userStr)
  } catch (e) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return <Navigate to="/" replace />
  }

  // 2. Check if user's assigned role is authorized to view this portal
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase()
    const isAllowed = allowedRoles.some((r) => userRole.includes(r.toLowerCase()))

    if (!isAllowed) {
      showToast(`Access Denied: Your account role does not have authorization for this portal.`, 'error')

      if (userRole.includes('admin')) {
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
  }

  return <Outlet />
}

export default ProtectedRoute
