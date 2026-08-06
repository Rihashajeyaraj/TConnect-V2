import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Filter,
  Loader2,
  Tag,
  Calendar,
  Sparkles,
  Check,
  Pin,
  StickyNote,
} from "lucide-react";
import { todoAPI } from "../../services/api.js";
import useCurrentUser from "../../hooks/useCurrentUser.js";
import { filterUserItems, isItemOwnedByUser } from "../../utils/userScope.js";
import { formatDate } from "../../utils/dateUtils.js";

const STICKY_THEMES = {
  yellow: {
    bg: "bg-amber-100/95 hover:bg-amber-100",
    border: "border-amber-300/80",
    tape: "bg-amber-300/70",
    pin: "bg-amber-500",
    tag: "bg-amber-200/90 text-amber-900 border-amber-300",
    text: "text-amber-950",
    shadow: "shadow-[0_12px_24px_-6px_rgba(217,119,6,0.25),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
  },
  pink: {
    bg: "bg-pink-100/95 hover:bg-pink-100",
    border: "border-pink-300/80",
    tape: "bg-pink-300/70",
    pin: "bg-pink-500",
    tag: "bg-pink-200/90 text-pink-900 border-pink-300",
    text: "text-pink-950",
    shadow: "shadow-[0_12px_24px_-6px_rgba(219,39,119,0.25),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
  },
  cyan: {
    bg: "bg-sky-100/95 hover:bg-sky-100",
    border: "border-sky-300/80",
    tape: "bg-sky-300/70",
    pin: "bg-sky-500",
    tag: "bg-sky-200/90 text-sky-900 border-sky-300",
    text: "text-sky-950",
    shadow: "shadow-[0_12px_24px_-6px_rgba(14,165,233,0.25),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
  },
  emerald: {
    bg: "bg-emerald-100/95 hover:bg-emerald-100",
    border: "border-emerald-300/80",
    tape: "bg-emerald-300/70",
    pin: "bg-emerald-500",
    tag: "bg-emerald-200/90 text-emerald-900 border-emerald-300",
    text: "text-emerald-950",
    shadow: "shadow-[0_12px_24px_-6px_rgba(16,185,129,0.25),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
  },
  purple: {
    bg: "bg-purple-100/95 hover:bg-purple-100",
    border: "border-purple-300/80",
    tape: "bg-purple-300/70",
    pin: "bg-purple-500",
    tag: "bg-purple-200/90 text-purple-900 border-purple-300",
    text: "text-purple-950",
    shadow: "shadow-[0_12px_24px_-6px_rgba(147,51,234,0.25),0_4px_6px_-2px_rgba(0,0,0,0.05)]",
  },
};

const INITIAL_TODOS = [];

