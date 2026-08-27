import { Sparkles, MapPin, Users, MessageSquare, Handshake, CheckCircle2, ChevronRight } from 'lucide-react'
import salesGuyImg from '../assets/sales-guy-checking-routes.png'

function BrandPanel() {
  return (
    <section className="relative hidden lg:flex flex-col justify-between p-7 lg:p-9 bg-gradient-to-br from-blue-50/90 via-slate-50 to-mgr-secondary-50/80 rounded-[2.5rem] border border-blue-100/90 shadow-inner overflow-hidden">
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

        <p className="text-xs lg:text-sm text-slate-600 leading-relaxed font-normal">
          Streamline lead management, field client visits, follow-ups, and sales performance with one intelligent platform.
        </p>
      </div>

      {/* Visual Presentation Area: Journey Arc + Guy Checking GPS Routes + Dashboard UI */}
      <div className="relative my-2 min-h-[340px] flex items-end">
        {/* Dotted Curved Sales Journey Arc (Left Column) */}
        <div className="absolute left-0 top-2 bottom-4 flex flex-col justify-between z-20">
          {[
            { label: 'Connect', icon: Users, color: 'bg-emerald-500 text-white' },
            { label: 'Track', icon: MapPin, color: 'bg-mgr-primary-500 text-white' },
            { label: 'Follow Up', icon: MessageSquare, color: 'bg-blue-600 text-white' },
            { label: 'Close Deals', icon: Handshake, color: 'bg-purple-600 text-white' },
          ].map((node) => {
            const Icon = node.icon
            return (
              <div key={node.label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-2xl ${node.color} flex items-center justify-center shadow-md shadow-slate-900/10`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                  {node.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Dashboard Graphic Window (Background Screen) */}
        <div className="relative ml-24 flex-1 bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xl shadow-blue-900/10 space-y-3 z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                TC
              </div>
              <span className="font-extrabold text-xs text-slate-900">Dashboard</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Real-Time GPS Route Sync
            </span>
          </div>

          {/* Stat Metrics Bar */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[8px] text-slate-400 font-bold">Total Leads</p>
              <p className="text-xs font-extrabold text-slate-900">128 <span className="text-[7px] text-emerald-600">+24%</span></p>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[8px] text-slate-400 font-bold">Followups</p>
              <p className="text-xs font-extrabold text-slate-900">96 <span className="text-[7px] text-emerald-600">+18%</span></p>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[8px] text-slate-400 font-bold">Appointments</p>
              <p className="text-xs font-extrabold text-slate-900">64 <span className="text-[7px] text-blue-600">+30%</span></p>
            </div>
            <div className="p-1.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <p className="text-[8px] text-emerald-800 font-bold">Deals Closed</p>
              <p className="text-xs font-extrabold text-emerald-700">32 <span className="text-[7px] text-emerald-600">+25%</span></p>
            </div>
          </div>

          {/* Interactive GPS Visit Route Map Area */}
          <div className="relative bg-slate-50 rounded-xl p-3 border border-slate-200/80 min-h-[140px] flex items-start justify-between overflow-hidden">
            <div className="space-y-1 z-10">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Visit Overview Map Route
              </div>
              <p className="text-[9px] text-slate-500">Live GPS tracking across client meeting sites</p>
            </div>

            {/* Dotted Route Line Graphic */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 300 120" fill="none">
              <path d="M 30 90 Q 80 20 150 70 T 270 30" stroke="#2563EB" strokeWidth="3" strokeDasharray="6 6" />
              <circle cx="30" cy="90" r="5" fill="#10B981" />
              <circle cx="150" cy="70" r="5" fill="#F59E0B" />
              <circle cx="270" cy="30" r="5" fill="#8B5CF6" />
            </svg>

            <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200 shadow-sm text-right z-10">
              <p className="text-[9px] font-bold text-slate-700">Visit Status</p>
              <p className="text-xs font-black text-blue-600">126 Total</p>
              <div className="flex items-center gap-1 mt-1 text-[8px]">
                <span className="text-emerald-600 font-bold">65 Completed</span> • <span className="text-mgr-primary-600 font-bold">40 Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Client Visit Details Card (Right Bottom) */}
        <div className="absolute right-2 bottom-2 z-30 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xl max-w-[220px] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
              B
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900 leading-tight">Bayfront Royal Ltd.</h4>
              <p className="text-[9px] text-slate-500">Commercial Plaza, New Town</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Visit Completed
          </div>

          <div className="text-[9px] text-slate-500 font-medium">
            📅 October 14 • 11:30 AM
          </div>

          <button className="w-full py-1.5 bg-mgr-primary-600 hover:bg-mgr-primary-700 text-white font-bold rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1">
            View Full Details <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Sales Guy Turned Around Checking GPS Routes Overlay */}
        <div className="absolute left-10 bottom-0 z-30 pointer-events-none w-44 lg:w-52 drop-shadow-2xl">
          <img
            src={salesGuyImg}
            alt="Sales Executive Checking GPS Routes"
            className="w-full h-auto object-contain max-h-[290px] opacity-95"
          />
        </div>
      </div>
    </section>
  )
}

export default BrandPanel
