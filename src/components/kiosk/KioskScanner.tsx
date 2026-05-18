'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { logAttendance } from '@/app/actions/attendance'
import { confirmJobTransfer } from '@/app/actions/jobWorkers'
import { ScanLine, CheckCircle2, LogOut, Users, ShieldCheck, ShieldAlert, ShieldX, Clock, ClipboardCheck, ArrowRightLeft } from 'lucide-react'

type ScanState = 'idle' | 'processing' | 'checkin' | 'checkout' | 'error'
type Compliance = 'green' | 'yellow' | 'red' | 'gray'

interface RecentScan {
  id: number
  workerId: string
  name: string
  event: 'check_in' | 'check_out'
  time: Date
  photo: string | null
  trade: string | null
  orientationOk: boolean
  jhaOk: boolean
  compliance: Compliance
}

interface TransferPending {
  workerId: string
  prevJobId: string
  prevJobName: string
  workerName: string
  photo: string | null
}

interface Props {
  jobId: string
  jobName: string
  orgName: string
  logoUrl: string | null
  brandColor: string
  initialOnSiteCount: number
  initialRecentScans: {
    workerId: string
    name: string
    event: 'check_in' | 'check_out'
    time: string
    photo: string | null
    trade: string | null
    orientationOk: boolean
    jhaOk: boolean
    compliance: Compliance
  }[]
}

const BG: Record<ScanState, string> = {
  idle:       '#0f172a',
  processing: '#0f172a',
  checkin:    '#15803d',
  checkout:   '#92400e',
  error:      '#991b1b',
}

