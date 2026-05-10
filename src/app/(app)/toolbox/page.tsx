import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShieldCheck, Plus, ChevronRight, LayoutTemplate, Users, CalendarDays } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function ToolboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.organization_id
  const isManager = MANAGER_ROLES.includes(profile!.role as Role)

  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  // Fetch talks
  let query = supabase
    .from('toolbox_talks')
    .select('id, title, topic, talk_date, status, conducted_by, public_token, jobs(name)')
    .eq('organization_id', orgId)
    .order('talk_date', { ascending: false })

  if (selectedJobId) {
    query = query.eq('job_id', selectedJobId)
  }

  const { data: talks } = await query

  // Fetch signature counts per talk
  const talkIds = (talks ?? []).map(t => t.id)
  const { data: sigCounts } = talkIds.length
    ? await supabase
        .from('toolbox_talk_signatures')
        .select('talk_id')
        .in('talk_id', talkIds)
    : { data: [] }

  const sigMap = new Map<string, number>()
  sigCounts?.forEach(s => sigMap.set(s.talk_id, (sigMap.get(s.talk_id) ?? 0) + 1))

  // Yearly stats
  const thisYear = new Date().getFullYear()
  const yearTalks = (talks ?? []).filter(t => new Date(t.talk_date).getFullYear() === thisYear)
  const totalSigsThisYear = yearTalks.reduce((acc, t) => acc + (sigMap.get(t.id) ?? 0), 0)

  // Per-month count for this year
  const byMonth = Array(12).fill(0)
  yearTalks.forEach(t => {
    const m = new Date(t.talk_date).getMonth()
    byMonth[m]++
  })
  const maxMonth = Math.max(...byMonth, 1)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Toolbox Talks"
        description="Daily safety briefings with digital sign-off. Workers sign via QR — no login needed."
        action={
          isManager ? (
            <div className="flex gap-2">
              <Link
                href="/toolbox/templates"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:px-4"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Link>
              <Link
                href="/toolbox/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Talk</span>
              </Link>
            </div>
          ) : undefined
        }
      />

      {/* Yearly stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{thisYear} — Total Talks</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{yearTalks.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{thisYear} — Total Attendees</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{totalSigsThisYear}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-medium text-slate-500">Talks per month</p>
          <div className="flex items-end gap-0.5 h-8">
            {byMonth.map((count, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm bg-orange-400"
                  style={{ height: `${Math.round((count / maxMonth) * 28)}px`, minHeight: count > 0 ? '4px' : '0px' }}
                  title={`${MONTH_NAMES[i]}: ${count}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-400">
            <span>Jan</span><span>Jun</span><span>Dec</span>
          </div>
        </div>
      </div>

      {/* Talk list */}
      {!talks?.length ? (
        <EmptyState
          icon={ShieldCheck}
          title="No toolbox talks yet"
          description="Create a toolbox talk, share the QR code, and have your crew sign off on their phones."
          action={
            isManager ? (
              <Link
                href="/toolbox/new"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                New Talk
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {talks.map((talk) => {
              const job = talk.jobs as unknown as { name: string } | null
              const sigCount = sigMap.get(talk.id) ?? 0
              const isCompleted = talk.status === 'completed'
              return (
                <li key={talk.id}>
                  <Link
                    href={`/toolbox/${talk.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isCompleted ? 'bg-green-50' : 'bg-orange-50'}`}>
                      <ShieldCheck className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-orange-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{talk.title}</p>
                      <p className="truncate text-sm text-slate-500">
                        <CalendarDays className="mr-1 inline h-3 w-3" />
                        {new Date(talk.talk_date + 'T00:00:00').toLocaleDateString()}
                        {job && ` · ${job.name}`}
                        {talk.conducted_by && ` · ${talk.conducted_by}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {sigCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          <Users className="h-3 w-3" />{sigCount}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isCompleted ? 'Completed' : 'Active'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
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
