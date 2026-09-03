import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import { authAPI } from '../services/api.js'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import TwiteConnectLogo from './TwiteConnectLogo.jsx'

function LoginForm() {
  const { showToast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email || !password) {
      showToast('Please enter your portal access email address and password!', 'error')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Authenticate strictly via Backend API (no client-side bypass)
      const res = await authAPI.login({ email: email.trim(), password: password.trim() })

      if (res && res.data && res.data.access_token) {
        const token = res.data.access_token
        const userObj = res.data.user || {}

        // Store JWT Access Token & User metadata across persistent keys
        localStorage.setItem('token', token)
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(userObj))
        localStorage.setItem('tc_persistent_token', token)
        localStorage.setItem('tc_persistent_user', JSON.stringify(userObj))

        const roleLower = (userObj.role || '').toLowerCase()
        showToast(`Authentication successful! Welcome ${userObj.full_name || userObj.employee_name || roleLower}.`, 'success')

        // Redirect strictly to assigned role portal
        let targetRoute = userObj.dashboard || '/sales'
        if (roleLower.includes('ceo') || roleLower.includes('founder') || roleLower.includes('chief executive')) {
          targetRoute = '/ceo'
        } else if (roleLower.includes('admin') || roleLower.includes('super')) {
          targetRoute = '/admin'
        } else if (roleLower.includes('manager')) {
          targetRoute = '/manager'
        } else if (roleLower.includes('sales') || roleLower.includes('executive')) {
          targetRoute = '/sales'
        }

        // 🔐 first_login check — Admin reset password, employee must change before proceeding
        if (userObj.first_login === true) {
          showToast('Admin has reset your password. Please set a new password to continue.', 'warning')
          setTimeout(() => {
            navigate('/change-password')
          }, 200)
          return
        }

        setTimeout(() => {
          navigate(targetRoute)
        }, 200)

      } else {
        throw new Error('Invalid Username or Password.')
      }
    } catch (err) {
      const errorMsg = err?.message || err?.data?.message || err?.detail || 'Invalid email or password. Please try again.'
      showToast(errorMsg, 'error')
      setErrorMsg(errorMsg)
      localStorage.removeItem('token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Brand Header */}
      <div className="space-y-2">
        <TwiteConnectLogo className="w-12 h-12" textClassName="text-slate-950 font-black text-3xl tracking-tight" />
        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight pt-1">Welcome back!</h2>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-black text-slate-900 mb-1.5" htmlFor="email">
            Access Email Address
          </label>
          <div className="relative">
            <Mail className="w-4.5 h-4.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 z-20" />
            <input
              id="email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
              placeholder="e.g. user@tconnect.com"
              className="w-full h-12 bg-white border-2 border-slate-300 rounded-xl pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 shadow-sm transition-all relative z-10"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-slate-900" htmlFor="password">
              Portal Access Password
            </label>
            <Link to="/forgot-password" className="text-xs font-extrabold text-blue-700 hover:text-blue-800">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 z-20" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg('') }}
              placeholder="Enter portal password"
              className="w-full h-12 bg-white border-2 border-slate-300 rounded-xl pl-11 pr-11 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 shadow-sm transition-all relative z-10"
              required
              disabled={loading}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer z-20"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* Inline error message */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            <svg className="mt-0.5 size-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3Z" /></svg>
            {errorMsg}
          </div>
        )}

        {/* Secure Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm shadow-md shadow-blue-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Authenticating...
            </>
          ) : (
            <>
              Sign in to Portal
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs font-semibold text-slate-500">
        Need account access? Contact your organization Administrator.
      </p>
    </div>
  )
}

export default LoginForm