export default function Todo() {
  const currentUser = useCurrentUser();
  const userEmail = (currentUser.email || "").toLowerCase().trim();
  const userId = currentUser.id || currentUser.user_id || "";

  const matchesUser = (item) => {
    if (!item) return false;
    const uid = (item.user_id || item.userId || item.employee_id || "").toLowerCase().trim();
    const email = (item.email || item.assignedTo || "").toLowerCase().trim();

    if (!uid && !email) return true;
    if (userId && uid === userId.toLowerCase()) return true;
    if (userEmail && email === userEmail) return true;
    return true;
  };

  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem("tc_3d_todos");
      const parsed = saved ? JSON.parse(saved) : filterUserItems(INITIAL_TODOS, currentUser);
      return filterUserItems(parsed, currentUser);
    } catch {
      return filterUserItems(INITIAL_TODOS, currentUser);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tc_3d_todos", JSON.stringify(todos));
    } catch (e) {}
  }, [todos]);

  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [category, setCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDateMode, setFilterDateMode] = useState("All"); // "All", "Today", "Upcoming", "Past", "Custom"
  const [customFilterDate, setCustomFilterDate] = useState("");
  const [customDate, setCustomDate] = useState("");

  // Helper for date normalization
  const parseDate = (dStr) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const todayStr = formatDate(new Date());

  // Handle Quick Add Sticky
  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);

    const taskDate = todayStr;

    const newSticky = {
      id: `sticky_${Date.now()}`,
      title: newTitle,
      priority,
      color: selectedColor,
      category,
      due_date: taskDate,
      raw_date: new Date().toISOString().slice(0, 10),
      is_completed: false,
      user_id: userId,
      email: userEmail,
    };

    setTodos((prev) => [newSticky, ...prev]);
    setNewTitle("");

    try {
      await todoAPI.createTodo({
        title: newTitle,
        priority,
        category,
        due_date: taskDate,
      });
    } catch (err) {
      // Retain local sticky
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_completed: !currentStatus } : t))
    );
    try {
      await todoAPI.updateTodo(id, { is_completed: !currentStatus });
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await todoAPI.deleteTodo(id);
    } catch (err) {}
  };

  const filtered = todos.filter((t) => {
    if (!matchesUser(t)) return false;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === "All" || t.category === filterCategory;
    const matchesStat =
      filterStatus === "All"
        ? true
        : filterStatus === "Pending"
        ? !t.is_completed
        : t.is_completed;

    // Date-wise filtering logic
    let matchesDate = true;
    const itemDateStr = t.due_date || t.date || "";

    if (filterDateMode === "Today") {
      matchesDate = itemDateStr === todayStr || t.raw_date === new Date().toISOString().slice(0, 10);
    } else if (filterDateMode === "Upcoming") {
      const d = parseDate(t.raw_date || itemDateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      matchesDate = d && d > now;
    } else if (filterDateMode === "Past") {
      const d = parseDate(t.raw_date || itemDateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      matchesDate = d && d < now;
    } else if (filterDateMode === "Custom" && customFilterDate) {
      const formattedCustom = formatDate(new Date(customFilterDate));
      matchesDate = t.raw_date === customFilterDate || itemDateStr.includes(customFilterDate) || itemDateStr.includes(formattedCustom);
    }

    return matchesSearch && matchesCat && matchesStat && matchesDate;
  });

  return (
    <div className="space-y-5 font-sans text-slate-900">
      {/* 3D Header Controls & Sticky Creator */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/30">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                3D Sticky Note Taskboard
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tactile pinboard for daily field tasks & follow-ups
              </p>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="h-9 text-xs border border-slate-200 rounded-xl pl-8 pr-3 bg-slate-50 focus:outline-none focus:border-amber-500 focus:bg-white w-36 sm:w-44"
              />
            </div>

            {/* Unified Date-wise Filter Dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={filterDateMode}
                onChange={(e) => {
                  setFilterDateMode(e.target.value);
                  if (e.target.value !== "Custom") setCustomFilterDate("");
                }}
                className="h-9 text-xs border border-amber-200 rounded-xl px-2.5 bg-amber-50/80 font-bold text-amber-900 focus:outline-none cursor-pointer"
              >
                <option value="All">📅 All Dates</option>
                <option value="Today">🌟 Today</option>
                <option value="Upcoming">⏩ Upcoming</option>
                <option value="Past">⏪ Past Due</option>
                <option value="Custom">📆 Custom Date</option>
              </select>

              {filterDateMode === "Custom" && (
                <input
                  type="date"
                  value={customFilterDate}
                  onChange={(e) => setCustomFilterDate(e.target.value)}
                  className="h-9 text-xs border border-slate-200 rounded-xl px-2 bg-white font-semibold text-slate-800 focus:outline-none"
                />
              )}
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 text-xs border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending Sticky</option>
              <option value="Completed">Completed Sticky</option>
            </select>
          </div>
        </div>

        {/* Quick Add Sticky Note Bar */}
        <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Type a new sticky note title..."
            className="flex-1 min-w-[200px] h-10 text-xs border border-slate-200 rounded-xl px-3.5 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white shadow-xs"
          />

          {/* Color Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-xl border border-slate-200">
            {Object.keys(STICKY_THEMES).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  c === "yellow"
                    ? "bg-amber-300"
                    : c === "pink"
                    ? "bg-pink-300"
                    : c === "cyan"
                    ? "bg-sky-300"
                    : c === "emerald"
                    ? "bg-emerald-300"
                    : "bg-purple-300"
                } ${selectedColor === c ? "scale-125 ring-2 ring-slate-800" : "hover:scale-110 opacity-80"}`}
              />
            ))}
          </div>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50 font-bold text-slate-700 focus:outline-none"
          >
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/30 transition flex items-center gap-1.5 shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
            Pin Sticky
          </button>
        </form>
      </div>

      {/* 3D Tactile Corkboard Grid */}
      <div className="bg-[#EFE7DB] border border-[#D9CEBA] rounded-3xl p-6 min-h-[460px] shadow-inner relative overflow-hidden">
        {/* Subtle Corkboard Texture Lines */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#8C7254 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-2 relative z-10">
            <StickyNote className="w-12 h-12 text-slate-400 opacity-60" />
            <p className="font-bold text-sm">No sticky notes found on board</p>
            <p className="text-xs">Add a new sticky note using the input box above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {filtered.map((item, idx) => {
              const theme = STICKY_THEMES[item.color] || STICKY_THEMES.yellow;
              const isRotatedLeft = idx % 2 === 0;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl p-5 border ${theme.bg} ${theme.border} ${theme.shadow} transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] flex flex-col justify-between min-h-[210px] ${
                    isRotatedLeft ? "hover:-rotate-1" : "hover:rotate-1"
                  }`}
                  style={{
                    transform: `rotate(${isRotatedLeft ? "-1.5deg" : "1.5deg"})`,
                  }}
                >
                  {/* Push Pin Header Graphic */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full ${theme.pin} border-2 border-white shadow-md flex items-center justify-center`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    </div>
                  </div>

                  {/* Tape Effect Accent (Top right) */}
                  <div className={`absolute top-2 right-4 w-12 h-4 ${theme.tape} rounded-xs opacity-70 transform rotate-12 pointer-events-none`} />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider ${theme.tag}`}>
                        {item.category || "Task"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {item.due_date}
                      </span>
                    </div>

                    <p
                      className={`text-sm font-extrabold leading-snug ${theme.text} ${
                        item.is_completed ? "line-through opacity-60" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-slate-900/10 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id, item.is_completed)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl transition ${
                        item.is_completed
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white/80 hover:bg-white text-slate-800 border border-slate-300 shadow-2xs"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {item.is_completed ? "Completed" : "Mark Done"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Sticky Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}