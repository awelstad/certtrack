import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KioskScanner } from '@/components/kiosk/KioskScanner'

export const dynamic = 'force-dynamic'

export default async function KioskPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

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

  // Today's attendance
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
      .select('event, scanned_at, workers(first_name, last_name, avatar_url, trade)')
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(8),
  ])

  // On-site = workers whose last event today is 'check_in'
  const lastEventByWorker: Record<string, string> = {}
  for (const row of allToday ?? []) {
    lastEventByWorker[row.worker_id] = row.event
  }
  const onSiteCount = Object.values(lastEventByWorker).filter((e) => e === 'check_in').length

  const recentScans = (recentRows ?? []).map((row) => {
    const w = row.workers as unknown as {
      first_name: string; last_name: string; avatar_url: string | null; trade: string | null
    } | null
    return {
      name:  w ? `${w.first_name} ${w.last_name}` : 'Unknown',
      event: row.event as 'check_in' | 'check_out',
      time:  row.scanned_at,
      photo: w?.avatar_url ?? null,
      trade: w?.trade ?? null,
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
