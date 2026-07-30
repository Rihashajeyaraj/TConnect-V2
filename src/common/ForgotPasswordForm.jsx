import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from './ToastContext.jsx'
import Icon from '../components/Icon.jsx'

function ForgotPasswordForm() {
  const { showToast } = useToast()
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    showToast('Password reset link sent to your email!', 'success')
  }

  if (submitted) {
    return (
      <div className="mt-10 flex flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-full border border-emerald-400/45 bg-emerald-500/10 text-emerald-300">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Check your email</h2>
        <p className="max-w-sm text-slate-400">
          If an account exists with that email, we&apos;ve sent password reset instructions.
        </p>
        <Link
          className="mt-2 text-sm font-semibold text-violet-300 transition hover:text-fuchsia-300"
          to="/"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form className="login-form mt-10 flex flex-col gap-7" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2.5 block text-sm font-semibold text-slate-200" htmlFor="reset-email">
          Email address
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-violet-400 transition-colors group-focus-within:text-violet-600"
            name="mail"
          />
          <input
            className="auth-input h-16 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-5 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>
      </div>

      <button
        className="auth-submit group flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-5 text-base font-bold text-white shadow-xl shadow-violet-950/30 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-fuchsia-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10152a] active:translate-y-0"
        type="submit"
      >
        Send reset link
        <Icon
          className="size-5 transition-transform group-hover:translate-x-1"
          name="arrow"
        />
      </button>

      <Link
        className="text-center text-sm font-semibold text-violet-300 transition hover:text-fuchsia-300"
        to="/"
      >
        Back to sign in
      </Link>
    </form>
  )
}

export default ForgotPasswordForm
