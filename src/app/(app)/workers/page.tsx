import Link from 'next/link'
import { cookies } from 'next/headers'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { WorkerCard } from '@/components/workers/WorkerCard'
import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { Users, Plus, Printer } from 'lucide-react'
import type { WorkerStatus, CertStatus } from '@/lib/types'

export default async function WorkersPage() {
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

  // Resolve worker IDs for the selected job
  let scopedWorkerIds: string[] | null = null
  let selectedJobName: string | null = null

  if (selectedJobId) {
    const [{ data: jobWorkers }, { data: jobRow }] = await Promise.all([
      supabase.from('job_workers').select('worker_id').eq('job_id', selectedJobId),
      supabase.from('jobs').select('name').eq('id', selectedJobId).single(),
    ])
    scopedWorkerIds = (jobWorkers ?? []).map((jw) => jw.worker_id)
    selectedJobName = jobRow?.name ?? null
  }

  let workers: typeof allWorkers = []
  let allWorkers: { id: string; first_name: string; last_name: string; trade: string | null; employer: string | null; status: string; avatar_url: string | null }[] = []

  if (scopedWorkerIds !== null && scopedWorkerIds.length === 0) {
    // Job exists but has no workers assigned
    workers = []
  } else {
    const query = supabase
      .from('workers')
      .select('id, first_name, last_name, trade, employer, status, avatar_url')
      .eq('organization_id', orgId)
      .order('last_name')

    const { data } = scopedWorkerIds
      ? await query.in('id', scopedWorkerIds)
      : await query

    allWorkers = data ?? []
    workers = allWorkers
  }

  // Fetch all certs in one query — no N+1
  const workerIds = workers.map((w) => w.id)
  const { data: allCerts } = workerIds.length
    ? await supabase
        .from('worker_certifications')
        .select('worker_id, status, expiry_date')
        .in('worker_id', workerIds)
    : { data: [] }

  const certsByWorker = new Map<string, Array<{ status: CertStatus; expiry_date: string | null }>>()
  allCerts?.forEach((c) => {
    if (!certsByWorker.has(c.worker_id)) certsByWorker.set(c.worker_id, [])
    certsByWorker.get(c.worker_id)!.push({ status: c.status as CertStatus, expiry_date: c.expiry_date })
  })

  const description = selectedJobName
    ? `Showing workers assigned to ${selectedJobName}.`
    : 'Manage field workers and their certifications.'

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Workers"
        description={description}
        action={
          <div className="flex gap-2">
            <Link
              href="/workers/badges"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print Badges
            </Link>
            <Link
              href="/workers/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Worker
            </Link>
          </div>
        }
      />

      {!workers.length ? (
        <EmptyState
          icon={Users}
          title={selectedJobName ? `No workers on ${selectedJobName}` : 'No workers yet'}
          description={
            selectedJobName
              ? 'No workers are currently assigned to this job.'
              : 'Add your first worker to get started tracking certifications and compliance.'
          }
          action={
            !selectedJobName ? (
              <Link
                href="/workers/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                Add Worker
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {workers.map((w) => (
              <WorkerCard
                key={w.id}
                worker={w as typeof w & { status: WorkerStatus }}
                certStatus={calculateWorkerOverallStatus(certsByWorker.get(w.id) ?? [])}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
