import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  Trash2,
  CheckCircle2,
  MailOpen,
  Mail,
  Filter,
  Clock3,
  AlertCircle,
  Check,
} from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser.js";

const DEFAULT_NOTIFICATIONS = [
  { id: "1", title: "🔥 New Lead Assigned", message: "ABC Hospital assigned by Sales Manager (Hot Lead).", time: "5 mins ago", status: "Unread", read: false, type: "Lead" },
  { id: "2", title: "Visit Reminder", message: "Visit XYZ Builders at 2:00 PM today.", time: "30 mins ago", status: "Unread", read: false, type: "Visit" },
  { id: "3", title: "Expense Approved", message: "Fuel expense approved successfully.", time: "Yesterday", status: "Read", read: true, type: "Expense" },
  { id: "4", title: "Follow-up Reminder", message: "Call Tech Solutions today.", time: "Yesterday", status: "Read", read: true, type: "Follow-up" },
  { id: "5", title: "Monthly Sales Target", message: "Q3 Sales target updated for Chennai zone.", time: "2 days ago", status: "Read", read: true, type: "General" },
];

export default function Notifications() {
  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userId = currentUser.id || currentUser.user_id || "";

  const [items, setItems] = useState(() => {
    try {
      const savedStr = localStorage.getItem("tc_app_notifications");
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const myNotifs = parsed.filter(
            (n) =>
              (userEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === userEmail) ||
              (userId && n.user_id && String(n.user_id).toLowerCase() === userId.toLowerCase()) ||
              (n.recipientRole || "").toLowerCase() === "sales"
          );
          if (myNotifs.length > 0) {
            return myNotifs.map((n) => ({
              ...n,
              status: n.read ? "Read" : "Unread",
              type: n.type || "General",
            }));
          }
        }
      }
    } catch (e) {}
    return [];
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tc_app_notifications", JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, status: "Read", read: true })));
  };

  const handleMarkRead = (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "Read", read: true } : n))
    );
  };

  const handleDelete = (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = items.filter((n) => {
    const matchesSearch =
      (n.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.message || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || n.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const unreadCount = items.filter((n) => n.status === "Unread" || !n.read).length;

  return (
    <div className="space-y-4 font-sans text-slate-900">
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Notifications Center</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Real-time alerts for leads assigned by Sales Manager</p>
          </div>
        </div>

        {/* Search & Filter Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-xl pl-8 pr-3 bg-slate-50 focus:outline-none focus:border-teal-500 focus:bg-white w-44 font-semibold"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-xl px-2 bg-slate-50 font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Lead">Leads</option>
            <option value="Visit">Visits</option>
            <option value="Expense">Expenses</option>
            <option value="Follow-up">Follow-ups</option>
          </select>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="h-8 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-extrabold text-[11px] flex items-center gap-1 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            No notifications match your search or filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition ${
                  n.status === "Unread" || !n.read ? "bg-teal-50/40" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      n.status === "Unread" || !n.read ? "bg-red-500 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                        {n.type || "Lead"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{n.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-400 font-semibold">{n.time || "Just now"}</span>
                  {(n.status === "Unread" || !n.read) && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 rounded-lg text-teal-600 hover:bg-teal-50"
                      title="Mark as Read"
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}