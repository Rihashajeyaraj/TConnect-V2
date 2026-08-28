import { Sparkles, MapPin, Users, MessageSquare, Handshake, CheckCircle2, ChevronRight } from 'lucide-react'
import salesGuyImg from '../assets/sales-guy-checking-routes.png'

function BrandPanel() {
  return (
    <section className="relative hidden lg:flex flex-col justify-between p-7 lg:p-9 brand-map-bg rounded-[2.5rem] border border-blue-100/90 shadow-inner overflow-hidden">
      {/* CSS Animations style tag */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes travelRoad {
          0% { offset-distance: 0%; opacity: 0; }
          2% { opacity: 1; }
          95% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes rotateWheel {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bodyBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-0.8px) rotate(0.5deg); }
        }
        .bike-travel {
          offset-path: path("M 40,100 C 100,120 140,135 180,130 C 230,125 280,100 320,90 C 370,80 410,60 460,40");
          offset-rotate: auto;
          animation: travelRoad 7s infinite linear;
        }
        .wheel-spin {
          animation: rotateWheel 0.3s infinite linear;
        }
        .bike-bounce {
          animation: bodyBounce 0.15s infinite ease-in-out;
        }
        .brand-map-bg {
          background-color: #f8fafc;
          background-image: 
            radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.2) 0%, transparent 60%),
            radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%233b82f6' stroke-opacity='0.12' stroke-width='1'%3E%3Ccircle cx='80' cy='80' r='75' stroke-dasharray='4,4'/%3E%3Ccircle cx='80' cy='80' r='50'/%3E%3Ccircle cx='80' cy='80' r='25' stroke-dasharray='2,2'/%3E%3Cpath d='M0,80 h160 M80,0 v160 M20,20 l120,120 M20,140 l120,-120'/%3E%3C/g%3E%3Cg stroke='%236366f1' stroke-opacity='0.1' stroke-width='1.5' fill='none'%3E%3Cpath d='M-20,40 Q40,30 80,70 T180,90 M40,-20 Q70,60 100,100 T120,180'/%3E%3C/g%3E%3Ccircle cx='80' cy='70' r='4' fill='%233b82f6' fill-opacity='0.25'/%3E%3Ccircle cx='110' cy='110' r='3' fill='%236366f1' fill-opacity='0.25'/%3E%3C/svg%3E");
          background-size: cover, cover, 160px 160px;
        }
      `}} />

      {/* Top Headline & Subtitle */}
      <div className="space-y-3.5 max-w-xl relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mgr-primary-100/90 border border-mgr-primary-200 text-mgr-primary-800 font-bold text-[11px] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-mgr-primary-600 animate-pulse" />
          <span>AI-Powered Sales Tracking Platform</span>
        </div>

        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          From Lead to Closure —{' '}
          <span className="text-mgr-primary-700">
            Manage Every Sales Interaction
          </span>{' '}
          with TwiteConnect.
        </h1>

        <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-medium">
          Streamline lead management, field client visits, follow-ups, and sales performance with one intelligent platform.
        </p>
      </div>

      {/* Visual Presentation Area: Animated Journey Arc & Dashboard Card Grid */}
      <div className="relative my-4 space-y-4">
        {/* Animated Curved Journey Arc */}
        <div className="relative w-full h-[150px] z-10">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" fill="none">
            <defs>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Curved Road Tracks */}
            <path 
              d="M 40,100 C 100,120 140,135 180,130 C 230,125 280,100 320,90 C 370,80 410,60 460,40" 
              stroke="#0f172a" 
              strokeWidth="9" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d="M 40,100 C 100,120 140,135 180,130 C 230,125 280,100 320,90 C 370,80 410,60 460,40" 
              stroke="url(#roadGrad)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d="M 40,100 C 100,120 140,135 180,130 C 230,125 280,100 320,90 C 370,80 410,60 460,40" 
              stroke="#ffffff" 
              strokeWidth="1.5" 
              strokeDasharray="4,4" 
              strokeLinecap="round" 
              fill="none" 
            />

            {/* PIN 1: Start (x=40, y=100) */}
            <g transform="translate(40, 100)">
              <circle cx="0" cy="0" r="10" fill="#2563eb" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="4" fill="#2563eb" />
              <path d="M 0,0 C -4,-6 -6,-12 0,-16 C 6,-12 4,-6 0,0" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />
              <circle cx="0" cy="-12" r="1.5" fill="#ffffff" />
              <text x="0" y="16" className="text-[10px] font-black fill-slate-800" textAnchor="middle">Start</text>
            </g>

            {/* PIN 2: Track (x=180, y=130) */}
            <g transform="translate(180, 130)">
              <circle cx="0" cy="0" r="10" fill="#ea580c" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="4" fill="#ea580c" />
              <path d="M 0,0 C -4,-6 -6,-12 0,-16 C 6,-12 4,-6 0,0" fill="#ea580c" stroke="#ffffff" strokeWidth="1" />
              <circle cx="0" cy="-12" r="1.5" fill="#ffffff" />
              <text x="0" y="16" className="text-[10px] font-black fill-slate-800" textAnchor="middle">Track</text>
            </g>

            {/* PIN 3: Manage (x=320, y=90) */}
            <g transform="translate(320, 90)">
              <circle cx="0" cy="0" r="10" fill="#2563eb" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="4" fill="#2563eb" />
              <path d="M 0,0 C -4,-6 -6,-12 0,-16 C 6,-12 4,-6 0,0" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />
              <circle cx="0" cy="-12" r="1.5" fill="#ffffff" />
              <text x="0" y="16" className="text-[10px] font-black fill-slate-800" textAnchor="middle">Manage</text>
            </g>

            {/* PIN 4: Success (x=460, y=40) */}
            <g transform="translate(460, 40)">
              <line x1="0" y1="0" x2="0" y2="-20" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
              <path d="M 0,-20 L 14,-15 L 0,-10 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="0.5" />
              <path d="M -4,0 Q 0,-2 4,0 Z" fill="#475569" />
              <text x="0" y="16" className="text-[10px] font-black fill-emerald-700" textAnchor="middle">Success</text>
            </g>

            {/* Animated Motorcycle Element */}
            <g className="bike-travel">
              <g className="bike-bounce">
                {/* Back Wheel */}
                <g className="wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="-13" cy="-5" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="-13" y1="-10" x2="-13" y2="0" stroke="#e2e8f0" strokeWidth="0.8" />
                  <line x1="-18" y1="-5" x2="-8" y2="-5" stroke="#e2e8f0" strokeWidth="0.8" />
                </g>

                {/* Front Wheel */}
                <g className="wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="13" cy="-5" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="13" y1="-10" x2="13" y2="0" stroke="#e2e8f0" strokeWidth="0.8" />
                  <line x1="8" y1="-5" x2="18" y2="-5" stroke="#e2e8f0" strokeWidth="0.8" />
                </g>

                {/* Frame / Body */}
                <path d="M -13,-5 L -3,-5 L 2,-10 L 13,-5" stroke="#475569" strokeWidth="1.5" fill="none" />
                <path d="M -4,-5 L -14,-7.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" />

                {/* Gas Tank (Sporty Blue Body panels) */}
                <path d="M -7,-10 L 0,-12 L 5,-12 L 7,-8 L -4,-7 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.5" />
                <path d="M 5,-12 L 8,-15 L 9,-11 Z" fill="#93c5fd" opacity="0.8" />

                {/* Seat */}
                <path d="M -10,-10 L -5,-10 L -4,-7 L -9,-7 Z" fill="#0f172a" />

                {/* Rider */}
                <path d="M -7,-10 L -4,-18 L 1,-14" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M -4,-18 L 3,-13 L 7,-13" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M -7,-10 L -1,-7 L 0,-5" stroke="#1d4ed8" strokeWidth="2.5" fill="none" />
                
                {/* Helmet */}
                <circle cx="-3" cy="-22" r="3.8" fill="#1d4ed8" stroke="#1e40af" strokeWidth="0.5" />
                <path d="M -1.2,-23 C -0.2,-22 -0.2,-20.5 -1.2,-19.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            </g>
          </svg>
        </div>

        {/* Dashboard card layout block */}
        <div className="flex items-stretch gap-4">
          {/* Left vertical stacked icons */}
          <div className="flex flex-col justify-between py-2.5 gap-2.5 z-20">
            <div className="w-8.5 h-8.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md"><Users className="w-4.5 h-4.5" /></div>
            <div className="w-8.5 h-8.5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md"><MapPin className="w-4.5 h-4.5" /></div>
            <div className="w-8.5 h-8.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md"><MessageSquare className="w-4.5 h-4.5" /></div>
            <div className="w-8.5 h-8.5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md"><Handshake className="w-4.5 h-4.5" /></div>
          </div>

          {/* Core Dashboard UI graphic panel */}
          <div className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-xl space-y-2.5 z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-4.5 h-4.5 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">TC</div>
                <span className="font-extrabold text-[11px] text-slate-800">Dashboard</span>
              </div>
              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Real-Time GPS Route Sync</span>
            </div>

            {/* Internal layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              {/* Map block - 5 cols */}
              <div className="md:col-span-5 relative bg-slate-50 rounded-xl p-2 border border-slate-200/80 min-h-[140px] flex items-end overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px] opacity-40"></div>
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1 py-0.5 rounded-md bg-emerald-500 text-white font-extrabold text-[7px] tracking-wide shadow-sm uppercase">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>Live
                </span>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 140" fill="none">
                  <path d="M 30,110 C 60,90 40,50 90,40" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 30,110 C 60,90 40,50 90,40" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3 3" strokeLinecap="round" />
                  <circle cx="90" cy="40" r="3" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="30" cy="110" r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                </svg>
                <div className="absolute left-[18px] bottom-[12px] w-5.5 h-5.5 rounded-full border border-white shadow-md overflow-hidden bg-slate-200">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="Executive avatar" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Stats & Bayfront - 7 cols */}
              <div className="md:col-span-7 space-y-2.5 flex flex-col justify-between">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">Follow Ups</p>
                    <p className="text-xs font-black text-slate-800 flex items-center justify-center gap-0.5 mt-0.5">
                      96 <span className="text-[7px] text-emerald-600 font-extrabold">↑18%</span>
                    </p>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">Appointments</p>
                    <p className="text-xs font-black text-slate-800 flex items-center justify-center gap-0.5 mt-0.5">
                      64 <span className="text-[7px] text-blue-600 font-extrabold">↑30%</span>
                    </p>
                  </div>
                  <div className="p-1.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[8px] text-emerald-800 font-bold">Deals Closed</p>
                    <p className="text-xs font-black text-emerald-700 flex items-center justify-center gap-0.5 mt-0.5">
                      32 <span className="text-[7px] text-emerald-600 font-extrabold">↑25%</span>
                    </p>
                  </div>
                </div>

                {/* Bayfront */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5.5 h-5.5 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">B</div>
                    <div>
                      <h4 className="font-extrabold text-[10px] text-slate-900 leading-tight">Bayfront Royal Ltd.</h4>
                      <p className="text-[8px] text-slate-400 font-medium">Commercial Plaza, New Town</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[7.5px] border border-emerald-200">
                      ✓ Visit Completed
                    </span>
                    <span className="text-[7.5px] text-slate-500 font-medium">📅 Oct 14 • 11:30 AM</span>
                  </div>
                  <button className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[8.5px] transition flex items-center justify-center gap-0.5">
                    View Full Details <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BrandPanel
