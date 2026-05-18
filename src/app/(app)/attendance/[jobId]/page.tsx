import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, UserCheck, LogOut, Clock, ScanLine, Pencil } from 'lucide-react'
import { AttendanceDatePicker } from './AttendanceDatePicker'

export const dynamic = 'force-dynamic'

function duration(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function durationMs(fromIso: string, toIso: string): number {
  return new Date(toIso).getTime() - new Date(fromIso).getTime()
}

function msToLabel(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

type WorkerInfo = { id: string; name: string; photo: string | null; trade: string | null }

function Avatar({ worker, size = 'md' }: { worker: WorkerInfo; size?: 'sm' | 'md' }) {
  const dim      = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm'
  const initials = worker.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return worker.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={worker.photo} alt={worker.name} className={`${dim} shrink-0 rounded-full object-cover`} />
  ) : (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600`}>
      {initials}
    </div>
  )
}

export default async function AttendanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { jobId }           = await params
  const { from: fromParam, to: toParam } = await searchParams
  const supabase            = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile }  = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.organization_id

  const { data: job } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('id', jobId)
    .eq('organization_id', orgId)
    .single()

  if (!job) notFound()

  // Resolve date range (default = today)
  const todayIso  = new Date().toISOString().slice(0, 10)
  const fromDate  = fromParam ?? todayIso
  const toDate    = toParam   ?? todayIso
  const isRange   = fromDate !== toDate

  const rangeStart = new Date(`${fromDate}T00:00:00.000Z`)
  const rangeEnd   = new Date(`${toDate}T23:59:59.999Z`)

  const { data: allEvents } = await supabase
    .from('site_attendance')
    .select('id, worker_id, event, scanned_at, workers(id, first_name, last_name, avatar_url, trade)')
    .eq('job_id', jobId)
    .eq('organization_id', orgId)
    .gte('scanned_at', rangeStart.toISOString())
    .lte('scanned_at', rangeEnd.toISOString())
    .order('scanned_at', { ascending: true })

  // Build worker info map
  const workerInfo: Record<string, WorkerInfo> = {}
  const workerEvents: Record<string, { event: string; scanned_at: string }[]> = {}

  for (const row of allEvents ?? []) {
    const w = row.workers as unknown as {
      id: string; first_name: string; last_name: string; avatar_url: string | null; trade: string | null
    } | null
    workerInfo[row.worker_id] = {
      id:    row.worker_id,
      name:  w ? `${w.first_name} ${w.last_name}` : 'Unknown',
      photo: w?.avatar_url ?? null,
      trade: w?.trade ?? null,
    }
    if (!workerEvents[row.worker_id]) workerEvents[row.worker_id] = []
    workerEvents[row.worker_id].push({ event: row.event, scanned_at: row.scanned_at })
  }

  // ── SINGLE DAY VIEW ──────────────────────────────────────────────────────────

  const onSite:     { worker: WorkerInfo; checkInTime: string }[] = []
  const checkedOut: { worker: WorkerInfo; checkInTime: string | null; checkOutTime: string; dur: string }[] = []

  if (!isRange) {
    for (const [wId, events] of Object.entries(workerEvents)) {
      const last   = events[events.length - 1]
      const worker = workerInfo[wId]
      if (last.event === 'check_in') {
        onSite.push({ worker, checkInTime: last.scanned_at })
      } else {
        const lastIn = [...events].reverse().find((e) => e.event === 'check_in')
        checkedOut.push({
          worker,
          checkInTime:  lastIn?.scanned_at ?? null,
          checkOutTime: last.scanned_at,
          dur:          lastIn ? duration(lastIn.scanned_at, last.scanned_at) : '—',
        })
      }
    }
    onSite.sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime())
    checkedOut.sort((a, b) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime())
  }

  // ── RANGE SUMMARY ────────────────────────────────────────────────────────────

  type WorkerSummary = {
    worker: WorkerInfo
    daysOnSite: number
    totalMs: number
    firstSeen: string
    lastSeen: string
  }

  const rangeSummary: WorkerSummary[] = []

  if (isRange) {
    for (const [wId, events] of Object.entries(workerEvents)) {
      const worker = workerInfo[wId]
      const days = new Set(events.map((e) => e.scanned_at.slice(0, 10)))
      let totalMs = 0

      // Sum up check_in → check_out pairs
      const sorted = [...events].sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
      let pendingIn: string | null = null
      for (const ev of sorted) {
        if (ev.event === 'check_in') {
          pendingIn = ev.scanned_at
        } else if (ev.event === 'check_out' && pendingIn) {
          totalMs += durationMs(pendingIn, ev.scanned_at)
          pendingIn = null
        }
      }

      rangeSummary.push({
        worker,
        daysOnSite: days.size,
        totalMs,
        firstSeen:  events[0].scanned_at,
        lastSeen:   events[events.length - 1].scanned_at,
      })
    }
    rangeSummary.sort((a, b) => b.totalMs - a.totalMs)
  }

  // Timeline newest first (single day only)
  const timeline = isRange ? [] : [...(allEvents ?? [])].reverse()

  const headerLabel = isRange
    ? `${new Date(`${fromDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(`${toDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : new Date(`${fromDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Back + actions */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/attendance" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Attendance
        </Link>
        <Link
          href={`/kiosk/${jobId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ScanLine className="h-4 w-4 text-orange-500" />
          Launch Kiosk
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">{job.name}</h1>
        <p className="text-sm text-slate-500">{headerLabel}</p>
      </div>

      {/* Date picker */}
      <div className="mb-6">
        <AttendanceDatePicker jobId={jobId} from={fromDate} to={toDate} />
      </div>

      {/* Empty state */}
      {(allEvents ?? []).length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
          <ScanLine className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-500">No scans in this period</p>
          <p className="mt-1 text-sm text-slate-400">Try a different date range.</p>
        </div>
      )}

      {(allEvents ?? []).length > 0 && (
        <div className="space-y-6">

          {/* ── RANGE SUMMARY ── */}
          {isRange && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">
                  Worker Summary
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                    {rangeSummary.length} worker{rangeSummary.length !== 1 ? 's' : ''}
                  </span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header row */}
                <div className="grid grid-cols-4 gap-2 border-b border-slate-100 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span className="col-span-2">Worker</span>
                  <span className="text-center">Days</span>
                  <span className="text-right">Total Hours</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {rangeSummary.map(({ worker, daysOnSite, totalMs }) => (
                    <li key={worker.id} className="grid grid-cols-4 gap-2 items-center px-5 py-3">
                      <div className="col-span-2 flex items-center gap-3 min-w-0">
                        <Avatar worker={worker} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 text-sm">{worker.name}</p>
                          {worker.trade && <p className="text-xs text-slate-400 truncate">{worker.trade}</p>}
                        </div>
                      </div>
                      <p className="text-center text-sm font-medium text-slate-700">{daysOnSite}</p>
                      <p className="text-right text-sm font-semibold text-slate-900">
                        {totalMs > 0 ? msToLabel(totalMs) : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
                {/* Totals row */}
                <div className="grid grid-cols-4 gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700">
                  <span className="col-span-2">Total</span>
                  <span className="text-center">{rangeSummary.reduce((a, s) => a + s.daysOnSite, 0)}</span>
                  <span className="text-right">{msToLabel(rangeSummary.reduce((a, s) => a + s.totalMs, 0))}</span>
                </div>
              </div>
            </section>
          )}

          {/* ── SINGLE DAY: On Site Now ── */}
          {!isRange && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <UserCheck className="h-3.5 w-3.5 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-700">
                  On Site Now
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                    {onSite.length}
                  </span>
                </h2>
              </div>
              {onSite.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-400">
                  No workers currently on site.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <ul className="divide-y divide-slate-100">
                    {onSite.map(({ worker, checkInTime }) => (
                      <li key={worker.id} className="flex items-center gap-3 px-5 py-3.5">
                        <Avatar worker={worker} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{worker.name}</p>
                          {worker.trade && <p className="text-xs text-slate-400">{worker.trade}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-green-700">In {timeLabel(checkInTime)}</p>
                          <p className="text-xs text-slate-400">{duration(checkInTime, new Date().toISOString())} ago</p>
                        </div>
                        <Link
                          href={`/workers/${worker.id}`}
                          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── SINGLE DAY: Checked Out ── */}
          {!isRange && checkedOut.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <LogOut className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-700">
                  Checked Out Today
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                    {checkedOut.length}
                  </span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {checkedOut.map(({ worker, checkInTime, checkOutTime, dur }) => (
                    <li key={worker.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Avatar worker={worker} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{worker.name}</p>
                        {worker.trade && <p className="text-xs text-slate-400">{worker.trade}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-slate-500">
                          {checkInTime ? `${timeLabel(checkInTime)} → ` : ''}{timeLabel(checkOutTime)}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">{dur} on site</p>
                      </div>
                      <Link
                        href={`/workers/${worker.id}`}
                        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ── SINGLE DAY: Timeline ── */}
          {!isRange && timeline.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-700">Today&apos;s Timeline</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {timeline.map((row) => {
                    const w = row.workers as unknown as {
                      first_name: string; last_name: string; avatar_url: string | null; trade: string | null
                    } | null
                    const wInfo: WorkerInfo = {
                      id:    row.worker_id,
                      name:  w ? `${w.first_name} ${w.last_name}` : 'Unknown',
                      photo: w?.avatar_url ?? null,
                      trade: w?.trade ?? null,
                    }
                    const isIn = row.event === 'check_in'
                    return (
                      <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar worker={wInfo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{wInfo.name}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isIn ? 'In' : 'Out'}
                        </span>
                        <span className="w-14 shrink-0 text-right font-mono text-xs text-slate-400">
                          {timeLabel(row.scanned_at)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* ── RANGE: Daily breakdown ── */}
          {isRange && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-700">All Events</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {[...(allEvents ?? [])].reverse().map((row) => {
                    const w = row.workers as unknown as {
                      first_name: string; last_name: string; avatar_url: string | null; trade: string | null
                    } | null
                    const wInfo: WorkerInfo = {
                      id:    row.worker_id,
                      name:  w ? `${w.first_name} ${w.last_name}` : 'Unknown',
                      photo: w?.avatar_url ?? null,
                      trade: w?.trade ?? null,
                    }
                    const isIn = row.event === 'check_in'
                    return (
                      <li key={row.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar worker={wInfo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{wInfo.name}</p>
                          <p className="text-xs text-slate-400">{dateLabel(row.scanned_at)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isIn ? 'In' : 'Out'}
                        </span>
                        <span className="w-14 shrink-0 text-right font-mono text-xs text-slate-400">
                          {timeLabel(row.scanned_at)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
