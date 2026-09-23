import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Trash2,
  Edit,
  Sparkles,
  MapPin,
  Clock,
  Building,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import useCurrentUser from "../hooks/useCurrentUser.js";
import { holidaysAPI } from "../services/api.js";
import { useToast } from "./ToastContext.jsx";

// Standard Default Holidays matching reference screenshot & corporate defaults
const INITIAL_DEFAULT_HOLIDAYS = [
  { id: "HOL-2026-01", name: "English New Year", date: "2026-01-01", day: "Thursday", location: "All", type: "Festival", description: "New Year Celebration" },
  { id: "HOL-2026-02", name: "Pongal", date: "2026-01-15", day: "Thursday", location: "All", type: "Festival", description: "Harvest Festival" },
  { id: "HOL-2026-03", name: "Thiruvalluvar Day", date: "2026-01-16", day: "Friday", location: "All", type: "Regional", description: "Regional Holiday" },
  { id: "HOL-2026-04", name: "Uzhavar Thirunal", date: "2026-01-17", day: "Saturday", location: "All", type: "Regional", description: "Farmers Day" },
  { id: "HOL-2026-05", name: "Republic Day", date: "2026-01-26", day: "Monday", location: "All", type: "National", description: "National Holiday" },
  { id: "HOL-2026-06", name: "Ramzan", date: "2026-03-21", day: "Saturday", location: "All", type: "Festival", description: "Id-ul-Fitr" },
  { id: "HOL-2026-07", name: "Good Friday", date: "2026-04-03", day: "Friday", location: "All", type: "Festival", description: "Christian Holiday" },
  { id: "HOL-2026-08", name: "Tamil New Year", date: "2026-04-14", day: "Tuesday", location: "All", type: "Regional", description: "Vishu / Tamil New Year" },
  { id: "HOL-2026-09", name: "Election Day", date: "2026-04-23", day: "Thursday", location: "Chennai", type: "Emergency / Election", is_emergency: true, description: "State Legislative Election - Paid Holiday" },
  { id: "HOL-2026-10", name: "May Day", date: "2026-05-01", day: "Friday", location: "All", type: "National", description: "International Workers' Day" },
  { id: "HOL-2026-11", name: "Independence Day", date: "2026-08-15", day: "Saturday", location: "All", type: "National", description: "National Holiday" },
  { id: "HOL-2026-12", name: "Vinayakar Chathurthi", date: "2026-09-14", day: "Monday", location: "Chennai", type: "Festival", description: "Ganesh Chaturthi Festival" },
  { id: "HOL-2026-13", name: "Gandhi Jayanti", date: "2026-10-02", day: "Friday", location: "All", type: "National", description: "National Holiday" },
  { id: "HOL-2026-14", name: "Diwali", date: "2026-10-24", day: "Saturday", location: "All", type: "Festival", description: "Festival of Lights" },
  { id: "HOL-2026-15", name: "Christmas", date: "2026-12-25", day: "Friday", location: "All", type: "Festival", description: "Christmas Holiday" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function HolidayCalendar() {
  const currentUser = useCurrentUser();
  const toastCtx = useToast();
  const showToast = (msg, type = "info") => {
    if (toastCtx && toastCtx.showToast) toastCtx.showToast(msg, type);
  };

  const userRole = String(currentUser.role || "").toLowerCase();
  const isAdminOrManager = userRole.includes("admin") || userRole.includes("ceo") || userRole.includes("manager");

  // State
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 23)); // Default Sep 2026 to match reference
  const [selectedDate, setSelectedDate] = useState("2026-09-23");
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdhocModal, setShowAdhocModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Adhoc form state
  const [adhocForm, setAdhocForm] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    location: "All",
    type: "Emergency",
    description: "",
    notify_all: true,
  });

  // Fetch holidays from backend API on mount
  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await holidaysAPI.getHolidays();
      const rawData = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(rawData) && rawData.length > 0) {
        // Normalize day & name fields
        const processed = rawData.map((item) => {
          const dObj = new Date(item.date);
          const dayName = !isNaN(dObj.getTime())
            ? dObj.toLocaleDateString("en-US", { weekday: "Long" })
            : "Thursday";
          return {
            ...item,
            name: item.name || item.title || "Holiday",
            day: item.day || dayName,
            location: item.location || "All",
            type: item.type || "Mandatory",
          };
        });
        setHolidays(processed);
      } else {
        // Store and set default initial holidays if DB empty
        setHolidays(INITIAL_DEFAULT_HOLIDAYS);
      }
    } catch (err) {
      console.warn("Failed to load holidays from API, using defaults:", err);
      setHolidays(INITIAL_DEFAULT_HOLIDAYS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map of holiday dates YYYY-MM-DD -> list of holidays
  const holidaysByDateMap = useMemo(() => {
    const map = {};
    holidays.forEach((h) => {
      const dateKey = h.date ? h.date.split("T")[0] : "";
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(h);
      }
    });
    return map;
  }, [holidays]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return holidaysByDateMap[selectedDate] || [];
  }, [holidaysByDateMap, selectedDate]);

  // Filtered Holiday Table Rows
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchSearch =
        !searchTerm ||
        (h.name && h.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.date && h.date.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.location && h.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.type && h.type.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchLocation =
        locationFilter === "All" ||
        (h.location && (h.location === locationFilter || h.location === "All"));

      const matchType =
        typeFilter === "All" ||
        (h.type && h.type.toLowerCase().includes(typeFilter.toLowerCase()));

      return matchSearch && matchLocation && matchType;
    });
  }, [holidays, searchTerm, locationFilter, typeFilter]);

  // Handle Excel/CSV File Parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });

        const parsed = data
          .map((row, idx) => {
            const name = row["Holiday"] || row["Holiday Name"] || row["Name"] || row["Title"] || row["TITLE"];
            const dateVal = row["Date"] || row["DATE"] || row["date"];
            if (!name || !dateVal) return null;

            let formattedDate = String(dateVal).trim();
            try {
              const d = new Date(dateVal);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().split("T")[0];
              }
            } catch (_) {}

            const dObj = new Date(formattedDate);
            const dayName = !isNaN(dObj.getTime())
              ? dObj.toLocaleDateString("en-US", { weekday: "long" })
              : "Thursday";

            return {
              id: `IMP-${idx}-${Date.now()}`,
              name: String(name).trim(),
              date: formattedDate,
              day: dayName,
              location: String(row["Location"] || row["LOCATION"] || "All").trim(),
              type: String(row["Type"] || row["TYPE"] || "Mandatory").trim(),
              description: String(row["Description"] || row["Note"] || "").trim(),
            };
          })
          .filter(Boolean);

        setPreviewRows(parsed);
        showToast(`Parsed ${parsed.length} holidays from ${file.name}`, "success");
      } catch (err) {
        showToast("Error parsing Excel/CSV file: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Excel Upload to API
  const handleConfirmImport = async () => {
    if (previewRows.length === 0) {
      showToast("No valid rows to import!", "error");
      return;
    }

    setIsUploading(true);
    try {
      await holidaysAPI.uploadExcelHolidays(previewRows);
      showToast(`🎉 Successfully imported ${previewRows.length} holidays & notified all employees!`, "success");
      setShowUploadModal(false);
      setUploadFile(null);
      setPreviewRows([]);
      loadHolidays();
    } catch (err) {
      showToast("Notice: Local import applied.", "info");
      setHolidays((prev) => [...previewRows, ...prev]);
      setShowUploadModal(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadSample = () => {
    const sampleData = [
      { "Holiday Name": "New Year Day", Date: "2027-01-01", Location: "All", Type: "Festival", Description: "New Year Celebration" },
      { "Holiday Name": "Pongal", Date: "2027-01-14", Location: "All", Type: "Festival", Description: "Harvest Festival" },
      { "Holiday Name": "Election Day", Date: "2027-04-15", Location: "Chennai", Type: "Emergency / Election", Description: "Paid Election Holiday" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays_Template");
    XLSX.writeFile(workbook, "Twite_Holiday_Calendar_Template.xlsx");
  };

  // Submit Ad-Hoc / Emergency Leave
  const handleCreateAdhoc = async (e) => {
    e.preventDefault();
    if (!adhocForm.name.trim() || !adhocForm.date) {
      showToast("Please provide Holiday Title and Date!", "error");
      return;
    }

    const dObj = new Date(adhocForm.date);
    const dayName = !isNaN(dObj.getTime())
      ? dObj.toLocaleDateString("en-US", { weekday: "long" })
      : "Thursday";

    const payload = {
      name: adhocForm.name.trim(),
      date: adhocForm.date,
      day: dayName,
      location: adhocForm.location,
      type: adhocForm.type || "Emergency",
      description: adhocForm.description.trim() || "Declared Emergency Holiday",
      is_emergency: true,
      is_active: true,
    };

    try {
      await holidaysAPI.createAdhocHoliday(payload);
      showToast(`🚨 Emergency Leave '${payload.name}' declared! All employees notified.`, "success");
      setShowAdhocModal(false);
      setAdhocForm({ name: "", date: new Date().toISOString().split("T")[0], location: "All", type: "Emergency", description: "", notify_all: true });
      loadHolidays();
    } catch (err) {
      showToast(`Notice: Additional leave created locally.`, "info");
      setHolidays((prev) => [{ ...payload, id: `ADHOC-${Date.now()}` }, ...prev]);
      setShowAdhocModal(false);
    }
  };

  // Format date display for side panel
  const formatSelectedDateTitle = (dateStr) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${d} ${MONTH_NAMES[mIdx] || ""}`;
      }
    } catch (_) {}
    return dateStr;
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 min-w-0 w-full p-2 sm:p-6 bg-slate-50/50 rounded-2xl border border-slate-200/60 shadow-xs">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold border border-purple-100">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Holiday Calendar</h1>
              <p className="text-xs text-slate-500 font-medium">
                Company declared holidays — excluded from absent day counts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdminOrManager && (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200/80 shadow-2xs active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                Upload Excel / CSV
              </button>

              <button
                onClick={() => setShowAdhocModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Additional / Emergency Leave
              </button>
            </>
          )}

          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Template
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar (Left 2/3) + Selected Day Event Details (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Month Calendar Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
                {MONTH_NAMES[month]} {year}
              </h2>

              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                <button
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center mb-3">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-[11px] font-bold tracking-wider text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Padding empty cells for first week */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-xl bg-transparent" />
              ))}

              {/* Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const monthStr = String(month + 1).padStart(2, "0");
                const dayStr = String(dayNum).padStart(2, "0");
                const dateKey = `${year}-${monthStr}-${dayStr}`;

                const dayHolidays = holidaysByDateMap[dateKey] || [];
                const isSelected = selectedDate === dateKey;

                const hasAllLoc = dayHolidays.some((h) => h.location === "All" || !h.location);
                const hasLocSpecific = dayHolidays.some((h) => h.location && h.location !== "All");
                const hasEmergency = dayHolidays.some((h) => h.is_emergency || h.type?.toLowerCase().includes("emergency"));

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-12 sm:h-14 rounded-xl transition-all relative flex flex-col items-center justify-center p-1 font-semibold text-xs cursor-pointer ${
                      isSelected
                        ? "bg-[#3E3446] text-white shadow-md ring-2 ring-[#3E3446]/30 scale-[1.02]"
                        : dayHolidays.length > 0
                        ? "bg-purple-50/70 hover:bg-purple-100/70 text-slate-900 border border-purple-100"
                        : "bg-slate-50/60 hover:bg-slate-100/80 text-slate-700 border border-slate-100"
                    }`}
                  >
                    <span>{dayNum}</span>

                    {/* Status Dot Indicators matching reference screenshot */}
                    {dayHolidays.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {hasEmergency ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Emergency / Ad-Hoc Leave" />
                        ) : hasAllLoc ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="All Locations" />
                        ) : null}
                        {hasLocSpecific && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Location-specific" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Legend */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>All Locations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Location-specific</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Emergency / Ad-Hoc</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Date Event Preview Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {formatSelectedDateTitle(selectedDate)}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {new Date(selectedDate).getFullYear()}
              </span>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-4 rounded-xl bg-gradient-to-br from-rose-50/80 to-purple-50/60 border border-rose-100 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{evt.name}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          evt.location === "All"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {evt.location}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-white/80 text-rose-700 border border-rose-200/60">
                        {evt.type}
                      </span>
                      {evt.day && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {evt.day}
                        </span>
                      )}
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-rose-100/80">
                        {evt.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium">No events for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Full Holiday List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Holiday List</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
              {filteredHolidays.length} total
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search holidays..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-700"
            >
              <option value="All">All Locations</option>
              <option value="Chennai">Chennai</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Coimbatore">Coimbatore</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-700"
            >
              <option value="All">All Types</option>
              <option value="Festival">Festival</option>
              <option value="National">National</option>
              <option value="Regional">Regional</option>
              <option value="Emergency">Emergency / Ad-Hoc</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-rose-50/40 text-[11px] font-bold text-rose-900 tracking-wider uppercase border-b border-rose-100">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Holiday</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredHolidays.length > 0 ? (
                filteredHolidays.map((item, idx) => {
                  const dObj = new Date(item.date);
                  const formattedDate = !isNaN(dObj.getTime())
                    ? dObj.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                    : item.date;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{formattedDate}</td>
                      <td className="py-3.5 px-4 text-slate-500">{item.day || "—"}</td>
                      <td className="py-3.5 px-4 font-bold text-rose-600 tracking-tight">{item.name}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            item.location === "All"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            item.is_emergency || item.type?.toLowerCase().includes("emergency")
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-purple-100/70 text-purple-800"
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {item.description || "Company Holiday"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No matching holiday records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Modal: Bulk Excel / CSV Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Upload Holiday Excel Sheet</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPreviewRows([]);
                  setUploadFile(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Upload an Excel (.xlsx, .xls) or CSV sheet containing columns:{" "}
              <strong className="text-slate-900">Holiday Name, Date, Location, Type, Description</strong>.
            </p>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <span className="text-xs font-semibold text-emerald-700 hover:underline block">
                  {uploadFile ? uploadFile.name : "Click to browse or drag Excel sheet here"}
                </span>
                <span className="text-[11px] text-slate-400 block">Supports .xlsx, .xls, .csv</span>
              </label>
            </div>

            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Preview ({previewRows.length} holidays detected)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Holiday</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {previewRows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold text-slate-900">{r.date}</td>
                          <td className="p-2 text-rose-600 font-bold">{r.name}</td>
                          <td className="p-2 text-slate-600">{r.location}</td>
                          <td className="p-2 text-slate-600">{r.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setPreviewRows([]);
                  setUploadFile(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={previewRows.length === 0 || isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isUploading ? "Importing..." : `Import ${previewRows.length} Holidays`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Additional / Emergency Leave Declaration */}
      {showAdhocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">Declare Additional / Emergency Leave</h3>
              </div>
              <button
                onClick={() => setShowAdhocModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdhoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday / Reason Title *
                </label>
                <input
                  type="text"
                  required
                  value={adhocForm.name}
                  onChange={(e) => setAdhocForm({ ...adhocForm, name: e.target.value })}
                  placeholder="e.g. Cyclone Alert / Flood Holiday, Election Day, Special Relief"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={adhocForm.date}
                    onChange={(e) => setAdhocForm({ ...adhocForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Scope
                  </label>
                  <select
                    value={adhocForm.location}
                    onChange={(e) => setAdhocForm({ ...adhocForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-medium"
                  >
                    <option value="All">All Locations</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Coimbatore">Coimbatore</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category / Type
                </label>
                <select
                  value={adhocForm.type}
                  onChange={(e) => setAdhocForm({ ...adhocForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-medium"
                >
                  <option value="Emergency">Emergency / Natural Calamity</option>
                  <option value="Election">Election Day</option>
                  <option value="Government Order">Government Declared</option>
                  <option value="Ad-Hoc">Ad-Hoc Special Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note / Description
                </label>
                <textarea
                  rows={3}
                  value={adhocForm.description}
                  onChange={(e) => setAdhocForm({ ...adhocForm, description: e.target.value })}
                  placeholder="Additional guidelines or instructions for employees..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/60 flex items-start gap-2 text-xs text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  All employees will immediately receive a push notification & in-app alert regarding this declared leave!
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdhocModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-xs"
                >
                  Publish & Notify All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
