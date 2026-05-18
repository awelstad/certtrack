import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Users } from 'lucide-react'
import { JobWorkerManager } from './JobWorkerManager'
import type { Role } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ALLOWED: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export default async function JobWorkersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !ALLOWED.includes(profile.role as Role)) notFound()

  const admin = createAdminClient()

  const [{ data: job }, { data: assignedRows }, { data: allOrgWorkers }] = await Promise.all([
    admin.from('jobs').select('name').eq('id', jobId).eq('organization_id', profile.organization_id).single(),
    admin
      .from('job_workers')
      .select('worker_id, workers(id, first_name, last_name, trade, employer, avatar_url)')
      .eq('job_id', jobId),
    admin
      .from('workers')
      .select('id, first_name, last_name, trade, employer, avatar_url')
      .eq('organization_id', profile.organization_id)
      .order('first_name'),
  ])

  if (!job) notFound()

  type WorkerRow = {
    id: string
    first_name: string
    last_name: string
    trade: string | null
    employer: string | null
    avatar_url: string | null
  }

  const assignedIds = new Set((assignedRows ?? []).map((r) => r.worker_id))
  const assigned = (assignedRows ?? [])
    .map((r) => r.workers as unknown as WorkerRow)
    .filter(Boolean)
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))

  const available = (allOrgWorkers ?? []).filter((w) => !assignedIds.has(w.id)) as WorkerRow[]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${jobId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {job.name}
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
          <Users className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Roster</h1>
          <p className="text-sm text-slate-500">
            Workers assigned to {job.name}. Auto-populated when workers complete orientation or scan in for the first time.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <JobWorkerManager
          jobId={jobId}
          assigned={assigned}
          available={available}
        />
      </div>
    </div>
  )
}
