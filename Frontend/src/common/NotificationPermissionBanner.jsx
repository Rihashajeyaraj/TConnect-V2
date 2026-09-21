import React, { useState, useEffect } from 'react'
import { Bell, X, Check, ShieldAlert } from 'lucide-react'
import authSession from '../utils/authSession.js'
import { registerPushSubscription } from '../utils/webPushManager.js'

export default function NotificationPermissionBanner() {
  const [permission, setPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  })
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    
    // Check permission state on mount and tab focus
    const checkPerm = () => setPermission(Notification.permission)
    checkPerm()
    window.addEventListener('focus', checkPerm)
    return () => window.removeEventListener('focus', checkPerm)
  }, [])

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm === 'granted') {
        const token = authSession.getStoredToken()
        if (token && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          if (reg) {
            await registerPushSubscription(token)
          }
        }
      }
    } catch (err) {
      console.warn('[NotifBanner] Error requesting notification permission:', err)
    } finally {
      setLoading(false)
    }
  }

  if (dismissed || permission === 'granted' || permission === 'denied') return null

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-2.5 shadow-lg border-b border-blue-500/40 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
          <Bell className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide">
            Enable Closed-App Push Notifications
          </p>
          <p className="text-[11px] text-blue-100 font-medium">
            Receive instant alerts when messages arrive, even when TwiteConnect is closed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnableNotifications}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-70"
        >
          {loading ? (
            <span>Enabling...</span>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-blue-700 stroke-[3]" />
              <span>Enable Notifications</span>
            </>
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          title="Dismiss for now"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
