import React from 'react'

export default function TwiteConnectLogo({ className = "w-9 h-9", showText = true, textClassName = "text-blue-950 font-black text-lg tracking-tight" }) {
  return (
    <div className="flex items-center gap-2.5 inline-flex select-none">
      {/* TwiteConnect Handshake + Wi-Fi Circular Emblem */}
      <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="twiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>

        {/* Outer Circular Swoop */}
        <path
          d="M 15,50 A 35,35 0 1,0 85,50 A 35,35 0 0,0 15,50"
          stroke="url(#twiteGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Wi-Fi Signal Arcs at Top */}
        <path d="M 40,24 A 12,12 0 0,1 60,24" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 44,28 A 7,7 0 0,1 56,28" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="32" r="2" fill="#0284C7" />

        {/* Left Person Head & Body (Cyan/Light Blue) */}
        <circle cx="41" cy="42" r="6.5" fill="#0284C7" />
        <path
          d="M 31,65 C 31,52 40,52 46,55 C 47,56 46,60 41,63 C 36,66 31,65 31,65 Z"
          fill="#0284C7"
        />

        {/* Right Person Head & Body (Deep Blue) */}
        <circle cx="59" cy="42" r="6.5" fill="#1E3A8A" />
        <path
          d="M 69,65 C 69,52 60,52 54,55 C 53,56 54,60 59,63 C 64,66 69,65 69,65 Z"
          fill="#1E3A8A"
        />

        {/* Handshake Center Arc */}
        <path
          d="M 43,58 Q 50,65 57,58"
          stroke="#2563EB"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Brand Name Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={textClassName}>TwiteConnect</span>
          <span className="text-[9px] text-amber-700 font-extrabold tracking-widest uppercase mt-0.5">
            Connect • Track • Perform
          </span>
        </div>
      )}
    </div>
  )
}
