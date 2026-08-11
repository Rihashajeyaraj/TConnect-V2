import React, { useState } from 'react'
import { Calendar, Filter, X, Check, RotateCcw } from 'lucide-react'
import { formatDate } from '../utils/dateUtils.js'

/**
 * Reusable Global Date Range Filter Component
 * Supports: 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'
 * Custom mode allows [Start Date] [End Date] [Apply] [Clear]
 */
export default function DateRangeFilter({
  selectedMode = 'This Month',
  onChangeMode = () => {},
  customStartDate = '',
  customEndDate = '',
  onApplyCustom = () => {},
  onClear = () => {},
  className = '',
}) {
  const [tempStart, setTempStart] = useState(customStartDate)
  const [tempEnd, setTempEnd] = useState(customEndDate)
  const [isCustomOpen, setIsCustomOpen] = useState(selectedMode === 'Custom')

  const modes = ['Today', 'This Week', 'This Month', 'Custom']

  const handleSelectMode = (mode) => {
    if (mode === 'Custom') {
      setIsCustomOpen(true)
      onChangeMode('Custom')
    } else {
      setIsCustomOpen(false)
      onChangeMode(mode)
    }
  }

  const handleApply = (e) => {
    e?.preventDefault()
    onApplyCustom(tempStart, tempEnd)
  }

  const handleClearClick = () => {
    setTempStart('')
    setTempEnd('')
    setIsCustomOpen(false)
    onClear()
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${className}`}>
      {/* Quick Pills */}
      <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-2xs">
        {modes.map((m) => {
          const active = selectedMode === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectMode(m)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-xs font-extrabold flex items-center gap-1 ${
                active
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {m === 'Custom' && <Calendar size={13} />}
              {m}
            </button>
          )
        })}
      </div>

      {/* Custom Date Range Popover / Inline Box */}
      {(selectedMode === 'Custom' || isCustomOpen) && (
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-amber-300 rounded-2xl shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1.5">From:</span>
            <input
              type="date"
              value={tempStart}
              onChange={(e) => setTempStart(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={tempEnd}
              onChange={(e) => setTempEnd(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
          >
            <Check size={13} /> Apply
          </button>
        </div>
      )}

      {/* Clear Button */}
      {selectedMode !== 'This Month' && (
        <button
          type="button"
          onClick={handleClearClick}
          className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-extrabold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
          title="Reset to default date range"
        >
          <RotateCcw size={12} /> Clear
        </button>
      )}
    </div>
  )
}
