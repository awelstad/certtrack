import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddSubWorkerForm } from '@/components/sub/AddSubWorkerForm'
import { Briefcase, Users } from 'lucide-react'

export default async function SubPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, sub_company_name, sub_job_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'subcontractor_admin') notFound()

  // Fetch the assigned job
  const { data: job } = await supabase
    .from('jobs')
    .select('id, name, address, city, state')
    .eq('id', profile.sub_job_id ?? '')
    .single()

  // Workers this sub added to the job (filter by employer = sub company)
  const { data: workers } = await supabase
    .from('workers')
    .select('id, first_name, last_name, trade, email, phone, status, employer')
    .eq('organization_id', profile.organization_id)
    .eq('employer', profile.sub_company_name ?? '')

  const myWorkers = (workers ?? []) as Array<{
    id: string
    first_name: string
    last_name: string
    trade: string | null
    email: string | null
    phone: string | null
    status: string
  }>

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{profile.sub_company_name} Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your workers on this jobsite</p>
      </div>

      {/* Job card */}
      {job ? (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Briefcase className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{job.name}</p>
            {(job.address || job.city) && (
              <p className="text-sm text-slate-500">
                {[job.address, job.city, job.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          No job assigned to your account yet. Contact your GC to update the invite.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workers list */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Your Workers</h2>
            <span className="ml-auto text-xs text-slate-400">{myWorkers.length}</span>
          </div>
          {myWorkers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No workers added yet. Use the form to add your crew.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {myWorkers.map((w) => (
                <li key={w.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {w.first_name} {w.last_name}
                    </p>
                    {w.trade && <p className="text-xs text-slate-500">{w.trade}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    w.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add worker form */}
        <div>
          <AddSubWorkerForm />
        </div>
      </div>
    </div>
  )
}
