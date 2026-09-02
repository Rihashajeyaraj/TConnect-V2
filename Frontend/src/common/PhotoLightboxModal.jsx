import React from 'react'
import { X, Download, User } from 'lucide-react'

export default function PhotoLightboxModal({ photoUrl, name, role, onClose }) {
  if (!photoUrl) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = photoUrl
    a.download = `${(name || 'employee').replace(/\s+/g, '_')}_profile_photo.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
    >
      {/* Header Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl flex items-center justify-between text-white pb-4 px-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-extrabold text-sm">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-100">{name || 'Profile Photo'}</h3>
            {role && <p className="text-xs text-slate-400 font-medium">{role}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer border border-slate-700"
            title="Download Profile Photo"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Expanded Photo Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg max-h-[75vh] w-full rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-900 flex items-center justify-center p-2"
      >
        <img
          src={photoUrl}
          alt={name || 'Profile'}
          className="w-full h-full max-h-[70vh] object-contain rounded-2xl animate-in zoom-in-95 duration-200"
        />
      </div>

      <p className="text-slate-400 text-xs font-medium pt-4">Click anywhere outside to close</p>
    </div>
  )
}
