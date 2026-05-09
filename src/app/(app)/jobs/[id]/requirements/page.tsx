import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddRequirementForm } from '@/components/jobs/AddRequirementForm'
import { RemoveRequirementButton } from '@/components/jobs/RemoveRequirementButton'
import { ArrowLeft, Award } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function JobRequirementsPage({
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
    .select('id, name')
    .eq('id', id)
    .single()

  if (!job) notFound()

  // Current requirements for this job
  const { data: requirements } = await supabase
    .from('job_required_certifications')
    .select('id, certification_type_id, certification_types(name, validity_days)')
    .eq('job_id', id)
    .order('created_at')

  // All cert types for this org
  const { data: allCertTypes } = await supabase
    .from('certification_types')
    .select('id, name')
    .eq('organization_id', profile!.organization_id)
    .order('name')

  // Cert types not yet required for this job
  const requiredIds = new Set(requirements?.map((r) => r.certification_type_id) ?? [])
  const available = (allCertTypes ?? []).filter((ct) => !requiredIds.has(ct.id))

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
        title="Required Certifications"
        description="Certifications all workers must hold to be cleared for this job."
      />

      {/* Add form — managers only */}
      {isManager && available.length > 0 && (
        <div className="mb-6">
          <AddRequirementForm jobId={id} availableCertTypes={available} />
        </div>
      )}

      {isManager && (allCertTypes ?? []).length === 0 && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          No certification types exist yet.{' '}
          <Link href="/certifications" className="underline">
            Create certification types
          </Link>{' '}
          first.
        </div>
      )}

      {/* Current requirements */}
      {!requirements?.length ? (
        <EmptyState
          icon={Award}
          title="No requirements set"
          description="Add certification requirements to track which workers are cleared for this job."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {requirements.map((r) => {
              const ct = r.certification_types as unknown as { name: string; validity_days: number | null } | null
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <Award className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{ct?.name ?? '—'}</p>
                    <p className="text-sm text-slate-500">
                      {ct?.validity_days ? `Valid ${ct.validity_days} days` : 'No expiry'}
                    </p>
                  </div>
                  {isManager && (
                    <RemoveRequirementButton requirementId={r.id} jobId={id} />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
