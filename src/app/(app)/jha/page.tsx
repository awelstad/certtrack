import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { JhaStatusBadge } from '@/components/jha/JhaStatusBadge'
import { ClipboardList, ChevronRight, Plus, LayoutTemplate } from 'lucide-react'

export default async function JhaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  let selectedJobName: string | null = null
  if (selectedJobId) {
    const { data: jobRow } = await supabase.from('jobs').select('name').eq('id', selectedJobId).single()
    selectedJobName = jobRow?.name ?? null
  }

  let jhaQuery = supabase
    .from('jhas')
    .select('id, title, status, work_date, jobs(name)')
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })

  if (selectedJobId) {
    jhaQuery = jhaQuery.eq('job_id', selectedJobId)
  }

  const { data: jhas } = await jhaQuery

  const isManager = ['owner', 'admin', 'pm', 'superintendent'].includes(profile?.role ?? '')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="JHA"
        description={selectedJobName ? `Showing JHAs for ${selectedJobName}.` : 'Create, review, and sign Job Hazard Analyses.'}
        action={
          isManager ? (
            <div className="flex gap-2">
              <Link
                href="/jha/templates"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:px-4"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Link>
              <Link
                href="/jha/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New JHA</span>
              </Link>
            </div>
          ) : undefined
        }
      />

      {!jhas?.length ? (
        <EmptyState
          icon={ClipboardList}
          title={selectedJobName ? `No JHAs for ${selectedJobName}` : 'No JHAs yet'}
          description={selectedJobName ? 'No JHAs have been created for this job.' : 'Create a Job Hazard Analysis to document hazards, controls, and worker sign-offs.'}
          action={
            isManager ? (
              <Link
                href="/jha/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                New JHA
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {jhas.map((jha) => {
              const job = jha.jobs as unknown as { name: string } | null
              return (
                <li key={jha.id}>
                  <Link
                    href={`/jha/${jha.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                      <ClipboardList className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{jha.title}</p>
                      <p className="truncate text-sm text-slate-500">
                        {job?.name ?? 'No job assigned'}
                        {jha.work_date && ` · ${new Date(jha.work_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <JhaStatusBadge status={jha.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
