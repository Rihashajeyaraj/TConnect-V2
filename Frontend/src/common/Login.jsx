import BrandPanel from './BrandPanel.jsx'
import LoginForm from './LoginForm.jsx'

function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden outer-map-grid">
      {/* Map effect style block for login credential column and outer background */}
      <style dangerouslySetInnerHTML={{__html: `
        .outer-map-grid {
          background-image: 
            radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg stroke='%23334155' stroke-opacity='0.15' stroke-width='0.8' fill='none'%3E%3Cpath d='M0,40 h160 M0,80 h160 M0,120 h160 M40,0 v160 M80,0 v160 M120,0 v160'/%3E%3Ccircle cx='80' cy='80' r='60' stroke-dasharray='4,4'/%3E%3Ccircle cx='80' cy='80' r='30'/%3E%3C/g%3E%3C/svg%3E");
        }
        .login-map-bg {
          background-color: #ffffff;
          background-image: 
            radial-gradient(circle at 15% 25%, rgba(204, 251, 241, 0.4) 0%, transparent 45%),
            radial-gradient(circle at 85% 75%, rgba(224, 242, 254, 0.4) 0%, transparent 45%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg stroke='%23e2e8f0' stroke-opacity='0.65' stroke-width='1.2' fill='none'%3E%3Cpath d='M0,20 Q35,15 70,45 T140,50 M30,0 Q50,60 40,100 T80,140 M0,110 Q60,80 100,120 T140,140 M0,70 h140 M70,0 v140'/%3E%3Cpath d='M-10,40 L150,120 M-10,100 L150,20' stroke-dasharray='3,3'/%3E%3C/g%3E%3Ccircle cx='35' cy='20' r='3.5' fill='%233b82f6' fill-opacity='0.12'/%3E%3Ccircle cx='70' cy='45' r='3.5' fill='%2310b981' fill-opacity='0.12'/%3E%3Ccircle cx='50' cy='90' r='3.5' fill='%236366f1' fill-opacity='0.12'/%3E%3Ccircle cx='110' cy='60' r='3.5' fill='%23f59e0b' fill-opacity='0.12'/%3E%3C/svg%3E");
          background-size: cover, cover, 140px 140px;
        }
      `}} />

      {/* Central 2-Column Container */}
      <div className="w-full max-w-6xl bg-white rounded-[2.5rem] border border-slate-700/50 shadow-2xl shadow-blue-950/80 grid grid-cols-1 lg:grid-cols-2 p-3 lg:p-4 gap-4 items-stretch overflow-hidden min-h-[640px] relative z-10">
        {/* Left Column: Sign In Form with Map Effect Background & Clear Form Sections */}
        <div className="flex flex-col justify-center px-6 lg:px-10 py-6 login-map-bg rounded-[2rem] border border-slate-100/50 shadow-inner">
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
