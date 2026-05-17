'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { logAttendance } from '@/app/actions/attendance'
import { ScanLine, CheckCircle2, LogOut, Users } from 'lucide-react'

type ScanState = 'idle' | 'processing' | 'checkin' | 'checkout' | 'error'

interface RecentScan {
  id: number
  name: string
  event: 'check_in' | 'check_out'
  time: Date
  photo: string | null
  trade: string | null
}

interface Props {
  jobId: string
  jobName: string
  orgName: string
  logoUrl: string | null
  brandColor: string
  initialOnSiteCount: number
  initialRecentScans: {
    name: string
    event: 'check_in' | 'check_out'
    time: string
    photo: string | null
    trade: string | null
  }[]
}

const BG: Record<ScanState, string> = {
  idle:       '#0f172a',
  processing: '#0f172a',
  checkin:    '#15803d',
  checkout:   '#b45309',
  error:      '#b91c1c',
}

export function KioskScanner({
  jobId,
  jobName,
  orgName,
  logoUrl,
  initialOnSiteCount,
  initialRecentScans,
}: Props) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)
  const scanIdRef   = useRef(0)

  const [scanState,  setScanState]  = useState<ScanState>('idle')
  const [lastWorker, setLastWorker] = useState<{ name: string; photo: string | null; trade: string | null } | null>(null)
  const [scanTime,   setScanTime]   = useState<Date | null>(null)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [onSiteCount, setOnSiteCount] = useState(initialOnSiteCount)
  const [recentScans, setRecentScans] = useState<RecentScan[]>(
    initialRecentScans.map((s, i) => ({ ...s, id: i, time: new Date(s.time) }))
  )
  const [now, setNow] = useState(new Date())

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Re-focus hidden input on any tap/click
  const refocus = useCallback(() => inputRef.current?.focus(), [])
  useEffect(() => {
    document.addEventListener('touchstart', refocus)
    document.addEventListener('click', refocus)
    return () => {
      document.removeEventListener('touchstart', refocus)
      document.removeEventListener('click', refocus)
    }
  }, [refocus])

  // Auto-reset to idle after 3 s
  useEffect(() => {
    if (scanState === 'idle' || scanState === 'processing') return
    const t = setTimeout(() => {
      setScanState('idle')
      setLastWorker(null)
      setErrorMsg('')
      setScanTime(null)
      inputRef.current?.focus()
    }, 3500)
    return () => clearTimeout(t)
  }, [scanState])

  async function handleScan(raw: string) {
    if (processingRef.current) return
    processingRef.current = true

    // Parse public_id from full URL or treat as raw public_id
    const match = raw.match(/\/qr\/([^/?#\s]+)/)
    const publicId = match?.[1] ?? raw

    setScanState('processing')

    const result = await logAttendance(publicId, jobId)

    processingRef.current = false

    if (result.error) {
      setScanState('error')
      setErrorMsg(result.error)
      return
    }

    const ts = new Date()
    setScanTime(ts)
    setLastWorker(result.worker!)
    setScanState(result.event === 'check_in' ? 'checkin' : 'checkout')
    setOnSiteCount((prev) =>
      result.event === 'check_in' ? prev + 1 : Math.max(0, prev - 1)
    )
    setRecentScans((prev) => {
      const next: RecentScan = {
        id:    ++scanIdRef.current,
        name:  result.worker!.name,
        event: result.event!,
        time:  ts,
        photo: result.worker!.photo,
        trade: result.worker!.trade,
      }
      return [next, ...prev].slice(0, 8)
    })
  }

  const bgColor = BG[scanState]

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="relative flex min-h-screen flex-col select-none"
      style={{ backgroundColor: bgColor, transition: 'background-color 0.5s ease' }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="h-8 object-contain" />
          ) : (
            <span className="text-lg font-bold text-white">{orgName}</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-white/50">{jobName}</p>
          <p className="font-mono text-2xl font-bold text-white">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </header>

      {/* ── Main area ────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">

        {/* IDLE */}
        {scanState === 'idle' && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 animate-ping rounded-full bg-white/10" />
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white/10">
                <ScanLine className="h-16 w-16 text-white/80" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white">Scan your QR code</p>
            <p className="mt-3 text-lg text-white/50">Hold your helmet badge up to the scanner</p>
            <div className="mt-8 flex items-center gap-2.5 rounded-full bg-white/10 px-6 py-3">
              <Users className="h-5 w-5 text-white/60" />
              <span className="text-lg font-semibold text-white">
                {onSiteCount} worker{onSiteCount !== 1 ? 's' : ''} on site today
              </span>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {scanState === 'processing' && (
          <div className="flex flex-col items-center gap-5">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-2xl font-semibold text-white">Checking in…</p>
          </div>
        )}

        {/* CHECK IN / CHECK OUT */}
        {(scanState === 'checkin' || scanState === 'checkout') && lastWorker && (
          <div className="flex flex-col items-center text-center">
            {lastWorker.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastWorker.photo}
                alt={lastWorker.name}
                className="mb-6 h-32 w-32 rounded-full border-4 border-white/30 object-cover shadow-2xl"
              />
            ) : (
              <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-5xl font-bold text-white shadow-2xl">
                {initials(lastWorker.name)}
              </div>
            )}

            <p className="text-5xl font-bold text-white leading-tight">{lastWorker.name}</p>
            {lastWorker.trade && (
              <p className="mt-2 text-xl text-white/60">{lastWorker.trade}</p>
            )}

            <div className="mt-7 flex items-center gap-3 rounded-full bg-white/20 px-10 py-4 shadow-lg">
              {scanState === 'checkin' ? (
                <>
                  <CheckCircle2 className="h-7 w-7 text-white" />
                  <span className="text-3xl font-bold text-white">Checked In</span>
                </>
              ) : (
                <>
                  <LogOut className="h-7 w-7 text-white" />
                  <span className="text-3xl font-bold text-white">Checked Out</span>
                </>
              )}
            </div>

            {scanTime && (
              <p className="mt-4 text-lg text-white/50">
                {scanTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* ERROR */}
        {scanState === 'error' && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/20 text-6xl">
              ⚠
            </div>
            <p className="text-4xl font-bold text-white">Not Found</p>
            <p className="mt-3 max-w-sm text-xl text-white/60">{errorMsg}</p>
          </div>
        )}
      </main>

      {/* ── Recent scans (only when idle) ────────────────── */}
      {scanState === 'idle' && recentScans.length > 0 && (
        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
            Recent scans
          </p>
          <ul className="space-y-2">
            {recentScans.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                {s.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo} className="h-8 w-8 rounded-full object-cover opacity-60" alt="" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/50">
                    {initials(s.name)}
                  </div>
                )}
                <span className="flex-1 text-sm font-medium text-white/60 truncate">{s.name}</span>
                {s.trade && <span className="hidden text-xs text-white/30 sm:block truncate max-w-[120px]">{s.trade}</span>}
                <span className={`shrink-0 text-xs font-bold ${s.event === 'check_in' ? 'text-green-400' : 'text-amber-400'}`}>
                  {s.event === 'check_in' ? 'IN' : 'OUT'}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-white/30">
                  {s.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Hidden always-focused scan input ─────────────── */}
      <input
        ref={inputRef}
        autoFocus
        inputMode="none"
        className="sr-only"
        aria-hidden="true"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = e.currentTarget.value.trim()
            e.currentTarget.value = ''
            if (val) handleScan(val)
          }
        }}
      />
    </div>
  )
}
