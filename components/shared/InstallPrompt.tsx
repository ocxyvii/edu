'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'educore-install-prompt-dismissed'
const VISIT_KEY = 'educore-visit-count'

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isStandaloneCheck = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(isStandaloneCheck)
    if (isStandaloneCheck) return

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)

    if (isIOS) setPlatform('ios')
    else if (isAndroid) setPlatform('android')
    else setPlatform('desktop')

    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed && Date.now() - parseInt(dismissed) < 30 * 24 * 60 * 60 * 1000) {
      return
    }

    const visitCount = parseInt(localStorage.getItem(VISIT_KEY) ?? '0')
    localStorage.setItem(VISIT_KEY, String(visitCount + 1))

    if (visitCount >= 2) {
      if (!isIOS) {
        setShow(true)
      } else {
        setTimeout(() => setShow(true), 3000)
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!isIOS) {
        setShow(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null)
        setShow(false)
      })
    }
    if (platform === 'ios') {
      setShow(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setShow(false)
  }

  if (isStandalone || typeof window === 'undefined') return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-80"
        >
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-edu-blue-100">
                  <Download className="h-5 w-5 text-edu-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Install EduCore</p>
                  <p className="text-xs text-gray-500">Add to your home screen for quick access</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {platform === 'ios' && !deferredPrompt && (
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                <p>1. Tap the <strong>Share</strong> button in Safari</p>
                <p>2. Scroll down and tap <strong>Add to Home Screen</strong></p>
                <p>3. Tap <strong>Add</strong></p>
              </div>
            )}

            {deferredPrompt && (
              <Button onClick={handleInstall} size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            )}

            {platform === 'ios' && !deferredPrompt && (
              <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full">
                Got it
              </Button>
            )}

            {platform === 'android' && !deferredPrompt && (
              <div className="text-xs text-gray-500 mb-3">
                <p>Tap the Install button that appears in your browser</p>
                <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full mt-2">
                  Dismiss
                </Button>
              </div>
            )}

            {platform === 'desktop' && !deferredPrompt && (
              <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full">
                Got it
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
