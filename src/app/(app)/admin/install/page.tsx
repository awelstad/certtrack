'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Smartphone, Share, MoreVertical, PlusSquare, CheckCircle } from 'lucide-react'

export default function InstallPage() {
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const prompt = (window as Window & { __pwaPrompt?: Event }).__pwaPrompt
    if (prompt) setCanInstall(true)

    const handler = (e: Event) => {
      e.preventDefault()
      ;(window as Window & { __pwaPrompt?: Event }).__pwaPrompt = e
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handleInstall() {
    const prompt = (window as Window & { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt as BeforeInstallPromptEvent | undefined
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Install App"
        description="Add Clearwork to your phone's home screen for quick access."
      />

      <div className="mt-6 max-w-xl space-y-4">
        {installed && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">Clearwork has been installed!</p>
          </div>
        )}

        {/* Android */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Smartphone className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Android</h2>
          </div>

          {canInstall && !installed ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Your browser is ready to install Clearwork. Tap the button below to add it to your home screen.
              </p>
              <button
                onClick={handleInstall}
                className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Install Clearwork
              </button>
            </div>
          ) : (
            <ol className="space-y-3">
              <Step number={1} icon={<MoreVertical className="h-4 w-4" />}>
                Tap the <strong>three-dot menu</strong> in the top-right corner of Chrome
              </Step>
              <Step number={2} icon={<PlusSquare className="h-4 w-4" />}>
                Tap <strong>"Add to Home screen"</strong>
              </Step>
              <Step number={3} icon={<CheckCircle className="h-4 w-4" />}>
                Tap <strong>"Add"</strong> — Clearwork will appear on your home screen like any other app
              </Step>
            </ol>
          )}
        </div>

        {/* iOS */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Smartphone className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">iPhone / iPad</h2>
          </div>

          {isIos && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs font-medium text-blue-700">You&apos;re on an iOS device — follow these steps in Safari</p>
            </div>
          )}

          <ol className="space-y-3">
            <Step number={1} icon={<Share className="h-4 w-4" />}>
              Open this page in <strong>Safari</strong>, then tap the <strong>Share</strong> button at the bottom of the screen
            </Step>
            <Step number={2} icon={<PlusSquare className="h-4 w-4" />}>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </Step>
            <Step number={3} icon={<CheckCircle className="h-4 w-4" />}>
              Tap <strong>"Add"</strong> in the top-right — Clearwork will appear on your home screen
            </Step>
          </ol>

          {!isIos && (
            <p className="mt-4 text-xs text-slate-400">
              Note: iPhone install must be done from the Safari browser, not Chrome or Firefox.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
        {number}
      </div>
      <div className="flex items-start gap-2 text-sm text-slate-700">
        <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
        <span>{children}</span>
      </div>
    </li>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
