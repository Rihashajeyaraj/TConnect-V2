import React from 'react'
import { Calendar as CalendarIcon, Clock, MapPin, UserCheck } from 'lucide-react'

const CALENDAR_EVENTS = []

export default function ManagerCalendar() {
  return (
    <div className="space-y-6 font-sans text-slate-900">
      <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-teal-600" /> Team Calendar, Field Visits & Leave Schedule
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Integrated schedule for client meetings, field visits, executive follow-ups, leave requests, and company holidays.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CALENDAR_EVENTS.map((event) => (
          <div key={event.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">{event.title}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200">
                {event.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
              <span>📅 {event.date}</span>
              <span>⏰ {event.time}</span>
              <span>👤 Assignee: {event.host}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
