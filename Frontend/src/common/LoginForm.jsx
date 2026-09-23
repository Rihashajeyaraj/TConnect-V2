import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import { authAPI } from '../services/api.js'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import TwiteConnectLogo from './TwiteConnectLogo.jsx'
import authSession from '../utils/authSession.js'
import bikeIcon from '../assets/bike-icon.png'

function LoginForm() {
  const { showToast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authProgress, setAuthProgress] = useState(0)
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
    setAuthProgress(15)

    // Smoothly advance bike progress indicator during authentication
    const progressInterval = setInterval(() => {
      setAuthProgress((prev) => {
        if (prev < 88) return prev + Math.floor(Math.random() * 6 + 4)
        return prev
      })
    }, 120)

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanPassword = password.trim()

      // 1. Authenticate strictly via Backend API
      const res = await authAPI.login({ email: cleanEmail, password: cleanPassword })

      const sessionPayload = res?.data?.access_token ? res.data : (res?.access_token ? res : (res?.data || res))
      const token = sessionPayload?.access_token || res?.access_token

      if (token && sessionPayload) {
        clearInterval(progressInterval)
        setAuthProgress(100) // Complete full loading on authentication success

        const userObj = sessionPayload.user || res?.user || {}

        // Save session using canonical authSession utility
        authSession.saveSession({
          access_token: token,
          refresh_token: sessionPayload.refresh_token || res?.refresh_token,
          user: userObj
        })

        const roleLower = (userObj.role || userObj.designation || '').toLowerCase()
        showToast(`Authentication successful! Welcome ${userObj.full_name || userObj.employee_name || userObj.name || roleLower}.`, 'success')

        // Redirect strictly to assigned role portal
        const targetRoute = authSession.getDashboardForUser(userObj)

        // 🔐 first_login check — Admin reset password, employee must change before proceeding
        if (userObj.first_login === true) {
          showToast('Admin has reset your password. Please set a new password to continue.', 'warning')
          setTimeout(() => {
            navigate('/change-password')
          }, 350)
          return
        }

        setTimeout(() => {
          navigate(targetRoute, { replace: true })
        }, 350)

      } else {
        throw new Error(res?.message || 'Invalid email or password.')
      }
    } catch (err) {
      clearInterval(progressInterval)
      setAuthProgress(0)
      setLoading(false)
      const errorMsgText = err?.message || err?.data?.message || err?.detail || 'Invalid email or password. Please try again.'
      showToast(errorMsgText, 'error')
      setErrorMsg(errorMsgText)
      authSession.clearSession()
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
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

        {/* Dynamic Bike Loading Progress Indicator below Authentication Button */}
        {loading && (
          <div className="relative w-full h-16 bg-gradient-to-r from-blue-900/10 via-sky-800/10 to-indigo-900/10 border border-blue-200/90 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between text-[11px] font-black text-blue-900 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                Authenticating Access...
              </span>
              <span className="font-mono text-blue-700 font-bold">{authProgress}%</span>
            </div>

            {/* Road Track Line */}
            <div className="relative w-full h-7 flex items-center">
              <div className="w-full h-0.5 border-b-2 border-dashed border-blue-500/70 relative">
                {/* Animated Sport Bike Progress */}
                <div 
                  className="absolute -top-3.5 flex items-center transition-all duration-300 ease-out"
                  style={{ left: `calc(${authProgress}% - ${authProgress > 85 ? '38px' : '15px'})` }}
                >
                  <div className="relative flex items-center">
                    <img 
                      src={bikeIcon} 
                      alt="TwiteConnect Bike" 
                      className="h-8 w-auto object-contain filter drop-shadow-[0_4px_8px_rgba(37,99,235,0.45)]" 
                    />
                    {/* Speed trail glow */}
                    <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-6 h-1.5 bg-gradient-to-r from-transparent to-blue-500/80 rounded-full blur-[1px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Footer */}
      <p className="text-center text-xs font-semibold text-slate-500">
        Need account access? Contact your organization Administrator.
      </p>
    </div>
  )
}

export default LoginForm
