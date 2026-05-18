import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { ShieldCheck, ShieldAlert, ShieldX, Clock, ArrowLeft, ClipboardCheck, QrCode } from 'lucide-react'
import type { CertStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Compliance = 'green' | 'yellow' | 'red' | 'gray'

function complianceIcon(c: Compliance) {
  if (c === 'green')  return <ShieldCheck className="h-4 w-4 text-green-400" />
  if (c === 'yellow') return <ShieldAlert className="h-4 w-4 text-yellow-400" />
  if (c === 'red')    return <ShieldX className="h-4 w-4 text-red-400" />
  return <Clock className="h-4 w-4 text-slate-500" />
}

export default async function WorkersOnSitePage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
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

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', jobId)
    .eq('organization_id', profile!.organization_id)
    .single()

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  // All today's attendance events
  const { data: allToday } = await supabase
    .from('site_attendance')
    .select('worker_id, event, scanned_at')
    .eq('job_id', jobId)
    .gte('scanned_at', todayStart.toISOString())
    .order('scanned_at', { ascending: true })

  // Determine who is currently on site
  const lastEventByWorker: Record<string, { event: string; checkedInAt?: string }> = {}
  for (const row of allToday ?? []) {
    if (row.event === 'check_in') {
      lastEventByWorker[row.worker_id] = { event: 'check_in', checkedInAt: row.scanned_at }
    } else {
      lastEventByWorker[row.worker_id] = { event: 'check_out' }
    }
  }
  const onSiteWorkerIds = Object.entries(lastEventByWorker)
    .filter(([, v]) => v.event === 'check_in')
    .map(([id]) => id)

  if (!onSiteWorkerIds.length) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Link href={`/kiosk/${jobId}`} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Workers On Site</p>
            <p className="text-white font-semibold">{job?.name}</p>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">👷</p>
            <p className="text-slate-400">No workers checked in today</p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch worker details for all on-site workers
  const { data: workers } = await supabase
    .from('workers')
    .select('id, first_name, last_name, avatar_url, trade, employer, auth_user_id, email')
    .in('id', onSiteWorkerIds)

  // Orientation completions for this job (passed)
  const { data: completions } = await supabase
    .from('orientation_completions')
    .select('worker_profile_id, worker_email')
    .eq('job_id', jobId)
    .eq('passed', true)

  // Today's JHA signatures for this job
  const { data: todayJhas } = await supabase
    .from('jhas')
    .select('id')
    .eq('job_id', jobId)
    .gte('created_at', todayStart.toISOString())

  const jhaIds = (todayJhas ?? []).map((j) => j.id)
  const { data: signatures } = jhaIds.length
    ? await supabase
        .from('jha_signatures')
        .select('worker_id')
        .in('jha_id', jhaIds)
    : { data: [] }

  const signedWorkerIds = new Set((signatures ?? []).map((s) => s.worker_id))

  // Cert compliance for all on-site workers
  const { data: allCerts } = await supabase
    .from('worker_certifications')
    .select('worker_id, status, expiry_date')
    .in('worker_id', onSiteWorkerIds)

  const certsByWorker: Record<string, { status: CertStatus; expiry_date: string | null }[]> = {}
  for (const c of allCerts ?? []) {
    if (!certsByWorker[c.worker_id]) certsByWorker[c.worker_id] = []
    certsByWorker[c.worker_id].push({ status: c.status as CertStatus, expiry_date: c.expiry_date })
  }

  // Build orientation lookup: profile_id → passed
  const passedProfileIds = new Set((completions ?? []).map((c) => c.worker_profile_id).filter(Boolean))
  const passedEmails = new Set((completions ?? []).map((c) => c.worker_email).filter(Boolean))

  function workerPassedOrientation(w: { auth_user_id: string | null; email: string | null }) {
    if (w.auth_user_id && passedProfileIds.has(w.auth_user_id)) return true
    if (w.email && passedEmails.has(w.email)) return true
    return false
  }

  function timeOnSite(workerId: string): string {
    const entry = lastEventByWorker[workerId]
    if (!entry?.checkedInAt) return ''
    const ms = Date.now() - new Date(entry.checkedInAt).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  function initials(first: string, last: string) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
        <Link href={`/kiosk/${jobId}`} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Workers On Site</p>
          <p className="text-white font-semibold">{job?.name}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">
          {onSiteWorkerIds.length}
        </span>
      </header>

      <ul className="divide-y divide-white/5 overflow-y-auto flex-1">
        {(workers ?? []).map((w) => {
          const compliance = calculateWorkerOverallStatus(certsByWorker[w.id] ?? [])
          const orientationOk = workerPassedOrientation(w)
          const jhaOk = signedWorkerIds.has(w.id)
          const onSiteTime = timeOnSite(w.id)

          return (
            <li key={w.id}>
              <Link
                href={`/kiosk/${jobId}/workers/${w.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
              >
                {/* Avatar */}
                {w.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={w.avatar_url}
                    alt={`${w.first_name} ${w.last_name}`}
                    className="h-12 w-12 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                    {initials(w.first_name, w.last_name)}
                  </div>
                )}

                {/* Name + details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {w.first_name} {w.last_name}
                  </p>
                  <p className="text-sm text-slate-400 truncate">
                    {[w.trade, w.employer].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Status dots + time */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span title="Orientation">{complianceIcon(orientationOk ? 'green' : 'red')}</span>
                    <span title="JHA Signed Today">
                      {jhaOk
                        ? <ClipboardCheck className="h-4 w-4 text-green-400" />
                        : <ClipboardCheck className="h-4 w-4 text-slate-600" />
                      }
                    </span>
                    <span title="Cert Compliance">{complianceIcon(compliance)}</span>
                    <QrCode className="h-4 w-4 ml-1 text-slate-600" />
                  </div>
                  {onSiteTime && (
                    <span className="text-xs text-slate-500">{onSiteTime}</span>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Legend */}
      <div className="shrink-0 border-t border-white/10 px-5 py-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-400" /> Orientation</span>
        <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3 text-green-400" /> JHA Today</span>
        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-400" /> Certs</span>
        <span className="flex items-center gap-1"><ShieldX className="h-3 w-3 text-red-400" /> Not cleared</span>
      </div>
    </div>
  )
}
