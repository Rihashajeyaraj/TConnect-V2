import BrandPanel from './BrandPanel.jsx'
import LoginForm from './LoginForm.jsx'

function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 lg:p-8 font-sans">
      {/* Central 2-Column Container */}
      <div className="w-full max-w-6xl bg-white rounded-[2.5rem] border border-slate-700/50 shadow-2xl shadow-blue-950/80 grid grid-cols-1 lg:grid-cols-2 p-3 lg:p-4 gap-4 items-stretch overflow-hidden min-h-[640px]">
        {/* Left Column: Sign In Form with White Background & Clear Form Sections */}
        <div className="flex flex-col justify-center px-6 lg:px-10 py-6 bg-white rounded-[2rem]">
          <LoginForm />
        </div>

        {/* Right Column: Rich Blue Feature Panel */}
        <BrandPanel />
      </div>

      {/* Bottom Footer Details */}
      <div className="mt-5 flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold tracking-wider opacity-90 select-none">
        <span>🔒 Secure</span>
        <span className="text-slate-600">•</span>
        <span>Reliable</span>
        <span className="text-slate-600">•</span>
        <span>Always Connected</span>
      </div>
    </main>
  )
}

export default LoginPage
