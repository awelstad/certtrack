import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { OrientationSignoffForm } from '@/components/orientations/OrientationSignoffForm'
import { EditOrientationForm } from '@/components/orientations/EditOrientationForm'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function OrientationDetailPage({
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

  const { data: orientation } = await supabase
    .from('orientation_modules')
    .select('id, title, content, is_required, include_in_compliance, job_id, created_at, jobs(id, name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!orientation) notFound()

  const job = orientation.jobs as unknown as { id: string; name: string } | null
  const isManager = MANAGER_ROLES.includes(profile?.role as Role)

  // Find the current user's worker record (to determine if they can sign)
  const { data: myWorker } = await supabase
    .from('workers')
    .select('id')
    .eq('profile_id', user!.id)
    .eq('organization_id', profile!.organization_id)
    .maybeSingle()

  // Check if current user has already signed
  let mySignature: { signed_at: string } | null = null
  if (myWorker) {
    const { data: sig } = await supabase
      .from('orientation_signatures')
      .select('signed_at')
      .eq('orientation_id', id)
      .eq('worker_id', myWorker.id)
      .maybeSingle()
    mySignature = sig ?? null
  }

  // All signatures for this orientation (for managers to see)
  const { data: allSignatures } = await supabase
    .from('orientation_signatures')
    .select('worker_id, signed_at, workers(id, first_name, last_name, trade, employer, avatar_url)')
    .eq('orientation_id', id)
    .order('signed_at', { ascending: false })

  const signedWorkerIds = new Set((allSignatures ?? []).map((s) => s.worker_id))

  // If job-specific, fetch assigned workers to show who hasn't signed
  let jobWorkers: Array<{
    id: string
    first_name: string
    last_name: string
    trade: string | null
    employer: string | null
    avatar_url: string | null
  }> = []

  if (orientation.job_id && isManager) {
    const { data: rows } = await supabase
      .from('job_workers')
      .select('worker_id, workers(id, first_name, last_name, trade, employer, avatar_url)')
      .eq('job_id', orientation.job_id)

    jobWorkers = (rows ?? [])
      .map((r) => r.workers as unknown as typeof jobWorkers[0] | null)
      .filter(Boolean) as typeof jobWorkers
  }

  const unsignedJobWorkers = jobWorkers.filter((w) => !signedWorkerIds.has(w.id))

  // Jobs list for the edit form
  const { data: orgJobs } = isManager
    ? await supabase
        .from('jobs')
        .select('id, name')
        .eq('organization_id', profile!.organization_id)
        .eq('status', 'active')
        .order('name')
    : { data: null }

  const canSign = !!myWorker && !mySignature

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/orientations"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Orientations
        </Link>
      </div>

      <PageHeader
        title={orientation.title}
        description={job ? `Job: ${job.name}` : 'Applies to all workers in your organization'}
      />

      {/* Badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        {orientation.is_required && <Badge label="Required" variant="red" />}
        {orientation.include_in_compliance && <Badge label="Counts toward compliance" variant="blue" />}
        {job && <Badge label={job.name} variant="slate" />}
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Orientation content */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Orientation Content</h2>
          </div>
          {orientation.content ? (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {orientation.content}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No content has been added yet.</p>
          )}
        </div>

        {/* Sign-off form — for workers with a linked account */}
        {myWorker ? (
          <OrientationSignoffForm
            orientationId={id}
            alreadySigned={!!mySignature}
            signedAt={mySignature?.signed_at ?? null}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">
              Your account is not linked to a worker record. Ask an admin to link it so you can sign orientations.
            </p>
          </div>
        )}

        {/* Sign-off tracking — managers only */}
        {isManager && (
          <>
            {/* Missing sign-offs (job-specific only) */}
            {orientation.job_id && unsignedJobWorkers.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-red-800">
                  Missing Sign-offs ({unsignedJobWorkers.length})
                </h2>
                <ul className="space-y-2">
                  {unsignedJobWorkers.map((w) => {
                    const initials = `${w.first_name[0]}${w.last_name[0]}`
                    return (
                      <li key={w.id} className="flex items-center gap-3">
                        {w.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.avatar_url}
                            alt={initials}
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 text-xs font-semibold text-red-700">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-red-900">
                            {w.first_name} {w.last_name}
                          </p>
                          {w.trade && (
                            <p className="text-xs text-red-600">{w.trade}</p>
                          )}
                        </div>
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Completed sign-offs */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    Signed ({allSignatures?.length ?? 0})
                  </h2>
                </div>
              </div>

              {!allSignatures?.length ? (
                <p className="px-6 py-4 text-sm text-slate-500">No workers have signed yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {allSignatures.map((sig) => {
                    const w = sig.workers as unknown as {
                      id: string; first_name: string; last_name: string
                      trade: string | null; avatar_url: string | null
                    } | null
                    if (!w) return null
                    const initials = `${w.first_name[0]}${w.last_name[0]}`
                    const date = new Date(sig.signed_at).toLocaleString()
                    return (
                      <li key={sig.worker_id} className="flex items-center gap-3 px-6 py-3.5">
                        {w.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.avatar_url}
                            alt={initials}
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {w.first_name} {w.last_name}
                          </p>
                          {w.trade && <p className="text-xs text-slate-500">{w.trade}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <p className="text-xs font-medium text-green-700">Signed</p>
                            <p className="text-[10px] text-slate-400">{date}</p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Edit form */}
            <EditOrientationForm
              orientationId={id}
              initialTitle={orientation.title}
              initialContent={orientation.content ?? null}
              initialJobId={orientation.job_id ?? null}
              initialIsRequired={orientation.is_required}
              initialIncludeInCompliance={orientation.include_in_compliance}
              jobs={orgJobs ?? []}
            />
          </>
        )}
      </div>
    </div>
  )
}
