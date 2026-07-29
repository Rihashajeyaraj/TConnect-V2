import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <form className="login-form mt-10 flex flex-col gap-6" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2.5 block text-sm font-semibold text-slate-200" htmlFor="fullname">
          Full Name
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-violet-400 transition-colors group-focus-within:text-violet-600"
            name="users"
          />
          <input
            className="auth-input h-16 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-5 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
            id="fullname"
            name="fullname"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2.5 block text-sm font-semibold text-slate-200" htmlFor="signup-email">
          Email address
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-violet-400 transition-colors group-focus-within:text-violet-600"
            name="mail"
          />
          <input
            className="auth-input h-16 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-5 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2.5 block text-sm font-semibold text-slate-200" htmlFor="signup-password">
          Password
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-violet-400 transition-colors group-focus-within:text-violet-600"
            name="lock"
          />
          <input
            className="auth-input h-16 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-14 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
            id="signup-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={8}
            required
          />
          <button
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} />
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2.5 block text-sm font-semibold text-slate-200" htmlFor="confirm-password">
          Confirm Password
        </label>
        <div className="group relative">
          <Icon
            className="pointer-events-none absolute left-5 top-1/2 size-6 -translate-y-1/2 text-violet-400 transition-colors group-focus-within:text-violet-600"
            name="lock"
          />
          <input
            className="auth-input h-16 w-full rounded-2xl border border-white/30 bg-slate-100/95 pl-14 pr-14 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15"
            id="confirm-password"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm your password"
            minLength={8}
            required
          />
          <button
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
            onClick={() => setShowConfirm((value) => !value)}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            aria-pressed={showConfirm}
          >
            <Icon name={showConfirm ? 'eyeOff' : 'eye'} />
          </button>
        </div>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-slate-300">
        <span className="relative grid size-4 shrink-0 place-items-center">
          <input
            className="peer col-span-full row-span-full size-4 appearance-none rounded border border-slate-600 bg-[#1e2238] transition checked:border-violet-400 checked:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10152a]"
            name="terms"
            type="checkbox"
            required
          />
          <svg
            className="pointer-events-none col-span-full row-span-full hidden size-3 text-white peer-checked:block"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path d="m2.5 6 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
        <span>
          I agree to the{' '}
          <Link className="text-violet-300 underline-offset-2 hover:underline" to="#">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link className="text-violet-300 underline-offset-2 hover:underline" to="#">
            Privacy Policy
          </Link>
        </span>
      </label>

      <button
        className="auth-submit group flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 px-5 text-base font-bold text-white shadow-xl shadow-violet-950/30 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-fuchsia-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10152a] active:translate-y-0"
        type="submit"
      >
        Create account
        <Icon
          className="size-5 transition-transform group-hover:translate-x-1"
          name="arrow"
        />
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link className="font-semibold text-violet-300 transition hover:text-fuchsia-300" to="/">
          Sign in
        </Link>
      </p>

      {submitted && (
        <p
          className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-center text-sm text-violet-200"
          role="status"
        >
          Signup UI is ready. Authentication will be connected when the backend details are
          available.
        </p>
      )}
    </form>
  )
}

export default SignupForm
