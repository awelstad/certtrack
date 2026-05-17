'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import type { CertStatus } from '@/lib/types'

export async function logAttendance(
  publicId: string,
  jobId: string
): Promise<{
  error?: string
  worker?: { name: string; photo: string | null; trade: string | null }
  event?: 'check_in' | 'check_out'
  compliance?: 'green' | 'yellow' | 'red' | 'gray'
  timeOnSite?: string | null
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

  // Get last event + compliance certs in parallel
  const [{ data: lastRow }, { data: certs }, { data: todayEvents }] = await Promise.all([
    supabase
      .from('site_attendance')
      .select('event')
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

  const event: 'check_in' | 'check_out' =
    lastRow?.event === 'check_in' ? 'check_out' : 'check_in'

  // Time on site for check-out: find last check_in before this check_out
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

  return {
    worker: {
      name:  `${worker.first_name} ${worker.last_name}`,
      photo: worker.avatar_url ?? null,
      trade: worker.trade ?? null,
    },
    event,
    compliance,
    timeOnSite,
  }
}
