import React, { useState, useEffect, useRef } from "react";
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
  X,
  Eye,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Send,
  Paperclip,
  User,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { notificationAPI } from "../../services/api.js";
import { filterUserNotifications } from "../../utils/userScope.js";

const DEFAULT_CHAT_CONTACTS = [
  { id: "mgr", name: "Jeeva kumar", role: "Reporting Manager", role_title: "Sales Manager", online: true, avatarBg: "bg-teal-600", contact_type: "reporting_manager", email: "jeeva@twite.ai" },
  { id: "tl", name: "vedika .", role: "Team Lead", role_title: "Team Lead", online: true, avatarBg: "bg-indigo-600", contact_type: "team_lead", email: "vedika@twite.ai" },
  { id: "team", name: "Sales Executive Team", role: "Sales Executive Team", role_title: "Sales Executive", online: true, avatarBg: "bg-emerald-600", contact_type: "team", email: "team@tconnect.com" },
  { id: "hr", name: "HR & Operations", role: "HR & Support", role_title: "HR Manager", online: false, avatarBg: "bg-rose-600", contact_type: "hr", email: "hr@tconnect.com" },
];

const INITIAL_MESSAGES = {
  mgr: [
    { id: 1, sender: "contact", text: "Good morning! Please update your lead status and visit reports for today.", time: "09:30 AM" },
    { id: 2, sender: "user", text: "Good morning sir! Yes, I have 3 client site visits scheduled today.", time: "09:35 AM" },
    { id: 3, sender: "contact", text: "Great! Make sure to log the GPS location check-in for each visit.", time: "09:40 AM" },
    { id: 4, sender: "user", text: "hi", time: "10:50 AM" }
  ],
  tl: [
    { id: 1, sender: "contact", text: "Hi, how are the client follow-ups going?", time: "09:15 AM" },
    { id: 2, sender: "user", text: "Going well! Closed 2 deals this week.", time: "09:20 AM" }
  ],
  team: [
    { id: 1, sender: "contact", text: "Team meet scheduled at 4:30 PM today for target review.", time: "10:00 AM" }
  ],
  hr: [
    { id: 1, sender: "contact", text: "Welcome to TwiteHRMS! Let us know if you need assistance with leave balance.", time: "2 days ago" }
  ]
};

