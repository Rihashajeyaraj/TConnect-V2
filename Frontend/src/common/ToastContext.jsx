import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 max-sm:bottom-auto max-sm:top-20 max-sm:right-4 max-sm:left-4 z-[9999] flex flex-col gap-2 w-auto max-w-sm pointer-events-none">
        {toasts.map((t) => {
          let bg, border, icon, text
          switch (t.type) {
            case 'success':
              bg = 'bg-emerald-50/95 backdrop-blur-md'
              border = 'border-emerald-200'
              icon = <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              text = 'text-emerald-900'
              break
            case 'error':
              bg = 'bg-rose-50/95 backdrop-blur-md'
              border = 'border-rose-200'
              icon = <AlertCircle className="size-5 text-rose-600 shrink-0" />
              text = 'text-rose-900'
              break
            case 'warning':
              bg = 'bg-amber-50/95 backdrop-blur-md'
              border = 'border-amber-200'
              icon = <AlertTriangle className="size-5 text-amber-600 shrink-0" />
              text = 'text-amber-900'
              break
            default: // info
              bg = 'bg-blue-50/95 backdrop-blur-md'
              border = 'border-blue-200'
              icon = <Info className="size-5 text-blue-600 shrink-0" />
              text = 'text-blue-900'
          }

          return (
            <div
              key={t.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-3 shadow-xl ${bg} ${border} pointer-events-auto animate-in max-sm:slide-in-from-top-5 sm:slide-in-from-bottom-5 fade-in duration-300`}
            >
              <div className="flex gap-2.5">
                {icon}
                <p className={`text-xs font-semibold leading-relaxed ${text}`}>{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition shrink-0"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return { showToast: (msg, type) => console.log(`[Toast ${type || 'info'}]:`, msg) }
  }
  return context
}
