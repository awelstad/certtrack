import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Briefcase, ScanLine, UserCheck, Users, ChevronRight, Package, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AttendanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kiosk_kit?: string }>
}) {
  const params = await searchParams
  const kioskOrdered = params.kiosk_kit === 'ordered'
  const kioskError = params.kiosk_kit === 'error' || params.kiosk_kit === 'unavailable'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.organization_id

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [{ data: jobs }, { data: allToday }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, name, address, city')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('site_attendance')
      .select('worker_id, job_id, event')
      .eq('organization_id', orgId)
      .gte('scanned_at', todayStart.toISOString())
      .order('scanned_at', { ascending: true }),
  ])

  // Per-job: on-site now (last event = check_in) and through-day (any scan)
  const lastEventByKey: Record<string, { event: string; jobId: string }> = {}
  const throughDayByJob: Record<string, Set<string>> = {}

  for (const row of allToday ?? []) {
    const key = `${row.worker_id}-${row.job_id}`
    lastEventByKey[key] = { event: row.event, jobId: row.job_id }
    if (!throughDayByJob[row.job_id]) throughDayByJob[row.job_id] = new Set()
    throughDayByJob[row.job_id].add(row.worker_id)
  }

  const onSiteByJob: Record<string, number> = {}
  for (const { event, jobId } of Object.values(lastEventByKey)) {
    if (event === 'check_in') onSiteByJob[jobId] = (onSiteByJob[jobId] ?? 0) + 1
  }

  const totalOnSite = Object.values(onSiteByJob).reduce((a, b) => a + b, 0)
  const totalToday  = Object.values(throughDayByJob).reduce((a, s) => a + s.size, 0)

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const canOrderKit = profile?.role === 'owner' || profile?.role === 'admin'

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Site Attendance"
        description={dateLabel}
        action={
          <Link
            href="/kiosk"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ScanLine className="h-4 w-4 text-orange-500" />
            Launch Kiosk
          </Link>
        }
      />

      {/* Kiosk kit error banner */}
      {kioskError && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <span className="mt-0.5 text-red-500 text-lg leading-none">!</span>
          <div>
            <p className="font-semibold text-red-800">Checkout couldn&apos;t be started</p>
            <p className="text-sm text-red-700">
              Something went wrong. Please try again or contact{' '}
              <a href="mailto:support@clearworkers.com" className="underline font-medium">support@clearworkers.com</a>.
            </p>
          </div>
        </div>
      )}

      {/* Kiosk kit ordered success banner */}
      {kioskOrdered && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold text-green-800">Kiosk kit ordered!</p>
            <p className="text-sm text-green-700">
              You&apos;ll receive a confirmation email with tracking. Once it arrives, use{' '}
              <Link href="/kiosk" className="underline font-medium">Launch Kiosk</Link> to go live.
            </p>
          </div>
        </div>
      )}

      {/* Summary banner */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-green-800">{totalOnSite}</p>
            <p className="text-sm font-semibold text-green-700">On Site Now</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Users className="h-6 w-6 text-slate-500" />
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums text-slate-800">{totalToday}</p>
            <p className="text-sm font-semibold text-slate-500">Total Through Day</p>
          </div>
        </div>
      </div>

      {/* Kiosk kit upsell — admin/owner only */}
      {canOrderKit && !kioskOrdered && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900">
            <Package className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">Add a hardware kiosk to your site</p>
            <p className="text-sm text-slate-500">
              Tablet, Bluetooth barcode scanner, and floor stand shipped to your door — ready to scan helmet QRs in minutes. Includes a 1-hour onboarding call. <span className="font-medium text-slate-700">$599 one-time per site.</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <a
              href="/api/stripe/kiosk-kit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Package className="h-4 w-4" />
              Order Kiosk Kit — $599
            </a>
            <span className="text-xs text-slate-400 text-center sm:text-right">One-time charge, no subscription</span>
          </div>
        </div>
      )}

      {/* Jobs list */}
      {!(jobs ?? []).length ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
          No active jobs. <Link href="/jobs/new" className="text-orange-500 hover:underline">Create one →</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {(jobs ?? []).map((job) => {
              const onSite    = onSiteByJob[job.id] ?? 0
              const throughDay = throughDayByJob[job.id]?.size ?? 0
              const location  = [job.address, job.city].filter(Boolean).join(', ')
              return (
                <li key={job.id}>
                  <Link
                    href={`/attendance/${job.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${onSite > 0 ? 'bg-green-50' : 'bg-slate-100'}`}>
                      <Briefcase className={`h-5 w-5 ${onSite > 0 ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{job.name}</p>
                      {location && <p className="truncate text-xs text-slate-400">{location}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {onSite > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          <UserCheck className="h-3 w-3" />
                          {onSite} on site
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No one on site</span>
                      )}
                      {throughDay > 0 && (
                        <span className="text-xs text-slate-400">{throughDay} total today</span>
                      )}
                    </div>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-slate-300" />
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
