import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import BrandMark from '../components/BrandMark.jsx'
import BrandPanel from './BrandPanel.jsx'
import loginBackground from '../assets/login-background.png'
import { authAPI } from '../services/api.js'

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const passwordStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']
  const strength = passwordStrength(newPassword)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (newPassword === currentPassword) {
      setErrorMsg('New password must be different from your current password.')
      return
    }

    setLoading(true)
    try {
      await authAPI.changePassword(currentPassword, newPassword)

      // Update first_login flag in localStorage user object
      try {
        const stored = localStorage.getItem('user')
        if (stored) {
          const user = JSON.parse(stored)
          user.first_login = false
          localStorage.setItem('user', JSON.stringify(user))
        }
      } catch (_) {}

      showToast('Password changed successfully! Please log in with your new password.', 'success')

      // Clear session and redirect to login
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        navigate('/', { replace: true })
      }, 1500)
    } catch (err) {
      const msg = err?.detail || err?.message || ''
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid')) {
        setErrorMsg('Current (temporary) password is incorrect.')
      } else if (msg.toLowerCase().includes('8 characters')) {
        setErrorMsg('New password must be at least 8 characters.')
      } else {
        setErrorMsg('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="login-page relative min-h-screen overflow-hidden bg-slate-950 bg-cover bg-center p-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(35rem,44rem)] lg:gap-[clamp(2rem,4vw,5rem)] lg:bg-[position:center] lg:p-6 lg:pl-[clamp(3rem,4.2vw,5rem)] lg:pr-[clamp(2rem,3.5vw,4.5rem)]"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <BrandPanel />

      <section className="login-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[#10152a]/98 px-6 py-10 shadow-2xl shadow-slate-950/40 sm:px-10 lg:min-h-[calc(100vh-3rem)] lg:rounded-[2.75rem] lg:border lg:border-violet-300/20 lg:px-[clamp(3rem,4.5vw,5.5rem)]">
        <div className="login-content relative z-10 w-full max-w-[36rem] lg:-translate-y-10">
          <div className="mb-12 lg:hidden">
            <BrandMark compact onDark />
          </div>

          {/* Icon */}
          <div className="login-emblem mx-auto mb-8 grid size-20 place-items-center rounded-full border border-mgr-primary-400/45 bg-mgr-primary-500/10 text-mgr-primary-300 shadow-2xl shadow-mgr-primary-500/10">
            <svg className="size-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          {/* Alert Banner */}
          <div className="mb-6 rounded-2xl border border-mgr-primary-400/30 bg-mgr-primary-500/10 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-mgr-primary-300">
              🔐 Security Required
            </p>
            <p className="mt-1 text-xs text-mgr-primary-200/80">
              Admin has reset your password. You must set a new personal password before continuing.
            </p>
          </div>

          <h1 className="m-0 text-center text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">
            Set New <span className="text-mgr-primary-400">Password</span>
          </h1>
          <p className="mb-0 mt-3 text-center text-base leading-7 text-slate-400">
            Enter your temporary password and choose a new secure password.
          </p>

          {/* Form */}
          <form className="login-form mt-10 flex flex-col gap-5" onSubmit={handleSubmit}>

            {/* Current (temp) password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="cp-current">
                Temporary Password (given by Admin)
              </label>
              <div className="group relative">
                <svg className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-mgr-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                </svg>
                <input
                  id="cp-current"
                  type={showCurrent ? 'text' : 'password'}
                  className="auth-input h-14 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-14 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-mgr-primary-400 focus:bg-white focus:ring-4 focus:ring-mgr-primary-500/15"
                  placeholder="Enter temp password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setErrorMsg('') }}
                  required
                  disabled={loading}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent
                    ? <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="cp-new">
                New Password
              </label>
              <div className="group relative">
                <svg className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <input
                  id="cp-new"
                  type={showNew ? 'text' : 'password'}
                  className="auth-input h-14 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-14 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrorMsg('') }}
                  required
                  disabled={loading}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew
                    ? <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strength ? strengthColor[strength] : '#1e293b' }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="cp-confirm">
                Confirm New Password
              </label>
              <div className="group relative">
                <svg className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <input
                  id="cp-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="auth-input h-14 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-14 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg('') }}
                  required
                  disabled={loading}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm
                    ? <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <p className="mt-1.5 text-xs font-medium text-red-400">Passwords do not match</p>
              )}
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <p className="mt-1.5 text-xs font-medium text-emerald-400">✓ Passwords match</p>
              )}
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <svg className="mt-0.5 size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3Z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mgr-primary-500 via-orange-500 to-mgr-primary-400 px-5 text-base font-bold text-white shadow-xl shadow-mgr-primary-950/30 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mgr-primary-400 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? (
                <>
                  <svg className="size-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  Set New Password
                  <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default ChangePasswordPage
