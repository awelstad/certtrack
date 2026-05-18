import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, Clock, ClipboardCheck, QrCode } from 'lucide-react'
import { ManualCheckInOut } from './ManualCheckInOut'
import type { CertStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Compliance = 'green' | 'yellow' | 'red' | 'gray'

const complianceLabel: Record<Compliance, { label: string; cls: string }> = {
  green:  { label: 'Cleared',          cls: 'bg-green-900/40 text-green-300 border-green-700' },
  yellow: { label: 'Expiring Soon',    cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700' },
  red:    { label: 'Not Cleared',      cls: 'bg-red-900/40 text-red-300 border-red-700' },
  gray:   { label: 'No Certs on File', cls: 'bg-white/5 text-slate-400 border-white/10' },
}

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ jobId: string; workerId: string }>
}) {
  const { jobId, workerId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/kiosk/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, kiosk_job_id')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'kiosk' && profile.kiosk_job_id !== jobId) {
    redirect(`/kiosk/${profile.kiosk_job_id}`)
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', jobId)
    .eq('organization_id', profile!.organization_id)
    .single()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, avatar_url, trade, employer, auth_user_id, email, public_id')
    .eq('id', workerId)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!worker || !job) notFound()

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [
    { data: todayAttendance },
    { data: completion },
    { data: certs },
    { data: todayJhas },
  ] = await Promise.all([
    supabase
      .from('site_attendance')
      .select('event, scanned_at')
      .eq('worker_id', workerId)
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: true }),
    worker.auth_user_id
      ? supabase
          .from('orientation_completions')
          .select('pass_id, score, completed_at')
          .eq('worker_profile_id', worker.auth_user_id)
          .eq('job_id', jobId)
          .eq('passed', true)
          .maybeSingle()
      : supabase
          .from('orientation_completions')
          .select('pass_id, score, completed_at')
          .eq('worker_email', worker.email ?? '')
          .eq('job_id', jobId)
          .eq('passed', true)
          .maybeSingle(),
    supabase
      .from('worker_certifications')
      .select('status, expiry_date, certification_type_id, certification_types(name)')
      .eq('worker_id', workerId),
    supabase
      .from('jhas')
      .select('id')
      .eq('job_id', jobId)
      .gte('created_at', todayStart.toISOString()),
  ])

  // Check JHA signature
  let jhaSignedToday = false
  if (todayJhas?.length) {
    const jhaIds = todayJhas.map((j) => j.id)
    const { data: sigs } = await supabase
      .from('jha_signatures')
      .select('id')
      .in('jha_id', jhaIds)
      .eq('worker_id', workerId)
      .limit(1)
    jhaSignedToday = (sigs?.length ?? 0) > 0
  }

  // Last attendance event today
  const lastEvent = todayAttendance?.length
    ? (todayAttendance[todayAttendance.length - 1].event as 'check_in' | 'check_out')
    : null

  // Time on site
  let timeOnSite: string | null = null
  if (lastEvent === 'check_in' && todayAttendance?.length) {
    const lastCheckIn = [...todayAttendance].reverse().find((e) => e.event === 'check_in')
    if (lastCheckIn) {
      const ms = Date.now() - new Date(lastCheckIn.scanned_at).getTime()
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      timeOnSite = h > 0 ? `${h}h ${m}m` : `${m}m`
    }
  }

  const compliance = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )
  const { label: compLabel, cls: compCls } = complianceLabel[compliance]

  type CertRow = { status: CertStatus; expiry_date: string | null; certification_type_id: string; certification_types: { name: string } | null }
  const approvedCerts = (certs as unknown as CertRow[])?.filter((c) => c.status === 'approved') ?? []

  function initials(first: string, last: string) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
        <Link href={`/kiosk/${jobId}/workers`} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-slate-400 text-sm">{job.name}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 max-w-lg mx-auto w-full">
        {/* Worker header */}
        <div className="flex items-center gap-4">
          {worker.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={worker.avatar_url}
              alt={`${worker.first_name} ${worker.last_name}`}
              className="h-16 w-16 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white">
              {initials(worker.first_name, worker.last_name)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {worker.first_name} {worker.last_name}
            </h1>
            {worker.trade && <p className="text-slate-400 text-sm">{worker.trade}</p>}
            {worker.employer && <p className="text-slate-500 text-xs">{worker.employer}</p>}
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Orientation */}
          <div className={`rounded-xl border p-3 text-center ${completion ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
            <ShieldCheck className={`mx-auto h-5 w-5 mb-1 ${completion ? 'text-green-400' : 'text-red-400'}`} />
            <p className={`text-xs font-semibold ${completion ? 'text-green-300' : 'text-red-300'}`}>
              {completion ? 'Orientated' : 'No Orientation'}
            </p>
            {completion && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{completion.pass_id}</p>
            )}
          </div>

          {/* JHA */}
          <div className={`rounded-xl border p-3 text-center ${jhaSignedToday ? 'bg-green-900/30 border-green-700' : 'bg-white/5 border-white/10'}`}>
            <ClipboardCheck className={`mx-auto h-5 w-5 mb-1 ${jhaSignedToday ? 'text-green-400' : 'text-slate-500'}`} />
            <p className={`text-xs font-semibold ${jhaSignedToday ? 'text-green-300' : 'text-slate-500'}`}>
              {jhaSignedToday ? 'JHA Signed' : 'No JHA Today'}
            </p>
          </div>

          {/* Certs */}
          <div className={`rounded-xl border p-3 text-center ${compCls}`}>
            {compliance === 'green' && <ShieldCheck className="mx-auto h-5 w-5 mb-1 text-green-400" />}
            {compliance === 'yellow' && <ShieldAlert className="mx-auto h-5 w-5 mb-1 text-yellow-400" />}
            {compliance === 'red' && <ShieldX className="mx-auto h-5 w-5 mb-1 text-red-400" />}
            {compliance === 'gray' && <Clock className="mx-auto h-5 w-5 mb-1 text-slate-500" />}
            <p className="text-xs font-semibold">{compLabel}</p>
          </div>
        </div>

        {/* On-site time */}
        {timeOnSite && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Time on site today</span>
            <span className="text-white font-bold">{timeOnSite}</span>
          </div>
        )}

        {/* Orientation detail */}
        {completion && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Orientation</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Pass ID</p>
                <p className="text-white font-mono">{completion.pass_id}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Score</p>
                <p className="text-white">{completion.score}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs">Completed</p>
                <p className="text-white">
                  {new Date(completion.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <a
              href={`/verify/${completion.pass_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-orange-400 hover:underline"
            >
              <QrCode className="h-3.5 w-3.5" />
              View pass
            </a>
          </div>
        )}

        {/* Approved certs */}
        {approvedCerts.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Certifications on File</p>
            <ul className="space-y-1.5">
              {approvedCerts.map((c) => (
                <li key={c.certification_type_id} className="flex items-center justify-between text-sm">
                  <span className="text-white">{c.certification_types?.name ?? 'Cert'}</span>
                  {c.expiry_date && (
                    <span className="text-xs text-slate-500">
                      Exp: {new Date(c.expiry_date).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual check-in/out */}
        <ManualCheckInOut
          workerId={workerId}
          publicId={worker.public_id}
          jobId={jobId}
          currentEvent={lastEvent}
        />
      </div>
    </div>
  )
}
