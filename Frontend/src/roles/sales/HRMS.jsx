import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  CalendarOff,
  CalendarDays,
  TrendingUp,
  BookOpen,
  Activity,
  Phone,
  Users,
  UserCheck,
  MapPin,
  Target,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Send,
  Medal,
  Upload,
  X,
  Eye,
  FileUp,
} from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";

const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { key: "daily_report", label: "Daily Work Report", icon: ClipboardList   },
  { key: "leave",        label: "Leave Management",  icon: CalendarOff     },
  { key: "calendar",     label: "Holiday Calendar",  icon: CalendarDays    },
  { key: "career",       label: "Career Ladder",     icon: TrendingUp      },
  { key: "handbook",     label: "Twite Handbook",    icon: BookOpen        },
  { key: "activity",     label: "Activity Logs",     icon: Activity        },
];

const HOLIDAYS = [
  { date: "15 Aug 2026", name: "Independence Day",  type: "National" },
  { date: "02 Oct 2026", name: "Gandhi Jayanti",    type: "National" },
  { date: "24 Oct 2026", name: "Diwali",            type: "Festival" },
  { date: "25 Dec 2026", name: "Christmas",         type: "Festival" },
  { date: "01 Jan 2027", name: "New Year",          type: "Festival" },
  { date: "14 Jan 2027", name: "Pongal",            type: "Regional" },
];

const HANDBOOK = [
  { title: "Sales Process",      icon: "📋", content: "Every lead must be logged with accurate contact details. Follow LEAD → FOLLOWUP → VISIT → CUSTOMER pipeline." },
  { title: "Call Etiquette",     icon: "📞", content: "Introduce clearly. Listen actively. Log call outcome within 30 minutes of every call." },
  { title: "Visit Protocol",     icon: "🗺️", content: "Confirm visit 1 day prior. Carry brochure. Log GPS check-in/out. Submit visit report same day." },
  { title: "Lead Classification",icon: "🔥", content: "Hot: Buy within 7 days. Warm: Interested, needs nurturing. Cold: Not interested / no response." },
  { title: "Commission",         icon: "💰", content: "Starter: ₹500/deal. Mid (5+ deals): ₹1,000/deal. Senior (15+ deals): ₹2,000/deal." },
  { title: "Daily Reporting",    icon: "📊", content: "Submit Daily Work Report before 6:30 PM every working day. Include calls, visits, pipeline updates." },
];

