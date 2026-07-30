import { useId } from 'react'

function BrandMark({ compact = false, onDark = false }) {
  const gradientId = useId()

  return (
    <div className="flex items-center gap-3">
      <span
        className={`brand-mark-badge grid shrink-0 place-items-center rounded-2xl border shadow-lg backdrop-blur ${
          onDark
            ? 'border-violet-400/30 bg-violet-500/10 shadow-violet-950/30'
            : 'border-white/70 bg-white/90 shadow-slate-900/10'
        } ${
          compact ? 'size-11' : 'size-14'
        }`}
        aria-hidden="true"
      >
        <svg
          className={compact ? 'size-7' : 'size-9'}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.8 6.5h18.4c1.4 0 2.2 1.6 1.4 2.7l-6.2 8.1h4.1c1.5 0 2.2 1.8 1.2 2.8L15.1 32c-1.2 1.1-3.1 0-2.7-1.6l2.3-9H8.9c-1.3 0-2.1-1.5-1.4-2.6l4.8-7.1H8.8c-1.4 0-2.2-1.7-1.3-2.8l.1-.1c.3-.4.7-.7 1.2-.7V6.5Z"
            fill={`url(#${gradientId})`}
          />
          <defs>
            <linearGradient
              id={gradientId}
              x1="6"
              y1="5"
              x2="31"
              y2="31"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6D28D9" />
              <stop offset=".5" stopColor="#9D25FF" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      <div>
        <p
          className={`brand-mark-title m-0 font-black tracking-[-0.04em] ${
            onDark ? 'text-white' : 'text-slate-950'
          } ${
            compact ? 'text-xl' : 'text-2xl'
          }`}
        >
          Twite <span className="text-violet-600">Connect</span>
        </p>
        {!compact && (
          <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-slate-700">
            Sell intelligently · AI-powered sales platform
          </p>
        )}
      </div>
    </div>
  )
}

export default BrandMark
