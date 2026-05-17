import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import { SubInviteForm } from '@/components/sub/SubInviteForm'

export default async function JobSubsPage({
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

  if (!profile || !['owner', 'admin', 'pm', 'superintendent'].includes(profile.role)) notFound()

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!job) notFound()

  const { data: invites } = await supabase
    .from('subcontractor_invites')
    .select('id, company_name, email, status, created_at')
    .eq('organization_id', profile.organization_id)
    .eq('job_id', id)
    .order('created_at', { ascending: false })

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {job.name}
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-slate-900">Subcontractors — {job.name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Invite form */}
        <SubInviteForm jobId={id} jobs={jobs ?? []} />

        {/* Invite list */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Sent Invites</h2>
          </div>
          {!invites || invites.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No invites sent yet for this job.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inv.company_name}</p>
                    <p className="text-xs text-slate-500">{inv.email}</p>
                  </div>
                  {inv.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Accepted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                      <Clock className="h-3.5 w-3.5" />
                      Pending
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
