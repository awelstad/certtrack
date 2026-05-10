import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CalendarView } from './CalendarView'
import type { CertEvent } from './CalendarView'

export default async function CertCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()
  const orgId = profile!.organization_id

  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  let workerIds: string[] | null = null
  if (selectedJobId) {
    const { data: jw } = await supabase
      .from('job_workers')
      .select('worker_id')
      .eq('job_id', selectedJobId)
    workerIds = (jw ?? []).map(r => r.worker_id)
  }

  // Empty job with no workers
  if (workerIds !== null && workerIds.length === 0) {
    return <CalendarView events={[]} />
  }

  let query = supabase
    .from('worker_certifications')
    .select('id, expiry_date, worker_id, workers(id, first_name, last_name), certification_types(name)')
    .eq('organization_id', orgId)
    .eq('status', 'approved')
    .not('expiry_date', 'is', null)
    .order('expiry_date')

  if (workerIds !== null) {
    query = query.in('worker_id', workerIds)
  }

  const { data: certs } = await query

  const events: CertEvent[] = (certs ?? []).map(c => {
    const w  = c.workers as unknown as { id: string; first_name: string; last_name: string } | null
    const ct = c.certification_types as unknown as { name: string } | null
    return {
      id: c.id,
      expiry_date: c.expiry_date!,
      worker_id: w?.id ?? '',
      worker_name: w ? `${w.first_name} ${w.last_name}` : '—',
      cert_name: ct?.name ?? '—',
    }
  })

  return <CalendarView events={events} />
}
