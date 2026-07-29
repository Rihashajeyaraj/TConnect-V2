const paths = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V9" />
      <path d="M9 19V5" />
      <path d="M14 19v-7" />
      <path d="M19 19V8" />
      <path d="M3 19h18" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.9" />
      <path d="M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1 0 2-.2 2.8-.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m10.8 7.2-3.6 8.6M13.2 7.2l3.6 8.6M8.5 18h7" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 .7 2.3A5.8 5.8 0 0 0 16.6 9l2.4.7-2.4.7a5.8 5.8 0 0 0-3.9 3.7L12 16.5l-.7-2.4a5.8 5.8 0 0 0-3.9-3.7L5 9.7 7.4 9a5.8 5.8 0 0 0 3.9-3.7L12 3Z" />
      <path d="m18.5 15 .4 1.2a3.1 3.1 0 0 0 1.9 1.9l1.2.4-1.2.4a3.1 3.1 0 0 0-1.9 1.9l-.4 1.2-.4-1.2a3.1 3.1 0 0 0-1.9-1.9l-1.2-.4 1.2-.4a3.1 3.1 0 0 0 1.9-1.9l.4-1.2Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13a5.5 5.5 0 0 1 5.5 5.5V20" />
      <path d="M15 5.3a3 3 0 0 1 0 5.4M16.5 13.4a5.5 5.5 0 0 1 4 5.3V20" />
    </>
  ),
}

function Icon({ name, className = 'size-5', strokeWidth = 1.8 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export default Icon
