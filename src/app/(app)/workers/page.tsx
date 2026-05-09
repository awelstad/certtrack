import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { WorkerCard } from '@/components/workers/WorkerCard'
import { createClient } from '@/lib/supabase/server'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { Users, Plus } from 'lucide-react'
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

  const { data: workers } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade, employer, status, avatar_url')
    .eq('organization_id', orgId)
    .order('last_name')

  // Fetch all certs in one query — no N+1
  const workerIds = workers?.map((w) => w.id) ?? []
  const { data: allCerts } = workerIds.length
    ? await supabase
        .from('worker_certifications')
        .select('worker_id, status, expiry_date')
        .in('worker_id', workerIds)
    : { data: [] }

  // Group certs by worker
  const certsByWorker = new Map<string, Array<{ status: CertStatus; expiry_date: string | null }>>()
  allCerts?.forEach((c) => {
    if (!certsByWorker.has(c.worker_id)) certsByWorker.set(c.worker_id, [])
    certsByWorker.get(c.worker_id)!.push({ status: c.status as CertStatus, expiry_date: c.expiry_date })
  })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Workers"
        description="Manage field workers and their certifications."
        action={
          <Link
            href="/workers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Worker
          </Link>
        }
      />

      {!workers?.length ? (
        <EmptyState
          icon={Users}
          title="No workers yet"
          description="Add your first worker to get started tracking certifications and compliance."
          action={
            <Link
              href="/workers/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Worker
            </Link>
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