function ComplianceBadge({ status }: { status: Compliance }) {
  const cfg = {
    green:  { Icon: ShieldCheck,  label: 'Cleared',          cls: 'bg-white/20 text-white' },
    yellow: { Icon: ShieldAlert,  label: 'Expiring Soon',    cls: 'bg-yellow-400/30 text-yellow-100' },
    red:    { Icon: ShieldX,      label: 'Not Cleared',      cls: 'bg-red-400/30 text-red-100' },
    gray:   { Icon: Clock,        label: 'No Certs on File', cls: 'bg-white/10 text-white/60' },
  }[status]

  return (
    <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold ${cfg.cls}`}>
      <cfg.Icon className="h-4 w-4" />
      {cfg.label}
    </div>
  )
}

function StatusDots({ orientationOk, jhaOk, compliance }: { orientationOk: boolean; jhaOk: boolean; compliance: Compliance }) {
  return (
    <div className="flex items-center gap-1.5">
      <span title={orientationOk ? 'Orientation passed' : 'No orientation'}>
        {orientationOk
          ? <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
          : <ShieldX className="h-3.5 w-3.5 text-red-400" />
        }
      </span>
      <span title={jhaOk ? 'JHA signed today' : 'No JHA today'}>
        <ClipboardCheck className={`h-3.5 w-3.5 ${jhaOk ? 'text-green-400' : 'text-slate-600'}`} />
      </span>
      <span title={`Cert status: ${compliance}`}>
        {compliance === 'green'  && <ShieldCheck className="h-3.5 w-3.5 text-green-400" />}
        {compliance === 'yellow' && <ShieldAlert className="h-3.5 w-3.5 text-yellow-400" />}
        {compliance === 'red'   && <ShieldX className="h-3.5 w-3.5 text-red-400" />}
        {compliance === 'gray'  && <Clock className="h-3.5 w-3.5 text-slate-600" />}
      </span>
    </div>
  )
}

export function KioskScanner({
  jobId,
  jobName,
  orgName,
  logoUrl,
  initialOnSiteCount,
  initialRecentScans,
}: Props) {
  const router        = useRouter()
  const inputRef      = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)
  const scanIdRef     = useRef(0)

  const [scanState,      setScanState]      = useState<ScanState>('idle')
  const [lastWorker,     setLastWorker]     = useState<{ name: string; photo: string | null; trade: string | null } | null>(null)
  const [scanTime,       setScanTime]       = useState<Date | null>(null)
  const [compliance,     setCompliance]     = useState<Compliance>('gray')
  const [timeOnSite,     setTimeOnSite]     = useState<string | null>(null)
  const [errorMsg,       setErrorMsg]       = useState('')
  const [onSiteCount,    setOnSiteCount]    = useState(initialOnSiteCount)
  const [recentScans,    setRecentScans]    = useState<RecentScan[]>(
    initialRecentScans.map((s, i) => ({ ...s, id: i, time: new Date(s.time) }))
  )
  const [now,            setNow]            = useState(new Date())
  const [transferPending, setTransferPending] = useState<TransferPending | null>(null)
  const [transferring,   setTransferring]   = useState(false)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-refresh server data every 60 seconds
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60_000)
    return () => clearInterval(t)
  }, [router])

  // Sync props after refresh
  useEffect(() => {
    setOnSiteCount(initialOnSiteCount)
    setRecentScans(initialRecentScans.map((s, i) => ({ ...s, id: i, time: new Date(s.time) })))
  }, [initialOnSiteCount, initialRecentScans])

  const refocus = useCallback(() => {
    // Don't steal focus while transfer modal is open
    if (!transferPending) inputRef.current?.focus()
  }, [transferPending])

  useEffect(() => {
    document.addEventListener('touchstart', refocus)
    document.addEventListener('click', refocus)
    return () => {
      document.removeEventListener('touchstart', refocus)
      document.removeEventListener('click', refocus)
    }
  }, [refocus])

  // Auto-dismiss result card — paused while transfer modal is showing
  useEffect(() => {
    if (scanState === 'idle' || scanState === 'processing') return
    if (transferPending) return
    const t = setTimeout(() => {
      setScanState('idle')
      setLastWorker(null)
      setScanTime(null)
      setTimeOnSite(null)
      setErrorMsg('')
      inputRef.current?.focus()
    }, 4000)
    return () => clearTimeout(t)
  }, [scanState, transferPending])

  async function handleScan(raw: string) {
    if (processingRef.current) return
    processingRef.current = true

    const match    = raw.match(/\/qr\/([^/?#\s]+)/)
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
    setCompliance(result.compliance ?? 'gray')
    setTimeOnSite(result.timeOnSite ?? null)
    setScanState(result.event === 'check_in' ? 'checkin' : 'checkout')
    setOnSiteCount((prev) =>
      result.event === 'check_in' ? prev + 1 : Math.max(0, prev - 1)
    )
    setRecentScans((prev) => [{
      id:            ++scanIdRef.current,
      workerId:      result.workerId ?? '',
      name:          result.worker!.name,
      event:         result.event!,
      time:          ts,
      photo:         result.worker!.photo,
      trade:         result.worker!.trade,
      orientationOk: false,
      jhaOk:         false,
      compliance:    result.compliance ?? 'gray',
    }, ...prev].slice(0, 8))

    // Show transfer modal if worker is assigned to a different job
    if (result.isNewToJob && result.previousJobId && result.workerId) {
      setTransferPending({
        workerId:    result.workerId,
        prevJobId:   result.previousJobId,
        prevJobName: result.previousJobName ?? 'another site',
        workerName:  result.worker!.name,
        photo:       result.worker!.photo,
      })
    }
  }

  async function handleConfirmTransfer() {
    if (!transferPending) return
    setTransferring(true)
    await confirmJobTransfer({
      workerId:  transferPending.workerId,
      fromJobId: transferPending.prevJobId,
      toJobId:   jobId,
    })
    setTransferring(false)
    setTransferPending(null)
    // Now let the normal 4s dismiss run
  }

  function handleSkipTransfer() {
    setTransferPending(null)
  }

  const bgColor  = BG[scanState]
  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="relative flex min-h-screen flex-col select-none"
      style={{ backgroundColor: bgColor, transition: 'background-color 0.4s ease' }}
    >
      {/* ── Transfer confirmation modal ───────────────── */}
      {transferPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-white/10 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex items-center gap-3">
              <ArrowRightLeft className="h-6 w-6 text-white shrink-0" />
              <div>
                <p className="font-black text-white text-lg leading-tight">Job Transfer</p>
                <p className="text-blue-200 text-sm">Confirm roster update</p>
              </div>
            </div>

            {/* Worker */}
            <div className="px-6 py-5 flex flex-col items-center text-center">
              {transferPending.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={transferPending.photo} alt={transferPending.workerName}
                  className="h-20 w-20 rounded-full object-cover border-4 border-white/20 mb-3" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black text-white border-4 border-white/20 mb-3">
                  {initials(transferPending.workerName)}
                </div>
              )}
              <p className="text-2xl font-bold text-white">{transferPending.workerName}</p>

              <div className="mt-4 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-left space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Currently assigned to</span>
                  <span className="font-semibold text-red-300">{transferPending.prevJobName}</span>
                </div>
                <div className="border-t border-white/10" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Transfer to</span>
                  <span className="font-semibold text-green-300">{jobName}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-3">
              <button
                onClick={handleConfirmTransfer}
                disabled={transferring}
                className="w-full rounded-xl bg-green-500 py-4 text-lg font-black text-white hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {transferring ? 'Transferring…' : 'Yes, Transfer'}
              </button>
              <button
                onClick={handleSkipTransfer}
                className="w-full rounded-xl bg-white/10 py-3 text-base font-semibold text-white/70 hover:bg-white/20 transition-colors"
              >
                Skip — just visiting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between px-6 py-4">
        <div>
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

      {/* ── Main ───────────────────────────────────────── */}
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

            <a
              href={`/kiosk/${jobId}/workers`}
              className="mt-8 flex items-center gap-2.5 rounded-full bg-white/10 px-6 py-3 hover:bg-white/20 transition-colors"
            >
              <Users className="h-5 w-5 text-white/60" />
              <span className="text-lg font-semibold text-white">
                {onSiteCount} worker{onSiteCount !== 1 ? 's' : ''} on site today
              </span>
            </a>
          </div>
        )}

        {/* PROCESSING */}
        {scanState === 'processing' && (
          <div className="flex flex-col items-center gap-5">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-2xl font-semibold text-white">Looking up worker…</p>
          </div>
        )}

        {/* CHECK IN */}
        {scanState === 'checkin' && lastWorker && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/20 px-8 py-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
              <span className="text-4xl font-black tracking-wide text-white">CHECKED IN</span>
            </div>

            {lastWorker.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastWorker.photo}
                alt={lastWorker.name}
                className="mb-5 h-28 w-28 rounded-full border-4 border-white/30 object-cover shadow-2xl"
              />
            ) : (
              <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-4xl font-black text-white shadow-2xl">
                {initials(lastWorker.name)}
              </div>
            )}

            <p className="text-5xl font-bold text-white leading-tight">{lastWorker.name}</p>
            {lastWorker.trade && (
              <p className="mt-2 text-xl text-white/60">{lastWorker.trade}</p>
            )}

            <ComplianceBadge status={compliance} />

            {scanTime && (
              <p className="mt-3 text-white/40">
                {scanTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* CHECK OUT */}
        {scanState === 'checkout' && lastWorker && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/20 px-8 py-4">
              <LogOut className="h-8 w-8 text-white" />
              <span className="text-4xl font-black tracking-wide text-white">CHECKED OUT</span>
            </div>

            {lastWorker.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastWorker.photo}
                alt={lastWorker.name}
                className="mb-5 h-28 w-28 rounded-full border-4 border-white/30 object-cover shadow-2xl"
              />
            ) : (
              <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-4xl font-black text-white shadow-2xl">
                {initials(lastWorker.name)}
              </div>
            )}

            <p className="text-5xl font-bold text-white leading-tight">{lastWorker.name}</p>
            {lastWorker.trade && (
              <p className="mt-2 text-xl text-white/60">{lastWorker.trade}</p>
            )}

            {timeOnSite && (
              <div className="mt-4 rounded-full bg-white/20 px-6 py-2">
                <p className="text-lg font-bold text-white">{timeOnSite}</p>
              </div>
            )}

            <ComplianceBadge status={compliance} />

            {scanTime && (
              <p className="mt-3 text-white/40">
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

      {/* ── Recent scans (idle only) ────────────────────── */}
      {scanState === 'idle' && recentScans.length > 0 && (
        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Recent</p>
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
                <span className="flex-1 truncate text-sm font-medium text-white/60">{s.name}</span>
                <StatusDots orientationOk={s.orientationOk} jhaOk={s.jhaOk} compliance={s.compliance} />
                <span className={`shrink-0 text-xs font-bold ml-1.5 ${s.event === 'check_in' ? 'text-green-400' : 'text-amber-400'}`}>
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

      {/* ── Hidden scan input ───────────────────────────── */}
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
