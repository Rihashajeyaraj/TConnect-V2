import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import { authAPI } from '../services/api.js'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

function LoginForm() {
  const { showToast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState('sales') // default to sales executive

  const [email, setEmail] = useState('executive@tconnect.com')
  const [password, setPassword] = useState('SalesPassword2026#')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSelectRolePill = (roleId) => {
    setSelectedRole(roleId)
    if (roleId === 'ceo') {
      setEmail('ceo@tconnect.com')
      setPassword('Admin2026#')
    } else if (roleId === 'admin') {
      setEmail('admin@tconnect.com')
      setPassword('Admin2026#')
    } else if (roleId === 'manager') {
      setEmail('manager@tconnect.com')
      setPassword('ManagerPassword2026#')
    } else if (roleId === 'sales') {
      setEmail('executive@tconnect.com')
      setPassword('SalesPassword2026#')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email || !password) {
      showToast('Please enter your portal access email address and password!', 'error')
      return
    }

    setLoading(true)

    try {
      // Call Backend JWT Authentication Endpoint
      const res = await authAPI.login({ email, password })

      if (res && res.data && res.data.access_token) {
        const token = res.data.access_token
        const userPayload = res.data.user || {}
        const userRole = userPayload.role || selectedRole

        // Save JWT Access Token to LocalStorage
        localStorage.setItem('token', token)
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify({
          email: email,
          role: userRole,
        }))

        showToast(`Authentication successful! Welcome to TwiteConnect.`, 'success')

        // Determine destination portal route
        let targetRoute = '/sales'
        if (selectedRole === 'ceo' || userRole.toLowerCase().includes('ceo') || email.toLowerCase().includes('ceo')) {
          targetRoute = '/ceo'
        } else if (selectedRole === 'admin' || userRole.toLowerCase().includes('admin') || email.toLowerCase().includes('admin')) {
          targetRoute = '/admin'
        } else if (selectedRole === 'manager' || userRole.toLowerCase().includes('manager') || email.toLowerCase().includes('manager')) {
          targetRoute = '/manager'
        } else {
          targetRoute = '/sales'
        }

        setTimeout(() => {
          navigate(targetRoute)
        }, 300)
      } else {
        throw new Error('No access token received from authentication server.')
      }
    } catch (err) {
      const errMsg = err?.message || err?.detail || 'Invalid email or password. Access denied.'
      showToast(`Login Failed: ${errMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-600/30">
            TC
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">TwiteConnect</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight pt-2">Welcome back!</h2>
        <p className="text-sm text-slate-500 font-medium">Sign in with your verified portal access credentials.</p>
      </div>

      {/* Role Selection Switcher - Quick Preset Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Select Target Portal:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-inner">
          {[
            { id: 'sales', label: '📱 Executive' },
            { id: 'manager', label: '👔 Manager' },
            { id: 'admin', label: '🛡️ Admin' },
            { id: 'ceo', label: '👑 CEO' },
          ].map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handleSelectRolePill(role.id)}
              className={`py-2.5 px-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                selectedRole === role.id
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.03]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="email">
            Access Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@tconnect.com"
              className="w-full h-12 bg-slate-50 border border-slate-300/90 rounded-xl pl-11 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 shadow-xs transition-all"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700" htmlFor="password">
              Portal Access Password
            </label>
            <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter portal password"
              className="w-full h-12 bg-slate-50 border border-slate-300/90 rounded-xl pl-11 pr-11 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 shadow-xs transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
          <label className="flex items-center gap-2 cursor-pointer font-semibold">
            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
            <span>Remember me</span>
          </label>
        </div>

        {/* Secure Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-13 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-base shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Authenticating Credentials...' : 'Sign in to Portal'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      {/* Or Divider */}
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase absolute">or</span>
      </div>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={() => showToast('Google SSO authentication active!', 'info')}
        className="w-full h-12 bg-white border border-slate-300/90 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Sign in with Google
      </button>

      {/* Footer */}
      <p className="text-center text-xs font-semibold text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-extrabold text-blue-600 hover:text-blue-700">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default LoginForm
