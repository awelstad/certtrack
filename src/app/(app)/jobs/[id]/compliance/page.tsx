import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobComplianceTable } from '@/components/jobs/JobComplianceTable'
import { AssignWorkerForm } from '@/components/jobs/AssignWorkerForm'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { calculateWorkerJobStatus } from '@/lib/certifications'
import { ArrowLeft, Users } from 'lucide-react'
import type { Role, WorkerStatus, CertStatus } from '@/lib/types'
import type { WorkerCertForJob, CertComplianceStatus } from '@/lib/certifications'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function JobCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select('id, name, status')
    .eq('id', id)
    .single()

  if (!job) notFound()

  // Required cert types for this job
  const { data: requirements } = await supabase
    .from('job_required_certifications')
    .select('certification_type_id, certification_types(name)')
    .eq('job_id', id)

  const requiredTypeIds = requirements?.map((r) => r.certification_type_id) ?? []
  const certTypeNames = new Map<string, string>(
    (requirements ?? []).map((r) => [
      r.certification_type_id,
      (r.certification_types as unknown as { name: string } | null)?.name ?? 'Unknown',
    ])
  )

  // Workers assigned to this job
  const { data: jobWorkerRows } = await supabase
    .from('job_workers')
    .select('worker_id, workers(id, first_name, last_name, trade, employer, status, avatar_url)')
    .eq('job_id', id)

  const assignedWorkers = (jobWorkerRows ?? [])
    .map((row) => row.workers as unknown as {
      id: string; first_name: string; last_name: string
      trade: string | null; employer: string | null
      status: WorkerStatus; avatar_url: string | null
    } | null)
    .filter(Boolean) as Array<{
      id: string; first_name: string; last_name: string
      trade: string | null; employer: string | null
      status: WorkerStatus; avatar_url: string | null
    }>

  const assignedWorkerIds = new Set(assignedWorkers.map((w) => w.id))

  // All certs for assigned workers
  const certsByWorker = new Map<string, WorkerCertForJob[]>()
  if (assignedWorkers.length > 0) {
    const { data: allCerts } = await supabase
      .from('worker_certifications')
      .select('worker_id, certification_type_id, status, expiry_date')
      .in('worker_id', assignedWorkers.map((w) => w.id))

    allCerts?.forEach((c) => {
      if (!certsByWorker.has(c.worker_id)) certsByWorker.set(c.worker_id, [])
      certsByWorker.get(c.worker_id)!.push({
        certification_type_id: c.certification_type_id,
        status: c.status as CertStatus,
        expiry_date: c.expiry_date,
      })
    })
  }

  // Orientations required for this job (include_in_compliance only)
  const { data: requiredOrientations } = await supabase
    .from('orientation_modules')
    .select('id, title')
    .eq('job_id', id)
    .eq('include_in_compliance', true)

  const requiredOrientationIds = (requiredOrientations ?? []).map((o) => o.id)
  const orientationTitles = new Map<string, string>(
    (requiredOrientations ?? []).map((o) => [o.id, o.title])
  )

  // Signatures for compliance orientations
  const signedOrientationsByWorker = new Map<string, Set<string>>()
  if (assignedWorkers.length > 0 && requiredOrientationIds.length > 0) {
    const { data: signatures } = await supabase
      .from('orientation_signatures')
      .select('orientation_id, worker_id')
      .in('orientation_id', requiredOrientationIds)
      .in('worker_id', assignedWorkers.map((w) => w.id))

    signatures?.forEach((sig) => {
      if (!signedOrientationsByWorker.has(sig.worker_id)) {
        signedOrientationsByWorker.set(sig.worker_id, new Set())
      }
      signedOrientationsByWorker.get(sig.worker_id)!.add(sig.orientation_id)
    })
  }

  // Org workers not yet on this job (for assignment dropdown)
  const { data: orgWorkers } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'active')
    .order('last_name')

  const availableToAssign = (orgWorkers ?? []).filter((w) => !assignedWorkerIds.has(w.id))

  // Compliance summary counts (cert + orientation combined)
  let cleared = 0, expiring = 0, notCleared = 0
  for (const w of assignedWorkers) {
    const certStatus = calculateWorkerJobStatus(requiredTypeIds, certsByWorker.get(w.id) ?? [])
    const unsignedCount = requiredOrientationIds.filter(
      (oid) => !signedOrientationsByWorker.get(w.id)?.has(oid)
    ).length

    let finalStatus: CertComplianceStatus = certStatus
    if (unsignedCount > 0) finalStatus = 'red'

    if (finalStatus === 'green') cleared++
    else if (finalStatus === 'yellow') expiring++
    else notCleared++
  }

  const isManager = MANAGER_ROLES.includes(profile?.role as Role)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {job.name}
        </Link>
      </div>

      <PageHeader
        title="Compliance"
        description="Worker clearance status based on required certifications and orientations."
      />

      {/* No requirements warning */}
      {requiredTypeIds.length === 0 && requiredOrientationIds.length === 0 && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-sm font-medium text-yellow-800">
            No required certifications or orientations set for this job.{' '}
            <Link href={`/jobs/${id}/requirements`} className="underline">
              Add cert requirements
            </Link>{' '}
            or{' '}
            <Link href="/orientations/new" className="underline">
              create an orientation
            </Link>{' '}
            with compliance enabled.
          </p>
        </div>
      )}

      {/* Summary stats */}
      {assignedWorkers.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Cleared', value: cleared, status: 'green' as const },
            { label: 'Expiring Soon', value: expiring, status: 'yellow' as const },
            { label: 'Not Cleared', value: notCleared, status: 'red' as const },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <StatusBadge status={s.status} className="mt-1.5" />
            </div>
          ))}
        </div>
      )}

      {/* Compliance table */}
      {!assignedWorkers.length ? (
        <div className="mb-6 flex flex-col items-center rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
          <Users className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No workers assigned to this job yet.</p>
        </div>
      ) : (
        <div className="mb-6">
          <JobComplianceTable
            jobId={id}
            workers={assignedWorkers}
            certsByWorker={certsByWorker}
            requiredTypeIds={requiredTypeIds}
            certTypeNames={certTypeNames}
            isManager={isManager}
            requiredOrientationIds={requiredOrientationIds}
            signedOrientationsByWorker={signedOrientationsByWorker}
            orientationTitles={orientationTitles}
          />
        </div>
      )}

      {/* Assign worker — managers only */}
      {isManager && (
        <AssignWorkerForm jobId={id} availableWorkers={availableToAssign} />
      )}
    </div>
  )
}
