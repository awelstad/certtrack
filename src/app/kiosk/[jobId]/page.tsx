import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { KioskScanner } from '@/components/kiosk/KioskScanner'
import type { CertStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function KioskPage({
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

  // Kiosk accounts can only see their assigned job
  if (profile?.role === 'kiosk' && profile.kiosk_job_id !== jobId) {
    redirect(`/kiosk/${profile.kiosk_job_id}`)
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('id', jobId)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!job) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', profile!.organization_id)
    .single()

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [{ data: allToday }, { data: recentRows }] = await Promise.all([
    supabase
      .from('site_attendance')
      .select('worker_id, event')
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: true }),
    supabase
      .from('site_attendance')
      .select('worker_id, event, scanned_at, workers(first_name, last_name, avatar_url, trade, auth_user_id, email)')
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(8),
  ])

  // On-site count
  const lastEventByWorker: Record<string, string> = {}
  for (const row of allToday ?? []) {
    lastEventByWorker[row.worker_id] = row.event
  }
  const onSiteCount = Object.values(lastEventByWorker).filter((e) => e === 'check_in').length

  // Worker IDs in recent scans for compliance lookups
  const recentWorkerIds = [...new Set((recentRows ?? []).map((r) => r.worker_id))]

  // Fetch compliance data for recent workers in parallel
  const [{ data: recentCerts }, { data: orientationCompletions }, { data: todayJhas }] = await Promise.all([
    recentWorkerIds.length
      ? supabase
          .from('worker_certifications')
          .select('worker_id, status, expiry_date')
          .in('worker_id', recentWorkerIds)
      : Promise.resolve({ data: [] }),
    recentWorkerIds.length
      ? supabase
          .from('orientation_completions')
          .select('worker_profile_id, worker_email')
          .eq('job_id', jobId)
          .eq('passed', true)
      : Promise.resolve({ data: [] }),
    supabase
      .from('jhas')
      .select('id')
      .eq('job_id', jobId)
      .gte('created_at', todayStart.toISOString()),
  ])

  // JHA signatures today
  const jhaIds = (todayJhas ?? []).map((j) => j.id)
  const { data: todaySigs } = jhaIds.length
    ? await supabase
        .from('jha_signatures')
        .select('worker_id')
        .in('jha_id', jhaIds)
        .in('worker_id', recentWorkerIds)
    : { data: [] }

  const signedWorkerIds = new Set((todaySigs ?? []).map((s) => s.worker_id))
  const passedProfileIds = new Set((orientationCompletions ?? []).map((c) => c.worker_profile_id).filter(Boolean))
  const passedEmails = new Set((orientationCompletions ?? []).map((c) => c.worker_email).filter(Boolean))

  // Group certs by worker
  const certsByWorker: Record<string, { status: CertStatus; expiry_date: string | null }[]> = {}
  for (const c of recentCerts ?? []) {
    if (!certsByWorker[c.worker_id]) certsByWorker[c.worker_id] = []
    certsByWorker[c.worker_id].push({ status: c.status as CertStatus, expiry_date: c.expiry_date })
  }

  const recentScans = (recentRows ?? []).map((row) => {
    type WType = { first_name: string; last_name: string; avatar_url: string | null; trade: string | null; auth_user_id: string | null; email: string | null }
    const w = row.workers as unknown as WType | null
    const orientationOk =
      (w?.auth_user_id && passedProfileIds.has(w.auth_user_id)) ||
      (w?.email && passedEmails.has(w.email)) || false
    return {
      workerId:      row.worker_id,
      name:          w ? `${w.first_name} ${w.last_name}` : 'Unknown',
      event:         row.event as 'check_in' | 'check_out',
      time:          row.scanned_at,
      photo:         w?.avatar_url ?? null,
      trade:         w?.trade ?? null,
      orientationOk: Boolean(orientationOk),
      jhaOk:         signedWorkerIds.has(row.worker_id),
      compliance:    calculateWorkerOverallStatus(certsByWorker[row.worker_id] ?? []),
    }
  })

  return (
    <KioskScanner
      jobId={jobId}
      jobName={job.name}
      orgName={org?.name ?? 'Clearwork'}
      logoUrl={org?.logo_url ?? null}
      brandColor={org?.brand_color ?? '#0f172a'}
      initialOnSiteCount={onSiteCount}
      initialRecentScans={recentScans}
    />
  )
}