export default function Notifications() {
  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userId = currentUser.id || currentUser.user_id || "";

  // Main Page View Switch: "notifications" | "chat"
  const [activeMainTab, setActiveMainTab] = useState("notifications");

  // ── Notifications State ───────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedNotif, setSelectedNotif] = useState(null);

  // ── Chat State ─────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState(DEFAULT_CHAT_CONTACTS);
  const [selectedContact, setSelectedContact] = useState(DEFAULT_CHAT_CONTACTS[0]);
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tc_chat_messages") || "null");
      return saved || INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });
  const [newMessageText, setNewMessageText] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const messagesEndRef = useRef(null);

  // Load chat contacts dynamically from backend
  const loadContacts = async () => {
    try {
      const res = await notificationAPI.getChatContacts();
      const raw = res?.data || res || [];
      if (Array.isArray(raw) && raw.length > 0) {
        const formatted = raw.map((c) => ({
          ...c,
          avatarBg:
            c.contact_type === "reporting_manager"
              ? "bg-teal-600"
              : c.contact_type === "team_lead"
              ? "bg-indigo-600"
              : c.contact_type === "team"
              ? "bg-emerald-600"
              : "bg-rose-600",
        }));
        setContacts(formatted);
        setSelectedContact((prev) => {
          const match = formatted.find((item) => item.id === prev?.id || item.contact_type === prev?.contact_type);
          return match || formatted[0];
        });
      }
    } catch (err) {
      console.warn("Notice: Chat contacts fallback to local", err);
    }
  };

  // Load messages for selected contact from backend
  const loadMessagesForContact = async (contact) => {
    if (!contact) return;
    try {
      const res = await notificationAPI.getChatMessages({
        contact_type: contact.contact_type || contact.id,
        contact_email: contact.email || "",
        contact_id: contact.id || "",
      });
      const raw = res?.data || res || [];
      if (Array.isArray(raw) && raw.length > 0) {
        const formatted = raw.map((m) => {
          const isUser =
            m.sender_id === userId ||
            (m.sender_email && m.sender_email.toLowerCase() === userEmail) ||
            m.sender === "user";
          return {
            id: m.id || Date.now(),
            sender: isUser ? "user" : "contact",
            sender_name: m.sender_name,
            text: m.message_text || m.text || "",
            time: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : m.time || "Just now",
          };
        });

        setChatMessages((prev) => ({
          ...prev,
          [contact.id]: formatted,
        }));
      }
    } catch (err) {
      console.warn("Notice: Chat messages fallback to local", err);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [currentUser?.email]);

  useEffect(() => {
    if (selectedContact) {
      loadMessagesForContact(selectedContact);
    }
  }, [selectedContact?.id, selectedContact?.contact_type]);


  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications();
      const raw = Array.isArray(res) ? res : res?.data || [];
      const localNotifs = JSON.parse(localStorage.getItem("tc_app_notifications") || "[]");
      const combined = [...raw, ...localNotifs];

      // Deduplicate by ID or unique title/timestamp
      const seen = new Set();
      const unique = combined.filter((n) => {
        const key = n.id || `${n.title}_${n.created_at || n.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Strict Executive Privacy Filter
      const scopedNotifs = filterUserNotifications(unique, currentUser);

      const sorted = [...scopedNotifs].sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
      );

      setItems(
        sorted.map((n) => ({
          ...n,
          status: n.is_read || n.read ? "Read" : "Unread",
          read: n.is_read || n.read || false,
          type: n.category || n.type || "General",
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Recently",
          dateStr: n.created_at ? new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
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
  }, [currentUser?.email]);

  useEffect(() => {
    if (activeMainTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMainTab, selectedContact, chatMessages]);

  const handleMarkAllRead = async () => {
    // 1. Instantly update UI state optimistically
    setItems((prev) =>
      prev.map((n) => ({ ...n, status: "Read", read: true, is_read: true }))
    );
    try {
      localStorage.setItem("tc_unread_message_count", "0");
      if (typeof window !== "undefined" && "navigator" in window && "clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    } catch (e) {}

    // 2. Dispatch single batch request in background
    try {
      await notificationAPI.markAllRead();
    } catch (e) {
      console.warn("Mark all read sync error:", e);
    }
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationAPI.markRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "Read", read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  };

  const handleOpenDetail = (n) => {
    setSelectedNotif(n);
    if (!n.read) {
      handleMarkRead(n.id);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() || !selectedContact) return;

    const text = newMessageText.trim();
    const contactId = selectedContact.id;
    const newMsgObj = {
      id: Date.now(),
      sender: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMap = {
      ...chatMessages,
      [contactId]: [...(chatMessages[contactId] || []), newMsgObj]
    };

    setChatMessages(updatedMap);
    setNewMessageText("");
    try {
      localStorage.setItem("tc_chat_messages", JSON.stringify(updatedMap));
      await notificationAPI.sendChatMessage({
        recipient_id: selectedContact.id,
        recipient_name: selectedContact.name,
        recipient_email: selectedContact.email || "",
        contact_type: selectedContact.contact_type || contactId,
        message_text: text,
      });
    } catch (_) {}
  };

  const filtered = items.filter((n) => {
    const matchesSearch =
      (n.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.message || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || n.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const unreadCount = items.filter((n) => n.status === "Unread" || !n.read).length;

  const currentContactMessages = chatMessages[selectedContact.id] || [];
  const filteredContacts = contacts.filter(c =>
    (c.name || "").toLowerCase().includes(chatSearch.toLowerCase()) ||
    (c.role || "").toLowerCase().includes(chatSearch.toLowerCase()) ||
    (c.role_title || "").toLowerCase().includes(chatSearch.toLowerCase())
  );


  return (
    <div className="space-y-4 font-sans text-slate-900 min-w-0">
      {/* ── TOP VIEW TOGGLE HEADER (Notifications vs Chat) ── */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            {activeMainTab === "notifications" ? <Bell className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                {activeMainTab === "notifications" ? "Notifications Center" : "Live Chat & Messaging"}
              </h1>
              {activeMainTab === "notifications" && unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {activeMainTab === "notifications" 
                ? "Real-time alerts, lead assignments, and system updates" 
                : "Direct messaging with Reporting Manager, Team Lead, and Support"}
            </p>
          </div>
        </div>

        {/* ── TOGGLE SWITCH BUTTONS ── */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveMainTab("notifications")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "notifications"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeMainTab === "notifications" ? "bg-teal-700 text-white" : "bg-rose-500 text-white"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("chat")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "chat"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat & Messages</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ── 1. NOTIFICATIONS VIEW ────────────────────────────────────────── */}
      {activeMainTab === "notifications" && (
        <>
          {/* Notifications Controls & Filter Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 text-xs border border-slate-200 rounded-xl pl-8 pr-3 bg-slate-50 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold text-slate-700 focus:outline-none cursor-pointer"
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
                    onClick={() => handleOpenDetail(n)}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer group ${
                      n.status === "Unread" || !n.read ? "bg-teal-50/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          n.status === "Unread" || !n.read ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-900 group-hover:text-teal-700 transition truncate">
                            {n.title}
                          </p>
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            {n.type || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{n.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold">{n.time || "Just now"}</span>
                      {(n.status === "Unread" || !n.read) && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="p-1 rounded-lg text-teal-600 hover:bg-teal-50"
                          title="Mark as Read"
                        >
                          <MailOpen className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(n.id, e)}
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
        </>
      )}

      {/* ── 2. LIVE CHAT & MESSAGING VIEW ────────────────────────────────── */}
      {activeMainTab === "chat" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
          {/* Left Contacts Sidebar (4 cols on desktop) */}
          <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col min-h-[480px]">
            {/* Search contacts */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chat contacts..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full h-8 text-xs border border-slate-200 rounded-xl pl-8 pr-3 bg-white focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
            </div>

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredContacts.map((c) => {
                const isSelected = selectedContact.id === c.id;
                const contactMsgs = chatMessages[c.id] || [];
                const lastMsg = contactMsgs[contactMsgs.length - 1];

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                      isSelected ? "bg-teal-50/80 border-l-4 border-teal-600" : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-2xl ${c.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-2xs`}>
                        {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      {c.online && (
                        <span className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-black truncate ${isSelected ? "text-teal-900" : "text-slate-900"}`}>
                          {c.name}
                        </h4>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                            {lastMsg.time}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                        {lastMsg ? lastMsg.text : c.role}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Chat Conversation Box (8 cols on desktop) */}
          <div className="md:col-span-8 flex flex-col h-[540px] bg-white">
            {/* Conversation Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${selectedContact.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0`}>
                  {selectedContact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 truncate">{selectedContact.name}</h3>
                    {selectedContact.online && (
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.2 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">{selectedContact.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button title="Voice Call" className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/60 transition cursor-pointer">
                  <Phone className="w-4 h-4" />
                </button>
                <button title="Video Call" className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/60 transition cursor-pointer">
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
              {currentContactMessages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                  No messages yet. Start a conversation with {selectedContact.name}!
                </div>
              ) : (
                currentContactMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-2xs space-y-1 text-xs ${
                        isUser
                          ? "bg-teal-600 text-white rounded-br-2xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-2xs"
                      }`}>
                        <p className="font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div className={`text-[9px] font-bold text-right flex items-center justify-end gap-1 ${
                          isUser ? "text-teal-100" : "text-slate-400"
                        }`}>
                          <span>{msg.time}</span>
                          {isUser && <CheckCircle2 className="w-3 h-3 text-teal-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Message ${selectedContact.name}...`}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 h-9 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 focus:outline-none focus:border-teal-500 focus:bg-white font-semibold text-slate-900"
              />

              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ELEVATED NOTIFICATION DETAIL MODAL ───────────────────────── */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200 relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                      {selectedNotif.type || "Notification"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {selectedNotif.dateStr ? `${selectedNotif.dateStr} • ` : ""}{selectedNotif.time || "Just now"}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-1 leading-snug">
                    {selectedNotif.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {selectedNotif.message}
            </div>

            {/* Info */}
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 text-[11px] text-teal-900 space-y-1">
              {selectedNotif.assigned_by && (
                <p><span className="font-bold">Assigned By:</span> {selectedNotif.assigned_by}</p>
              )}
              {selectedNotif.lead_name && (
                <p><span className="font-bold">Related Lead:</span> {selectedNotif.lead_name}</p>
              )}
              <p className="text-[10px] text-teal-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-teal-600" /> Private & Securly Delivered to {currentUser.name || currentUser.email}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={(e) => handleDelete(selectedNotif.id, e)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>

              <button
                onClick={() => setSelectedNotif(null)}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}