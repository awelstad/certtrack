import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import {
  ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, Clock,
  ClipboardCheck, AlertTriangle, Star, ArrowRightLeft,
} from 'lucide-react'
import type { CertStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Compliance = 'green' | 'yellow' | 'red' | 'gray'
type AttendanceStatus = 'on_site' | 'checked_out' | 'absent'

type WorkerRow = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  trade: string | null
  employer: string | null
  requires_orientation: boolean
  email: string | null
  auth_user_id: string | null
}

function initials(w: WorkerRow) {
  return `${w.first_name[0] ?? ''}${w.last_name[0] ?? ''}`.toUpperCase()
}

function Avatar({ w, size = 'md' }: { w: WorkerRow; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-10 w-10 text-xs' : 'h-12 w-12 text-sm'
  return w.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={w.avatar_url} alt={`${w.first_name} ${w.last_name}`} className={`${dim} shrink-0 rounded-full object-cover border border-white/10`} />
  ) : (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white`}>
      {initials(w)}
    </div>
  )
}

function ComplianceDot({ c }: { c: Compliance }) {
  if (c === 'green')  return <ShieldCheck  className="h-4 w-4 text-green-400" />
  if (c === 'yellow') return <ShieldAlert  className="h-4 w-4 text-yellow-400" />
  if (c === 'red')    return <ShieldX      className="h-4 w-4 text-red-400" />
  return                     <Clock        className="h-4 w-4 text-slate-600" />
}

function StatusRow({
  label, orientationOk, needsOrientation, jhaOk, compliance, time, firstDay,
}: {
  label: string; orientationOk: boolean; needsOrientation: boolean; jhaOk: boolean
  compliance: Compliance; time?: string; firstDay?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {firstDay && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300 font-semibold">
            <Star className="h-3 w-3" />First Day
          </span>
        )}
        {time && <span className="text-slate-500">{time}</span>}
      </div>
      {needsOrientation && !orientationOk ? (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Needs orientation before working
        </span>
      ) : (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className={`h-3.5 w-3.5 ${orientationOk ? 'text-green-400' : 'text-slate-600'}`} />
            Orient
          </span>
          <span className="flex items-center gap-1">
            <ClipboardCheck className={`h-3.5 w-3.5 ${jhaOk ? 'text-green-400' : 'text-slate-600'}`} />
            JHA
          </span>
          <span className="flex items-center gap-1">
            <ComplianceDot c={compliance} />
            Certs
          </span>
        </div>
      )}
    </div>
  )
}

export default async function RosterPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/kiosk/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, kiosk_job_id')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'kiosk' && profile.kiosk_job_id !== jobId) {
    redirect(`/kiosk/${profile.kiosk_job_id}/workers`)
  }

  const admin = createAdminClient()

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  // Parallel data fetch
  const [
    { data: job },
    { data: assignedRows },
    { data: todayEvents },
    { data: priorAttendance },
    { data: completions },
    { data: todayJhas },
  ] = await Promise.all([
    admin.from('jobs').select('name').eq('id', jobId).single(),
    admin
      .from('job_workers')
      .select('worker_id, added_at, workers(id, first_name, last_name, avatar_url, trade, employer, requires_orientation, email, auth_user_id)')
      .eq('job_id', jobId),
    admin
      .from('site_attendance')
      .select('worker_id, event, scanned_at')
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: true }),
    admin
      .from('site_attendance')
      .select('worker_id')
      .eq('job_id', jobId)
      .lt('scanned_at', todayStart.toISOString()),
    admin
      .from('orientation_completions')
      .select('worker_id, worker_profile_id, worker_email, passed')
      .eq('job_id', jobId)
      .eq('passed', true),
    admin
      .from('jhas')
      .select('id')
      .eq('job_id', jobId)
      .gte('created_at', todayStart.toISOString()),
  ])

  // JHA signatures
  const jhaIds = (todayJhas ?? []).map((j) => j.id)
  const { data: signatures } = jhaIds.length
    ? await admin.from('jha_signatures').select('worker_id').in('jha_id', jhaIds)
    : { data: [] }
  const signedWorkerIds = new Set((signatures ?? []).map((s) => s.worker_id))

  // Today's attendance: last event per worker
  const lastEventByWorker = new Map<string, { event: string; scanned_at: string }>()
  const firstEventTodayByWorker = new Map<string, string>()
  for (const e of todayEvents ?? []) {
    lastEventByWorker.set(e.worker_id, { event: e.event, scanned_at: e.scanned_at })
    if (!firstEventTodayByWorker.has(e.worker_id)) {
      firstEventTodayByWorker.set(e.worker_id, e.scanned_at)
    }
  }

  // Workers who were here before today (not first-timers)
  const returningWorkerIds = new Set((priorAttendance ?? []).map((r) => r.worker_id))

  // Orientation lookup
  const passedWorkerIds    = new Set((completions ?? []).map((c) => c.worker_id).filter(Boolean) as string[])
  const passedProfileIds   = new Set((completions ?? []).map((c) => c.worker_profile_id).filter(Boolean) as string[])
  const passedEmails       = new Set((completions ?? []).map((c) => c.worker_email).filter(Boolean) as string[])

  function workerPassedOrientation(w: WorkerRow): boolean {
    if (passedWorkerIds.has(w.id)) return true
    if (w.auth_user_id && passedProfileIds.has(w.auth_user_id)) return true
    if (w.email && passedEmails.has(w.email)) return true
    return false
  }

  // Time on site
  function timeOnSite(workerId: string): string | null {
    const entry = lastEventByWorker.get(workerId)
    if (!entry || entry.event !== 'check_in') return null
    const ms = Date.now() - new Date(entry.scanned_at).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Assigned workers with status
  type AssignedWorker = {
    worker: WorkerRow
    status: AttendanceStatus
    orientationOk: boolean
    jhaOk: boolean
    compliance: Compliance
    firstDay: boolean
    timeStr: string | null
  }

  const assignedWorkerIds = new Set<string>()
  const onSite: AssignedWorker[] = []
  const checkedOut: AssignedWorker[] = []
  const absent: AssignedWorker[] = []

  for (const row of assignedRows ?? []) {
    const w = row.workers as unknown as WorkerRow
    if (!w) continue
    assignedWorkerIds.add(w.id)

    const lastEvent = lastEventByWorker.get(w.id)
    let status: AttendanceStatus = 'absent'
    if (lastEvent?.event === 'check_in')  status = 'on_site'
    if (lastEvent?.event === 'check_out') status = 'checked_out'

    // Cert compliance
    const { data: certs } = await admin
      .from('worker_certifications')
      .select('status, expiry_date')
      .eq('worker_id', w.id)
    const compliance = calculateWorkerOverallStatus(
      (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
    )

    const entry: AssignedWorker = {
      worker:        w,
      status,
      orientationOk: workerPassedOrientation(w),
      jhaOk:         signedWorkerIds.has(w.id),
      compliance,
      firstDay:      !returningWorkerIds.has(w.id) && firstEventTodayByWorker.has(w.id),
      timeStr:       timeOnSite(w.id),
    }

    if (status === 'on_site')     onSite.push(entry)
    else if (status === 'checked_out') checkedOut.push(entry)
    else                          absent.push(entry)
  }

  // Sort on-site by name, absent by name, checked-out by name
  const byName = (a: AssignedWorker, b: AssignedWorker) =>
    `${a.worker.first_name} ${a.worker.last_name}`.localeCompare(`${b.worker.first_name} ${b.worker.last_name}`)
  onSite.sort(byName); checkedOut.sort(byName); absent.sort(byName)

  // Visiting workers (checked in today, not in job_workers)
  const visitorIds = [...new Set((todayEvents ?? []).map((e) => e.worker_id))].filter(
    (id) => !assignedWorkerIds.has(id)
  )

  type Visitor = {
    worker: WorkerRow
    orientationOk: boolean
    jhaOk: boolean
    compliance: Compliance
    firstDay: boolean
    timeStr: string | null
    previousJobName: string | null
  }

  const visitors: Visitor[] = []
  if (visitorIds.length > 0) {
    const { data: visitorWorkers } = await admin
      .from('workers')
      .select('id, first_name, last_name, avatar_url, trade, employer, requires_orientation, email, auth_user_id')
      .in('id', visitorIds)

    // Previous job assignments for visitors
    const { data: visitorJobs } = await admin
      .from('job_workers')
      .select('worker_id, jobs(name)')
      .in('worker_id', visitorIds)
      .neq('job_id', jobId)

    const prevJobByWorker = new Map<string, string>()
    for (const vj of visitorJobs ?? []) {
      if (!prevJobByWorker.has(vj.worker_id)) {
        prevJobByWorker.set(vj.worker_id, (vj.jobs as { name: string } | null)?.name ?? '')
      }
    }

    for (const vw of visitorWorkers ?? []) {
      const w = vw as WorkerRow
      // Only include if they have a check_in event today (on site or was on site)
      const lastEvent = lastEventByWorker.get(w.id)
      if (!lastEvent) continue

      const { data: certs } = await admin
        .from('worker_certifications')
        .select('status, expiry_date')
        .eq('worker_id', w.id)
      const compliance = calculateWorkerOverallStatus(
        (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
      )

      visitors.push({
        worker:          w,
        orientationOk:   workerPassedOrientation(w),
        jhaOk:           signedWorkerIds.has(w.id),
        compliance,
        firstDay:        !returningWorkerIds.has(w.id),
        timeStr:         timeOnSite(w.id),
        previousJobName: prevJobByWorker.get(w.id) ?? null,
      })
    }
  }

  const totalOnSite = onSite.length + visitors.filter((v) => lastEventByWorker.get(v.worker.id)?.event === 'check_in').length
  const totalAbsent = absent.length

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <Link href={`/kiosk/${jobId}`} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Job Roster</p>
          <p className="font-bold text-white truncate">{job?.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-bold text-green-300">
            {totalOnSite} on site
          </span>
          {totalAbsent > 0 && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-slate-400">
              {totalAbsent} absent
            </span>
          )}
          {visitors.length > 0 && (
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-bold text-blue-300">
              {visitors.length} new
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">

        {/* ON SITE */}
        {onSite.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-5 py-2 border-b border-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                ✓ On Site — {onSite.length}
              </p>
            </div>
            <ul className="divide-y divide-white/5">
              {onSite.map(({ worker: w, orientationOk, jhaOk, compliance, firstDay, timeStr }) => (
                <li key={w.id}>
                  <Link
                    href={`/kiosk/${jobId}/workers/${w.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <Avatar w={w} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {w.first_name} {w.last_name}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {[w.trade, w.employer].filter(Boolean).join(' · ')}
                      </p>
                      <StatusRow
                        label="on_site"
                        orientationOk={orientationOk}
                        needsOrientation={w.requires_orientation}
                        jhaOk={jhaOk}
                        compliance={compliance}
                        time={timeStr ? `${timeStr} on site` : undefined}
                        firstDay={firstDay}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CHECKED OUT TODAY */}
        {checkedOut.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-5 py-2 border-b border-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                ↩ Checked Out Today — {checkedOut.length}
              </p>
            </div>
            <ul className="divide-y divide-white/5">
              {checkedOut.map(({ worker: w, orientationOk, jhaOk, compliance, firstDay }) => (
                <li key={w.id}>
                  <Link
                    href={`/kiosk/${jobId}/workers/${w.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors opacity-70"
                  >
                    <Avatar w={w} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {w.first_name} {w.last_name}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {[w.trade, w.employer].filter(Boolean).join(' · ')}
                      </p>
                      <StatusRow
                        label="checked_out"
                        orientationOk={orientationOk}
                        needsOrientation={w.requires_orientation}
                        jhaOk={jhaOk}
                        compliance={compliance}
                        firstDay={firstDay}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ABSENT */}
        {absent.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-5 py-2 border-b border-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                ○ Not Here Today — {absent.length}
              </p>
            </div>
            <ul className="divide-y divide-white/5">
              {absent.map(({ worker: w, orientationOk, jhaOk, compliance }) => (
                <li key={w.id}>
                  <Link
                    href={`/kiosk/${jobId}/workers/${w.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors opacity-50"
                  >
                    <Avatar w={w} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {w.first_name} {w.last_name}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {[w.trade, w.employer].filter(Boolean).join(' · ')}
                      </p>
                      <StatusRow
                        label="absent"
                        orientationOk={orientationOk}
                        needsOrientation={w.requires_orientation}
                        jhaOk={jhaOk}
                        compliance={compliance}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NEW TO THIS SITE */}
        {visitors.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-5 py-2 border-b border-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                ⊕ New to This Site — {visitors.length}
              </p>
            </div>
            <ul className="divide-y divide-white/5">
              {visitors.map(({ worker: w, orientationOk, jhaOk, compliance, firstDay, timeStr, previousJobName }) => {
                const isOnSite = lastEventByWorker.get(w.id)?.event === 'check_in'
                return (
                  <li key={w.id}>
                    <Link
                      href={`/kiosk/${jobId}/workers/${w.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="relative">
                        <Avatar w={w} />
                        {isOnSite && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-400 border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white truncate">
                            {w.first_name} {w.last_name}
                          </p>
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                            New to site
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {[w.trade, w.employer].filter(Boolean).join(' · ')}
                        </p>
                        {previousJobName && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <ArrowRightLeft className="h-3 w-3" />
                            Was on: {previousJobName}
                          </p>
                        )}
                        <StatusRow
                          label="visitor"
                          orientationOk={orientationOk}
                          needsOrientation={w.requires_orientation}
                          jhaOk={jhaOk}
                          compliance={compliance}
                          time={timeStr && isOnSite ? `${timeStr} on site` : undefined}
                          firstDay={firstDay}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {onSite.length === 0 && checkedOut.length === 0 && absent.length === 0 && visitors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <p className="text-5xl mb-4">👷</p>
            <p className="text-xl font-bold text-white mb-2">No roster yet</p>
            <p className="text-slate-500 text-sm max-w-xs">
              Workers are added when they complete orientation or scan in for the first time. You can also add them manually in the admin panel.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 border-t border-white/10 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-400" /> Orientation</span>
        <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3 text-green-400" /> JHA Today</span>
        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-400" /> Certs</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" /> Needs orientation</span>
        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> First day</span>
      </div>
    </div>
  )
}
