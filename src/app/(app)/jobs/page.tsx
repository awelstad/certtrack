import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Briefcase, Plus, ChevronRight, MapPin } from 'lucide-react'
import type { JobStatus } from '@/lib/types'

const statusVariant: Record<JobStatus, 'green' | 'slate' | 'red' | 'yellow'> = {
  active: 'green',
  completed: 'slate',
  on_hold: 'yellow',
  cancelled: 'red',
}

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name, address, city, state, status, start_date')
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Jobs"
        description="Manage job sites and their compliance requirements."
        action={
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            New Job
          </Link>
        }
      />

      {!jobs?.length ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create a job site to manage worker compliance, required certifications, and JHAs."
          action={
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              New Job
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                    <Briefcase className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{job.name}</p>
                    {(job.city || job.address) && (
                      <p className="flex items-center gap-1 truncate text-sm text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[job.address, job.city, job.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <Badge label={job.status.replace('_', ' ')} variant={statusVariant[job.status as JobStatus]} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
