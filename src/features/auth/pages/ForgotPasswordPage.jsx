import BrandMark from '../../../components/brand/BrandMark.jsx'
import loginBackground from '../../../assets/login-background.png'
import BrandPanel from '../components/BrandPanel.jsx'
import ForgotPasswordForm from '../components/ForgotPasswordForm.jsx'

function ForgotPasswordPage() {
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

          <div className="login-emblem mx-auto mb-8 grid size-20 place-items-center rounded-full border border-violet-400/45 bg-violet-500/10 text-violet-300 shadow-2xl shadow-violet-500/10">
            <svg
              className="size-10"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8.8 6.5h18.4c1.4 0 2.2 1.6 1.4 2.7l-6.2 8.1h4.1c1.5 0 2.2 1.8 1.2 2.8L15.1 32c-1.2 1.1-3.1 0-2.7-1.6l2.3-9H8.9c-1.3 0-2.1-1.5-1.4-2.6l4.8-7.1H8.8c-1.4 0-2.2-1.7-1.3-2.8l.1-.1c.3-.4.7-.7 1.2-.7V6.5Z"
                fill="url(#login-gradient)"
              />
              <defs>
                <linearGradient
                  id="login-gradient"
                  x1="7"
                  y1="5"
                  x2="29"
                  y2="31"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#8B5CF6" />
                  <stop offset=".55" stopColor="#A855F7" />
                  <stop offset="1" stopColor="#F472B6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="m-0 text-center text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">
            Forgot <span className="text-fuchsia-400">Password?</span>
          </h1>
          <p className="mb-0 mt-3 text-center text-base leading-7 text-slate-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  )
}

export default ForgotPasswordPage
