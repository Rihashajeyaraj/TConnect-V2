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
import { notificationAPI } from "../../services/api.js";

export default function Notifications() {
  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userId = currentUser.id || currentUser.user_id || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications();
      const raw = Array.isArray(res) ? res : res?.data || [];
      const sorted = [...raw].sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));
      setItems(
        sorted.map((n) => ({
          ...n,
          status: n.is_read || n.read ? "Read" : "Unread",
          read: n.is_read || n.read || false,
          type: n.category || n.type || "General",
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Recently",
        }))
      );

    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const unreadList = items.filter((n) => !n.read);
      await Promise.allSettled(unreadList.map((n) => notificationAPI.markRead(n.id)));
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "Read", read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleDelete = (id) => {
    // Dismiss/hide locally since backend has no delete endpoint
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