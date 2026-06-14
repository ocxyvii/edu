'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'
import { getQueueCount } from '@/lib/offline-queue'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      setPendingCount(0)
    }

    function handleOffline() {
      setIsOffline(true)
      updatePendingCount()
    }

    setIsOffline(!navigator.onLine)
    if (!navigator.onLine) updatePendingCount()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function updatePendingCount() {
    try {
      const count = await getQueueCount()
      setPendingCount(count)
    } catch {}
  }

  async function handleRetry() {
    if (navigator.onLine) {
      setIsOffline(false)
      setPendingCount(0)
    }
  }

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[60]"
        >
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md">
            <WifiOff className="h-4 w-4" />
            <span>You are offline</span>
            {pendingCount > 0 && (
              <span className="ml-1">
                &middot; {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleRetry}
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
