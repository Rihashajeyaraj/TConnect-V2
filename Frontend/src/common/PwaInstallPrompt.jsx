import React, { useState, useEffect } from 'react'
import { Download, X, Laptop, Check } from 'lucide-react'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent standard mini-infobar on mobile
      e.preventDefault()
      // Store event for trigger
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('[PWA] TwiteConnect app installed successfully!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] User choice outcome: ${outcome}`)
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30">
            <Laptop size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-100">Install TwiteConnect App</h4>
            <p className="text-[11px] text-slate-400 font-medium">Install on desktop/mobile for fast 1-click access</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-800">
        <button
          onClick={() => setShowPrompt(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
        >
          Not now
        </button>
        <button
          onClick={handleInstallClick}
          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
        >
          <Download size={14} />
          <span>Install App</span>
        </button>
      </div>
    </div>
  )
}
