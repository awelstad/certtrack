'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import type { CertStatus } from '@/lib/types'

const SCAN_COOLDOWN_MS = 5_000

export async function logAttendance(
  publicId: string,
  jobId: string
): Promise<{
  error?: string
  worker?: { name: string; photo: string | null; trade: string | null }
  workerId?: string
  event?: 'check_in' | 'check_out'
  compliance?: 'green' | 'yellow' | 'red' | 'gray'
  timeOnSite?: string | null
  isNewToJob?: boolean
  previousJobId?: string | null
  previousJobName?: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired — please log back in' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, avatar_url, trade')
    .eq('public_id', publicId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!worker) return { error: 'Worker not found in your organization' }

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [{ data: lastRow }, { data: certs }, { data: todayEvents }] = await Promise.all([
    supabase
      .from('site_attendance')
      .select('event, scanned_at')
      .eq('worker_id', worker.id)
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('worker_certifications')
      .select('status, expiry_date')
      .eq('worker_id', worker.id),
    supabase
      .from('site_attendance')
      .select('event, scanned_at')
      .eq('worker_id', worker.id)
      .eq('job_id', jobId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: true }),
  ])

  // 5-second cooldown — prevents accidental double-scan
  if (lastRow?.scanned_at) {
    const msSinceLast = Date.now() - new Date(lastRow.scanned_at).getTime()
    if (msSinceLast < SCAN_COOLDOWN_MS) {
      const secsLeft = Math.ceil((SCAN_COOLDOWN_MS - msSinceLast) / 1000)
      return { error: `Already scanned — please wait ${secsLeft}s before scanning again` }
    }
  }

  const event: 'check_in' | 'check_out' =
    lastRow?.event === 'check_in' ? 'check_out' : 'check_in'

  let timeOnSite: string | null = null
  if (event === 'check_out') {
    const lastCheckIn = [...(todayEvents ?? [])].reverse().find((e) => e.event === 'check_in')
    if (lastCheckIn) {
      const ms = Date.now() - new Date(lastCheckIn.scanned_at).getTime()
      const h  = Math.floor(ms / 3600000)
      const m  = Math.floor((ms % 3600000) / 60000)
      timeOnSite = h > 0 ? `${h}h ${m}m on site` : `${m}m on site`
    }
  }

  const { error: insErr } = await supabase
    .from('site_attendance')
    .insert({
      organization_id: profile.organization_id,
      job_id:          jobId,
      worker_id:       worker.id,
      event,
      scanned_at:      new Date().toISOString(),
    })

  if (insErr) return { error: insErr.message }

  const compliance = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )

  // ── Job roster check ──────────────────────────────────────────────────────
  const admin = createAdminClient()

  const [{ data: thisJobEntry }, { data: otherJobEntries }] = await Promise.all([
    admin
      .from('job_workers')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', worker.id)
      .maybeSingle(),
    admin
      .from('job_workers')
      .select('job_id, jobs(name)')
      .eq('worker_id', worker.id)
      .neq('job_id', jobId)
      .order('added_at', { ascending: false })
      .limit(1),
  ])

  let isNewToJob = false
  let previousJobId: string | null = null
  let previousJobName: string | null = null

  if (!thisJobEntry) {
    if (otherJobEntries && otherJobEntries.length > 0) {
      // Has another job assignment — return info so kiosk can show transfer modal
      isNewToJob = true
      previousJobId = otherJobEntries[0].job_id
      previousJobName = (otherJobEntries[0].jobs as { name: string } | null)?.name ?? null
    } else {
      // No assignment anywhere — quietly add to this job
      await admin.from('job_workers').insert({ job_id: jobId, worker_id: worker.id })
    }
  }

  return {
    worker: {
      name:  `${worker.first_name} ${worker.last_name}`,
      photo: worker.avatar_url ?? null,
      trade: worker.trade ?? null,
    },
    workerId: worker.id,
    event,
    compliance,
    timeOnSite,
    isNewToJob,
    previousJobId,
    previousJobName,
  }
}
