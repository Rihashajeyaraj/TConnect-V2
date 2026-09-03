import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandPanel from './BrandPanel.jsx'
import LoginForm from './LoginForm.jsx'
import authSession from '../utils/authSession.js'
import chennaiMapBg from '../assets/chennai-map-bg.png'

function LoginPage() {
  const navigate = useNavigate()

  const session = authSession.restoreSession()
  const isAuthenticated = Boolean(session && session.token && session.user)

  useEffect(() => {
    if (isAuthenticated && session?.user) {
      const targetRoute = authSession.getDashboardForUser(session.user)
      navigate(targetRoute, { replace: true })
    }
  }, [isAuthenticated, session, navigate])

  if (isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading TwiteConnect...</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen lg:h-screen lg:max-h-screen overflow-y-auto lg:overflow-hidden bg-sky-50 flex flex-col justify-between p-4 font-sans relative outer-map-grid">
      {/* Map effect style block for outer background */}
      <style dangerouslySetInnerHTML={{__html: `
        .outer-map-grid {
          background: 
            radial-gradient(circle at 50% 50%, rgba(224, 242, 254, 0.7) 0%, rgba(186, 230, 253, 0.8) 100%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg stroke='%230284c7' stroke-opacity='0.04' stroke-width='0.8' fill='none'%3E%3Cpath d='M0,30 h120 M0,60 h120 M0,90 h120 M30,0 v120 M60,0 v120 M90,0 v120'/%3E%3Ccircle cx='60' cy='60' r='45' stroke-dasharray='3,3'/%3E%3Ccircle cx='60' cy='60' r='20'/%3E%3C/g%3E%3C/svg%3E");
          background-attachment: fixed;
        }
      `}} />

      {/* Decorative background glow circles for soft blue gradient */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-sky-200/35 blur-3xl -translate-y-12" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-100/30 blur-3xl translate-x-32 translate-y-32" />
      </div>

      {/* Central 2-Column Container (Expanded size to occupy screen space better) */}
      <div className="w-full max-w-6xl mx-auto my-auto bg-white rounded-[2.2rem] border border-slate-200/80 shadow-[0_25px_60px_rgba(15,23,42,0.05)] grid grid-cols-1 lg:grid-cols-2 p-3.5 gap-4 items-stretch overflow-hidden max-h-none lg:max-h-[640px] relative z-10">
        {/* Left Column: Sign In Form with Real Chennai Map Background Overlay */}
        <div className="flex flex-col justify-center px-8 lg:px-12 py-7 bg-white rounded-[1.8rem] border border-slate-100/50 shadow-inner relative overflow-hidden isolate order-2 lg:order-1">
          {/* Real Chennai Map screenshot image placed to cover the entire background container (Very subtle watermark to ensure foreground elements are bright and clear) */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 select-none mix-blend-multiply bg-cover bg-center bg-no-repeat filter grayscale contrast-150 brightness-95" 
            style={{ backgroundImage: `url(${chennaiMapBg})` }}
          />

          {/* Actual Login Form Container rendered on top of map */}
          <div className="relative z-10">
            <LoginForm />
          </div>
        </div>

        {/* Right Column: Rich Blue Feature Panel */}
        <BrandPanel />
      </div>

      {/* Bottom Footer Details */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold tracking-wider opacity-90 select-none">
        <span>🔒 Secure</span>
        <span className="text-slate-300">•</span>
        <span>Reliable</span>
        <span className="text-slate-300">•</span>
        <span>Always Connected</span>
      </div>
    </main>
  )
}

export default LoginPage
