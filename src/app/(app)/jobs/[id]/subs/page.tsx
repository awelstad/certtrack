import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, CheckCircle, Clock, Users, Award, QrCode, Printer,
  ChevronDown, HardHat, Mail,
} from 'lucide-react'
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

  // All workers assigned to this job
  const { data: jobWorkerRows } = await supabase
    .from('job_workers')
    .select('worker_id')
    .eq('job_id', id)

  const workerIds = (jobWorkerRows ?? []).map((r) => r.worker_id)

  type WorkerRow = {
    id: string
    first_name: string
    last_name: string
    trade: string | null
    employer: string | null
    status: string
    public_id: string
  }

  let allWorkers: WorkerRow[] = []
  if (workerIds.length > 0) {
    const { data } = await supabase
      .from('workers')
      .select('id, first_name, last_name, trade, employer, status, public_id')
      .in('id', workerIds)
      .order('last_name')
    allWorkers = (data ?? []) as WorkerRow[]
  }

  // All sub invites for this job
  const { data: invites } = await supabase
    .from('subcontractor_invites')
    .select('company_name, email, status')
    .eq('organization_id', profile.organization_id)
    .eq('job_id', id)

  const inviteMap = new Map(
    (invites ?? []).map((inv) => [inv.company_name, inv])
  )

  // Group workers by employer
  const subMap = new Map<string, WorkerRow[]>()
  const unaffiliated: WorkerRow[] = []

  for (const w of allWorkers) {
    if (w.employer) {
      const group = subMap.get(w.employer) ?? []
      group.push(w)
      subMap.set(w.employer, group)
    } else {
      unaffiliated.push(w)
    }
  }

  // Merge invite companies that have no workers yet
  for (const inv of invites ?? []) {
    if (!subMap.has(inv.company_name)) {
      subMap.set(inv.company_name, [])
    }
  }

  const subEntries = Array.from(subMap.entries()).sort(([a], [b]) => a.localeCompare(b))

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

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Subcontractors — {job.name}</h1>
        <span className="text-sm text-slate-500">{subEntries.length} sub{subEntries.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Invite form */}
      <details className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 select-none">
          <Mail className="h-4 w-4 text-orange-500" />
          Invite a Subcontractor
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
        </summary>
        <div className="border-t border-slate-100 p-5">
          <SubInviteForm jobId={id} jobs={jobs ?? []} />
        </div>
      </details>

      {/* Sub company cards */}
      {subEntries.length === 0 && unaffiliated.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <HardHat className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No subcontractors yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Use the form above to invite a sub. Once they accept, their workers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subEntries.map(([company, workers]) => {
            const invite = inviteMap.get(company)
            return (
              <div key={company} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                    <HardHat className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{company}</p>
                    {invite && (
                      <p className="text-xs text-slate-500">{invite.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {workers.length} worker{workers.length !== 1 ? 's' : ''}
                    </span>
                    {invite ? (
                      invite.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" /> Invite Pending
                        </span>
                      )
                    ) : null}
                    {workers.length > 0 && (
                      <Link
                        href={`/workers/print/hardhat-qr?job_id=${id}&employer=${encodeURIComponent(company)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print All QR
                      </Link>
                    )}
                  </div>
                </div>

                {/* Worker rows */}
                {workers.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-400">
                    No workers added yet — waiting for the sub to log in and add their crew.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Worker</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Trade</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workers.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {w.first_name} {w.last_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                            {w.trade ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              w.status === 'active'
                                ? 'bg-green-50 text-green-700'
                                : w.status === 'suspended'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-500'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/workers/${w.id}/certifications`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                <Award className="h-3.5 w-3.5" />
                                Certs
                              </Link>
                              <Link
                                href={`/workers/${w.id}`}
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                              >
                                <QrCode className="h-3.5 w-3.5" />
                                QR
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}

          {/* Unaffiliated workers (no employer set) */}
          {unaffiliated.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                  <Users className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Unaffiliated Workers</p>
                  <p className="text-xs text-slate-500">Workers on this job with no sub company assigned</p>
                </div>
                <span className="text-xs text-slate-400">{unaffiliated.length}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {unaffiliated.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {w.first_name} {w.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{w.trade ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/workers/${w.id}/certifications`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                            <Award className="h-3.5 w-3.5" /> Certs
                          </Link>
                          <Link href={`/workers/${w.id}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
                            <QrCode className="h-3.5 w-3.5" /> QR
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
