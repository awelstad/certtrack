'use server'

import { createClient } from '@/lib/supabase/server'

export async function logAttendance(
  publicId: string,
  jobId: string
): Promise<{
  error?: string
  worker?: { name: string; photo: string | null; trade: string | null }
  event?: 'check_in' | 'check_out'
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

  // Determine next event: opposite of last event today
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: lastRow } = await supabase
    .from('site_attendance')
    .select('event')
    .eq('worker_id', worker.id)
    .eq('job_id', jobId)
    .gte('scanned_at', todayStart.toISOString())
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const event: 'check_in' | 'check_out' =
    lastRow?.event === 'check_in' ? 'check_out' : 'check_in'

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

  return {
    worker: {
      name:  `${worker.first_name} ${worker.last_name}`,
      photo: worker.avatar_url ?? null,
      trade: worker.trade ?? null,
    },
    event,
  }
}