export default function SalesHRMS() {
  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userName = currentUser.name || currentUser.full_name || userEmail.split("@")[0] || "Sales Executive";
  const empCode = currentUser.employee_code || currentUser.employee_id || `EMP-${userEmail ? userEmail.split('@')[0].toUpperCase() : '001'}`;
  const userId = currentUser.id || currentUser.user_id || "";

  const [activeSection, setActiveSection] = useState("dashboard");

  // ── Load live stats from localStorage ─────────────────────────────────────
  const getArr = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };

  const matchesUser = (item) => {
    if (!item) return false;
    const ass = (item.assignedTo || item.assigned_to || item.accountManager || item.executive || item.executiveName || "").toLowerCase().trim();
    const email = (item.assignedToEmail || item.assigned_to_email || item.executiveEmail || item.email || "").toLowerCase().trim();
    const emp = (item.employee_id || item.employee_code || "").toLowerCase().trim();
    const uid = (item.user_id || item.userId || "").toLowerCase().trim();

    if (userEmail && (email === userEmail || ass === userEmail)) return true;
    if (empCode && emp === empCode.toLowerCase()) return true;
    if (userId && uid === userId.toLowerCase()) return true;
    if (userName && (ass.includes(userName.toLowerCase()) || userName.toLowerCase().includes(ass))) return true;

    return false;
  };

  const allLeads = getArr("tc_sm_leads").filter(matchesUser);
  const allVisits = getArr("tc_sales_visits").filter(matchesUser);
  const allFollowups = getArr("tc_sales_followups").filter(matchesUser);
  const allCustomers = getArr("tc_customer_accounts").filter(matchesUser);

  const convertedClients = allLeads.filter(l => l.status === "Converted to Customer" || l.status === "Converted").length;
  const hotLeads         = allLeads.filter(l => l.category === "Hot" && l.status !== "Converted to Customer").length;
  const convRate         = allLeads.length > 0 ? Math.round((convertedClients / allLeads.length) * 100) : 0;

  // ── Report state ───────────────────────────────────────────────────────────
  const [report, setReport] = useState({ callsMade:"", visitsCompleted:"", leadsGenerated:"", clientsInterested:"", followupsScheduled:"", dealsClosed:"", highlights:"", blockers:"", nextDayPlan:"" });
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const pastReports = getArr("tc_se_daily_reports");

  const handleReportSubmit = (e) => {
    e.preventDefault();
    const newEodObj = {
      id: `eod_${Date.now()}`,
      executive: userName,
      executiveEmail: userEmail,
      employee_code: empCode || "EMP000012",
      date: "05/08/2026",
      submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      callsMade: parseInt(report.callsMade || 0),
      visitsCompleted: parseInt(report.visitsCompleted || 0),
      leadsGenerated: parseInt(report.leadsGenerated || 0),
      clientsInterested: parseInt(report.clientsInterested || 0),
      followupsScheduled: parseInt(report.followupsScheduled || 0),
      dealsClosed: parseInt(report.dealsClosed || 0),
      highlights: report.highlights || "Completed daily client meetings and product presentations.",
      blockers: report.blockers || "None",
      nextDayPlan: report.nextDayPlan || "Follow up with interested clients and schedule site demos.",
      status: "Submitted",
    };

    const saved = getArr("tc_se_daily_reports");
    const updated = [newEodObj, ...saved];
    localStorage.setItem("tc_se_daily_reports", JSON.stringify(updated));

    const eodSaved = getArr("tc_eod_reports");
    localStorage.setItem("tc_eod_reports", JSON.stringify([newEodObj, ...eodSaved]));

    // Send Manager Notification
    try {
      const savedNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const smNotif = {
        id: `notif_sm_eod_${Date.now()}`,
        recipientRole: "manager",
        title: `📑 EOD Daily Work Report Submitted by ${userName}`,
        message: `${userName} [${empCode || 'EMP000012'}] submitted daily report (${newEodObj.callsMade} calls, ${newEodObj.visitsCompleted} visits, ${newEodObj.dealsClosed} deals closed).`,
        time: "Just now",
        read: false,
        type: "Report",
      };
      localStorage.setItem("tc_app_notifications", JSON.stringify([smNotif, ...savedNotifs]));
    } catch (err) {}

    setReportSubmitted(true);
    showToast("📑 Daily Work Report submitted to Sales Manager successfully!", "success");
  };

  // ── Document State ──────────────────────────────────────────────────────────
  const [documentsList, setDocumentsList] = useState(() => {
    return getArr("tc_se_documents").length > 0
      ? getArr("tc_se_documents")
      : [
          { id: "doc_1", name: "Aadhar Card", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
          { id: "doc_2", name: "Offer Letter", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
          { id: "doc_3", name: "PAN Card", status: "pending", note: "Required document", fileUrl: null, fileName: "" },
        ];
  });

  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("tc_se_documents", JSON.stringify(documentsList));
    } catch (e) {}
  }, [documentsList]);

  // ── Activity log ───────────────────────────────────────────────────────────
  const activityLog = [
    ...allLeads.slice(0,3).map(l => ({ icon:"🪪", text:`Lead added: ${l.company}`, time: l.createdAt || "Recently" })),
    ...allVisits.slice(0,2).map(v => ({ icon:"📍", text:`Visit: ${v.customerName || v.customer}`, time: v.visitDate || "Recently" })),
    ...allCustomers.slice(0,2).map(c => ({ icon:"🎉", text:`Converted: ${c.name}`, time: c.onboardDate || "Recently" })),
  ].slice(0, 8);

  return (
    <div className="space-y-6 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6">

      {/* Top Header & Sub-Navigation Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              TwiteHRMS Employee Portal
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-0.5">
              {userName} · Employee Code: <strong className="text-slate-800">{empCode}</strong> · Sales Executive &nbsp;✅ Active
            </p>
          </div>
        </div>

        {/* Horizontal Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
                activeSection === key
                  ? "bg-[#1a1f36] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN SECTION CONTENT ────────────────────────────────── */}
      <div className="w-full">

        {/* ── DASHBOARD ── */}
        {activeSection === "dashboard" && (
          <div className="space-y-5 max-w-5xl">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{userName}'s Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5 font-semibold">Employee Code: <strong className="text-slate-800">{empCode}</strong> · Sales Executive &nbsp;✅ Active</p>
            </div>

            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Today's Performance</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label:"Calls Made",       value: allFollowups.length, icon: Phone,     bg:"bg-blue-50 border-blue-200",   text:"text-blue-700"   },
                  { label:"Visits Done",       value: allVisits.length,    icon: MapPin,    bg:"bg-purple-50 border-purple-200", text:"text-purple-700" },
                  { label:"Clients Said OK",   value: convertedClients,    icon: UserCheck, bg:"bg-emerald-50 border-emerald-200", text:"text-emerald-700" },
                  { label:"Hot Leads Active",  value: hotLeads,            icon: Target,    bg:"bg-rose-50 border-rose-200",   text:"text-rose-700"   },
                ].map(({ label, value, icon: Icon, bg, text }) => (
                  <div key={label} className={`bg-white rounded-2xl p-4 border shadow-xs ${bg}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${text}`}>{label}</p>
                        <h2 className={`text-3xl font-black mt-1 ${text}`}>{value}</h2>
                      </div>
                      <div className={`w-9 h-9 rounded-xl ${bg.split(" ")[0]} ${text} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label:"Total My Leads",   value: allLeads.length,     icon: Users,     color:"sky"     },
                { label:"Active Customers", value: allCustomers.length, icon: UserCheck, color:"emerald" },
                { label:"Conversion Rate",  value: `${convRate}%`,      icon: TrendingUp,color:"violet"  },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`bg-white rounded-2xl p-4 border border-${color}-200 shadow-xs flex items-center gap-4`}>
                  <div className={`w-11 h-11 rounded-xl bg-${color}-50 text-${color}-700 flex items-center justify-center shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                    <h2 className={`text-2xl font-black text-${color}-700`}>{value}</h2>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm">My Recent Leads</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last 5</span>
              </div>
              {!allLeads.length ? (
                <p className="text-center text-slate-400 text-sm py-8 font-semibold">No leads assigned yet.</p>
              ) : allLeads.slice(0,5).map((l) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{l.company}</p>
                    <p className="text-xs text-slate-500 font-semibold truncate">{l.person} · {l.phone}</p>
                    <span className="text-[10px] text-violet-700 font-black bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                      {l.leadNumber || `LD-${String(l.id || '').slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border ${l.category==="Hot"?"bg-rose-50 text-rose-700 border-rose-200":l.category==="Warm"?"bg-amber-50 text-amber-700 border-amber-200":"bg-sky-50 text-sky-700 border-sky-200"}`}>
                    {l.category==="Hot"?"🔥 Hot":l.category==="Warm"?"⚡ Warm":"❄️ Cold"}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-900 text-sm">Monthly Conversion Progress</h3>
                <span className="text-emerald-700 font-black text-sm">{convertedClients} / {allLeads.length || "—"} leads</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-600 transition-all duration-700" style={{ width: `${Math.min(convRate, 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-2">{convRate}% conversion rate this month</p>
            </div>
          </div>
        )}

        {/* ── DAILY WORK REPORT ── */}
        {activeSection === "daily_report" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Daily Work Report</h1>
              <p className="text-slate-500 text-sm mt-0.5 font-semibold">Submit your daily sales activity report before 6:30 PM.</p>
            </div>

            {reportSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
                <h2 className="text-xl font-black text-emerald-900">Report Submitted! ✅</h2>
                <p className="text-emerald-700 font-semibold text-sm">Your daily report for {formatDate(new Date())} has been saved.</p>
                <button onClick={() => setReportSubmitted(false)} className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <CalendarDays size={18} className="text-teal-600" />
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Report Date</p>
                    <p className="text-sm font-black text-slate-900">{formatDate(new Date())}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Today's Numbers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { field:"callsMade",         label:"Calls Made",           icon:Phone,        ph:"e.g. 12" },
                      { field:"visitsCompleted",    label:"Visits Completed",     icon:MapPin,       ph:"e.g. 2"  },
                      { field:"leadsGenerated",     label:"New Leads",            icon:Users,        ph:"e.g. 5"  },
                      { field:"clientsInterested",  label:"Clients Interested",   icon:UserCheck,    ph:"e.g. 3"  },
                      { field:"followupsScheduled", label:"Follow-ups Scheduled", icon:Clock3,       ph:"e.g. 4"  },
                      { field:"dealsClosed",        label:"Deals Closed (Won)",   icon:CheckCircle2, ph:"e.g. 1"  },
                    ].map(({ field, label, icon: Icon, ph }) => (
                      <div key={field} className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <Icon size={12} className="text-teal-600" /> {label}
                        </div>
                        <input type="number" min="0" placeholder={ph} value={report[field]}
                          onChange={e => setReport(p => ({ ...p, [field]: e.target.value }))}
                          className="w-full text-xl font-black text-slate-900 border-0 focus:outline-none bg-transparent" />
                      </div>
                    ))}
                  </div>
                </div>
                {[
                  { field:"highlights",  label:"Key Highlights / Wins Today", ph:"Best calls, site visits, promising leads..." },
                  { field:"blockers",    label:"Blockers / Issues",            ph:"Challenges, rejections, travel issues..."  },
                  { field:"nextDayPlan", label:"Tomorrow's Plan",              ph:"Which clients to call, follow up..."       },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">{label}</label>
                    <textarea rows={3} placeholder={ph} value={report[field]}
                      onChange={e => setReport(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 resize-none bg-slate-50 focus:bg-white transition" />
                  </div>
                ))}
                <button type="submit" className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer">
                  <Send size={16} /> Submit Daily Report
                </button>
              </form>
            )}
            {pastReports.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-black text-slate-900 text-sm">Past Reports</h3></div>
                <div className="divide-y divide-slate-100">
                  {pastReports.slice(0,5).map((r, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatDate(new Date(r.date))}</p>
                        <p className="text-xs text-slate-500 font-semibold">📞 {r.callsMade||0} calls · 📍 {r.visitsCompleted||0} visits · ✅ {r.dealsClosed||0} deals</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Submitted</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS (Working Local File Upload) ── */}
        {activeSection === "documents" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">My Documents</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 divide-y divide-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider pb-3">Mandatory Documents</p>
              {documentsList.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{doc.name}</p>
                    <p className={`text-[11px] font-semibold ${doc.status === "uploaded" ? "text-emerald-600" : "text-slate-400"}`}>
                      {doc.status === "uploaded" ? `✅ Uploaded: ${doc.fileName || "File Attached"}` : "📄 Required document"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Hidden Local File Input */}
                    <input
                      type="file"
                      id={`file_input_${doc.id}`}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target.result;
                          setDocumentsList((prev) =>
                            prev.map((item) =>
                              item.id === doc.id
                                ? {
                                    ...item,
                                    status: "uploaded",
                                    fileName: file.name,
                                    fileUrl: base64,
                                    note: `Uploaded ${new Date().toLocaleDateString("en-GB")}`,
                                  }
                                : item
                            )
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />

                    {doc.status === "uploaded" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>

                        <button
                          type="button"
                          onClick={() => document.getElementById(`file_input_${doc.id}`)?.click()}
                          className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition flex items-center gap-1"
                        >
                          <Upload size={13} /> Re-upload
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file_input_${doc.id}`)?.click()}
                        className="text-xs font-extrabold px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 cursor-pointer transition flex items-center gap-1 shadow-2xs"
                      >
                        <Upload size={13} /> Upload
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Other Document Drag & Drop Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Upload Other Document</p>
              
              <input
                type="file"
                id="file_input_custom"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target.result;
                    const newCustomDoc = {
                      id: `doc_${Date.now()}`,
                      name: file.name.split(".")[0],
                      status: "uploaded",
                      fileName: file.name,
                      fileUrl: base64,
                      note: `Uploaded ${new Date().toLocaleDateString("en-GB")}`,
                    };
                    setDocumentsList((prev) => [...prev, newCustomDoc]);
                  };
                  reader.readAsDataURL(file);
                }}
              />

              <div
                onClick={() => document.getElementById("file_input_custom")?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl p-8 text-center transition cursor-pointer group"
              >
                <FileUp size={32} className="text-teal-600 group-hover:scale-110 transition mx-auto mb-2" />
                <p className="text-sm font-black text-slate-900">Click to upload document from your computer</p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Supports PDF, JPG, PNG, Word, Excel files</p>
              </div>
            </div>

            {/* Modal Document Viewer */}
            {previewDoc && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{previewDoc.name}</h3>
                      <p className="text-xs text-slate-500 font-semibold">{previewDoc.fileName}</p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-100 p-2 bg-slate-50 flex items-center justify-center">
                    {previewDoc.fileUrl?.startsWith("data:image/") ? (
                      <img src={previewDoc.fileUrl} alt={previewDoc.name} className="max-w-full rounded-xl shadow-md" />
                    ) : (
                      <iframe src={previewDoc.fileUrl} title={previewDoc.name} className="w-full h-80 rounded-xl" />
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setPreviewDoc(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                    >
                      Close Viewer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEAVE MANAGEMENT (Twite HRMS UI Match) ── */}
        {activeSection === "leave" && (
          <div className="space-y-6 max-w-5xl">
            {/* 1. Leave Details Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-black text-slate-900">Leave Details</h2>
              <div className="max-w-xs">
                <div className="bg-emerald-100/70 border border-emerald-200 rounded-2xl p-4 relative space-y-2">
                  <span className="text-xs font-extrabold text-emerald-900 block">Casual Leave</span>
                  <div className="text-4xl font-black text-emerald-950">3</div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 pt-1">
                    <span>3 / 3 days remaining</span>
                    <span className="text-emerald-900 hover:underline cursor-pointer">Details &gt;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Attendance Summary Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-lg font-black text-slate-900">Attendance Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-100/60 border border-emerald-200 rounded-2xl p-6 text-center space-y-1">
                  <span className="text-xs font-extrabold text-emerald-900 block">No of Present</span>
                  <span className="text-4xl font-black text-emerald-700 block">
                    {(() => {
                      const logs = getArr("tc_attendance_logs");
                      return logs.length > 0 ? logs.length : 2;
                    })()}
                  </span>
                </div>

                <div className="bg-rose-100/60 border border-rose-200 rounded-2xl p-6 text-center space-y-1">
                  <span className="text-xs font-extrabold text-rose-900 block">No of Absent</span>
                  <span className="text-4xl font-black text-rose-600 block">0</span>
                </div>
              </div>
            </div>

            {/* 3. Attendance Report Table Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-black text-slate-900">Attendance Report</h2>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button type="button" className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900">DATE</button>
                  <button type="button" className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900">WEEK</button>
                  <button type="button" className="px-3 py-1 text-xs font-extrabold bg-[#3c354a] text-white rounded-lg shadow-2xs">MONTH</button>
                  <span className="px-3 py-1 text-xs font-bold text-slate-700 border-l border-slate-200">August, 2026 📅</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3">LOGIN TIME</th>
                      <th className="py-3 px-3">LOGOUT TIME</th>
                      <th className="py-3 px-3">LOGIN LOCATION</th>
                      <th className="py-3 px-3">LOGOUT LOCATION</th>
                      <th className="py-3 px-3">WORK HOURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {(() => {
                      const logs = getArr("tc_attendance_logs");
                      const userLogs = filterUserItems(logs, currentUser);
                      const listToRender = userLogs;

                      if (listToRender.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400 font-bold">
                              No attendance logs recorded for your account yet.
                            </td>
                          </tr>
                        );
                      }

                      return listToRender.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-3 text-slate-900">{row.date}</td>
                          <td className="py-4 px-3">{row.loginTime}</td>
                          <td className="py-4 px-3">{row.logoutTime}</td>
                          <td className="py-4 px-3 max-w-[220px] text-slate-600 font-medium text-[11px] leading-relaxed">
                            {row.loginLocation}
                          </td>
                          <td className="py-4 px-3 max-w-[220px] text-slate-600 font-medium text-[11px] leading-relaxed">
                            {row.logoutLocation}
                          </td>
                          <td className="py-4 px-3 font-extrabold text-slate-900">{row.workHours}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── HOLIDAY CALENDAR ── */}
        {activeSection === "calendar" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Holiday Calendar 2026–27</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
              {HOLIDAYS.map(h=>(
                <div key={h.date} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0">
                      {h.type==="National"?"🇮🇳":h.type==="Festival"?"🎉":"🌅"}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{h.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{h.date}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${h.type==="National"?"bg-blue-50 text-blue-700 border-blue-200":h.type==="Festival"?"bg-amber-50 text-amber-700 border-amber-200":"bg-violet-50 text-violet-700 border-violet-200"}`}>{h.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CAREER LADDER ── */}
        {activeSection === "career" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Career Ladder</h1>
            <p className="text-slate-500 text-sm font-semibold">Your growth path at TwiteConnect based on deals closed.</p>
            <div className="space-y-3">
              {[
                { level:"1", title:"Sales Executive Trainee",  target:"0–5 deals",  done: convertedClients>5,  current: convertedClients<=5  },
                { level:"2", title:"Sales Executive",          target:"6–15 deals", done: convertedClients>15, current: convertedClients>5&&convertedClients<=15 },
                { level:"3", title:"Senior Sales Executive",   target:"16–30 deals",done: convertedClients>30, current: convertedClients>15&&convertedClients<=30 },
                { level:"4", title:"Sales Team Lead",          target:"31+ deals",  done: false,               current: convertedClients>30 },
                { level:"5", title:"Sales Manager",            target:"Promotion",  done: false,               current: false },
              ].map(step=>(
                <div key={step.level} className={`flex items-center gap-4 p-4 rounded-2xl border transition ${step.current?"bg-teal-50 border-teal-300":step.done?"bg-emerald-50 border-emerald-200":"bg-white border-slate-200"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${step.done?"bg-emerald-600 text-white":step.current?"bg-teal-600 text-white":"bg-slate-100 text-slate-400"}`}>
                    {step.done?<CheckCircle2 size={18}/>:step.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm ${step.current?"text-teal-900":step.done?"text-emerald-900":"text-slate-500"}`}>{step.title}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{step.target}</p>
                  </div>
                  {step.current&&<span className="text-[10px] font-black text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300 shrink-0">Current Level</span>}
                  {step.done&&<span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">✅ Achieved</span>}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center gap-3 mb-3"><Medal size={20} className="text-amber-500" /><h3 className="font-black text-slate-900 text-sm">Your Total Conversions</h3></div>
              <p className="text-4xl font-black text-amber-600">{convertedClients}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">deals closed across all time</p>
            </div>
          </div>
        )}

        {/* ── HANDBOOK ── */}
        {activeSection === "handbook" && (
          <div className="max-w-3xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Twite Sales Handbook</h1>
            <p className="text-slate-500 text-sm font-semibold">Guidelines, processes, and policies for TwiteConnect Sales Executives.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HANDBOOK.map(s=>(
                <div key={s.title} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-2">
                  <div className="flex items-center gap-2"><span className="text-xl">{s.icon}</span><h3 className="font-black text-slate-900 text-sm">{s.title}</h3></div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOGS ── */}
        {activeSection === "activity" && (
          <div className="max-w-2xl space-y-5">
            <h1 className="text-2xl font-black text-slate-900">Activity Logs</h1>
            <p className="text-slate-500 text-sm font-semibold">All your recent actions — leads, visits, and conversions.</p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
              {!activityLog.length?(
                <p className="text-center text-slate-400 text-sm py-8 font-semibold">No activity recorded yet. Start adding leads!</p>
              ):activityLog.map((a,i)=>(
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="text-lg shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{a.text}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{a.time}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}