import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, ChevronRight, Plus, Users } from 'lucide-react'

const PAGE_SIZE = 50

export default async function OrientationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

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

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let orientationQuery = supabase
    .from('orientation_modules')
    .select('id, title, is_required, include_in_compliance, job_id, jobs(name)', { count: 'exact' })
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (selectedJobId) {
    // Show this job's orientations + general (no job) orientations
    orientationQuery = orientationQuery.or(`job_id.eq.${selectedJobId},job_id.is.null`)
  }

  const { data: orientations, count } = await orientationQuery
  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Fetch sign-off counts in one query
  const orientationIds = (orientations ?? []).map((o) => o.id)
  const signatureCounts = new Map<string, number>()
  if (orientationIds.length > 0) {
    const { data: sigs } = await supabase
      .from('orientation_signatures')
      .select('orientation_id')
      .in('orientation_id', orientationIds)

    sigs?.forEach((s) => {
      signatureCounts.set(s.orientation_id, (signatureCounts.get(s.orientation_id) ?? 0) + 1)
    })
  }

  const isManager = ['owner', 'admin', 'pm', 'superintendent'].includes(profile?.role ?? '')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Orientations"
        description={selectedJobName ? `Showing orientations for ${selectedJobName} and general orientations.` : 'Site orientation documents for workers to review and acknowledge.'}
        action={
          isManager ? (
            <Link
              href="/orientations/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              New Orientation
            </Link>
          ) : undefined
        }
      />

      {!orientations?.length ? (
        <EmptyState
          icon={BookOpen}
          title="No orientations yet"
          description="Create site orientation content for workers to review and acknowledge before starting work."
          action={
            isManager ? (
              <Link
                href="/orientations/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                New Orientation
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {orientations.map((o) => {
              const job = o.jobs as unknown as { name: string } | null
              const count = signatureCounts.get(o.id) ?? 0
              return (
                <li key={o.id}>
                  <Link
                    href={`/orientations/${o.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{o.title}</p>
                      <p className="truncate text-sm text-slate-500">
                        {job ? job.name : 'All workers'}
                        {o.include_in_compliance && ' · Counts toward compliance'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {o.is_required && <Badge label="Required" variant="red" />}
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        <Users className="h-3 w-3" />
                        {count}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} basePath="/orientations" />
        </div>
      )}
    </div>
  )
}
