import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ComplianceRing } from '@/components/dashboard/ComplianceRing'
import { CertExpiryChart } from '@/components/dashboard/CertExpiryChart'
import {
  AlertTriangle, Clock, XCircle, ShieldOff, Users,
  ClipboardList, FileCheck, PenLine, Wrench, AlertCircle,
  CalendarClock, FileText, ChevronRight, ShieldCheck,
  HardHat, Briefcase, Award, BookOpen,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Stat card ─────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'warning' | 'info' | 'good' | 'neutral'

function StatCard({
  label, value, href, icon: Icon, severity, note,
}: {
  label: string; value: number; href: string; icon: React.ElementType
  severity: Severity; note?: string
}) {
  const styles: Record<Severity, { card: string; icon: string; val: string; lbl: string }> = {
    critical: { card: 'border-red-200 bg-red-50 hover:bg-red-100',       icon: 'bg-red-100 text-red-600',    val: 'text-red-800',    lbl: 'text-red-700' },
    warning:  { card: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100', icon: 'bg-yellow-100 text-yellow-600', val: 'text-yellow-800', lbl: 'text-yellow-700' },
    info:     { card: 'border-blue-200 bg-blue-50 hover:bg-blue-100',     icon: 'bg-blue-100 text-blue-600',   val: 'text-blue-800',   lbl: 'text-blue-700' },
    good:     { card: 'border-green-200 bg-green-50 hover:bg-green-100',  icon: 'bg-green-100 text-green-600', val: 'text-green-800',  lbl: 'text-green-700' },
    neutral:  { card: 'border-slate-200 bg-white hover:bg-slate-50',      icon: 'bg-slate-100 text-slate-500', val: 'text-slate-800',  lbl: 'text-slate-500' },
  }

  const active = value > 0 && severity !== 'neutral' && severity !== 'good'
  const s = active ? styles[severity] : styles.neutral

  return (
    <Link href={href} className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${s.card}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none tabular-nums ${s.val}`}>{value}</p>
        <p className={`mt-1.5 text-xs font-semibold leading-tight ${s.lbl}`}>{label}</p>
        {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
      </div>
      <ChevronRight className="mt-auto h-4 w-4 self-end text-slate-300 transition-colors group-hover:text-slate-500" />
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{children}</h2>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.organization_id
  const today = new Date().toISOString().split('T')[0]
  const in7d  = new Date(Date.now() +   7 * 864e5).toISOString().split('T')[0]
  const in30d = new Date(Date.now() +  30 * 864e5).toISOString().split('T')[0]
  const in60d = new Date(Date.now() +  60 * 864e5).toISOString().split('T')[0]
  const in180d = new Date(Date.now() + 180 * 864e5).toISOString().split('T')[0]

  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  let scopedWorkerIds: string[] | null = null
  let selectedJobName: string | null = null

  if (selectedJobId) {
    const [{ data: jobWorkers }, { data: jobRow }] = await Promise.all([
      supabase.from('job_workers').select('worker_id').eq('job_id', selectedJobId),
      supabase.from('jobs').select('name').eq('id', selectedJobId).single(),
    ])
    scopedWorkerIds = (jobWorkers ?? []).map((jw) => jw.worker_id)
    selectedJobName = jobRow?.name ?? null
  }

  const hasWorkers = scopedWorkerIds === null || scopedWorkerIds.length > 0

  function certQ() {
    const q = supabase.from('worker_certifications').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
    return scopedWorkerIds ? q.in('worker_id', scopedWorkerIds) : q
  }

  // ── All data in parallel ───────────────────────────────────────────────────
  const [
    // cert counts
    { count: expiredCount },
    { count: expiringCount },
    { count: pendingCount },
    { count: rejectedCount },
    { data: notClearedCerts },
    // workers
    { count: activeWorkerCount },
    // jha
    { data: jhaList },
    // equipment
    { count: oosCount },
    { count: failedInspCount },
    { count: dueSoonCount },
    // cert expiry data for chart
    { data: expiringRaw },
    // activity feed
    { data: recentCerts },
    { data: recentInspections },
    { data: recentTalks },
    // active jobs
    { data: activeJobs },
    // toolbox count this month
    { count: toolboxMonthCount },
  ] = await Promise.all([
    hasWorkers ? certQ().eq('status', 'approved').lt('expiry_date', today) : Promise.resolve({ count: 0 }),
    hasWorkers ? certQ().eq('status', 'approved').gte('expiry_date', today).lte('expiry_date', in30d) : Promise.resolve({ count: 0 }),
    hasWorkers ? certQ().eq('status', 'pending') : Promise.resolve({ count: 0 }),
    hasWorkers ? certQ().eq('status', 'rejected') : Promise.resolve({ count: 0 }),
    hasWorkers
      ? (() => { const q = supabase.from('worker_certifications').select('worker_id').eq('organization_id', orgId).or(`status.eq.rejected,and(status.eq.approved,expiry_date.lt.${today})`); return scopedWorkerIds ? q.in('worker_id', scopedWorkerIds) : q })()
      : Promise.resolve({ data: [] }),
    scopedWorkerIds
      ? (scopedWorkerIds.length ? supabase.from('workers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').in('id', scopedWorkerIds) : Promise.resolve({ count: 0 }))
      : supabase.from('workers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    selectedJobId
      ? supabase.from('jhas').select('status').eq('organization_id', orgId).eq('job_id', selectedJobId)
      : supabase.from('jhas').select('status').eq('organization_id', orgId),
    supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'out_of_service'),
    supabase.from('equipment_inspections').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['fail', 'out_of_service']),
    supabase.from('equipment').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active').or(`next_inspection_due.lte.${in7d},last_inspection_at.is.null`),
    // expiry chart — certs expiring in next 180 days
    hasWorkers
      ? (() => { const q = supabase.from('worker_certifications').select('expiry_date').eq('organization_id', orgId).eq('status', 'approved').gte('expiry_date', today).lte('expiry_date', in180d); return scopedWorkerIds ? q.in('worker_id', scopedWorkerIds) : q })()
      : Promise.resolve({ data: [] }),
    // recent activity
    supabase.from('worker_certifications').select('id, created_at, status, workers(first_name, last_name), certification_types(name)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    supabase.from('equipment_inspections').select('id, inspected_at, inspector_name, equipment(name)').eq('organization_id', orgId).order('inspected_at', { ascending: false }).limit(5),
    supabase.from('toolbox_talks').select('id, created_at, title, conducted_by, status').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    // active jobs
    supabase.from('jobs').select('id, name').eq('organization_id', orgId).eq('status', 'active').order('name').limit(6),
    // toolbox talks this month
    supabase.from('toolbox_talks').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('talk_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  // ── Derived values ─────────────────────────────────────────────────────────

  const missingCount     = (pendingCount ?? 0) + (rejectedCount ?? 0)
  const notClearedCount  = new Set((notClearedCerts ?? []).map((c) => c.worker_id)).size
  const openJhaCount     = (jhaList ?? []).filter((j) => ['draft', 'active'].includes(j.status)).length
  const needingSigsCount = (jhaList ?? []).filter((j) => j.status === 'active').length
  const completedJhaCount = (jhaList ?? []).filter((j) => j.status === 'completed').length
  const criticalCount    = (expiredCount ?? 0) + (oosCount ?? 0) + notClearedCount
  const total            = activeWorkerCount ?? 0
  const cleared          = Math.max(0, total - notClearedCount)
  const score            = total === 0 ? 100 : Math.round((cleared / total) * 100)

  // Cert expiry by month for chart
  const certExpiryByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    const yr = d.getFullYear()
    const mo = d.getMonth()
    const count = (expiringRaw ?? []).filter((c) => {
      const cd = new Date(c.expiry_date)
      return cd.getFullYear() === yr && cd.getMonth() === mo
    }).length
    return { month: MONTH_LABELS[mo], count, near: i < 2 }
  })

  // Job worker counts
  const jobIds = (activeJobs ?? []).map((j) => j.id)
  const { data: jobWorkerRows } = jobIds.length
    ? await supabase.from('job_workers').select('job_id').in('job_id', jobIds)
    : { data: [] }
  const jobWorkerMap = new Map<string, number>()
  ;(jobWorkerRows ?? []).forEach((jw) => {
    jobWorkerMap.set(jw.job_id, (jobWorkerMap.get(jw.job_id) ?? 0) + 1)
  })

  // Activity feed — merge + sort
  type ActivityItem = { id: string; icon: React.ElementType; iconColor: string; label: string; sub: string; time: Date }
  const activity: ActivityItem[] = [
    ...(recentCerts ?? []).map((c) => {
      const w = c.workers as unknown as { first_name: string; last_name: string } | null
      const ct = c.certification_types as unknown as { name: string } | null
      return {
        id: `cert-${c.id}`,
        icon: Award,
        iconColor: c.status === 'pending' ? 'text-yellow-500' : c.status === 'approved' ? 'text-green-500' : 'text-red-500',
        label: w ? `${w.first_name} ${w.last_name}` : 'Worker',
        sub: `${ct?.name ?? 'Cert'} — ${c.status}`,
        time: new Date(c.created_at),
      }
    }),
    ...(recentInspections ?? []).map((i) => {
      const eq = i.equipment as unknown as { name: string } | null
      return {
        id: `insp-${i.id}`,
        icon: Wrench,
        iconColor: 'text-blue-500',
        label: eq?.name ?? 'Equipment',
        sub: `Inspected${i.inspector_name ? ` by ${i.inspector_name}` : ''}`,
        time: new Date(i.inspected_at),
      }
    }),
    ...(recentTalks ?? []).map((t) => ({
      id: `talk-${t.id}`,
      icon: ShieldCheck,
      iconColor: t.status === 'completed' ? 'text-green-500' : 'text-orange-500',
      label: t.title as string,
      sub: `Toolbox talk${t.conducted_by ? ` · ${t.conducted_by}` : ''}`,
      time: new Date(t.created_at),
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {selectedJobName
              ? `Filtered to: ${selectedJobName}`
              : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/toolbox/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            New Talk
          </Link>
          <Link
            href="/jha/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <ClipboardList className="h-4 w-4" />
            New JHA
          </Link>
        </div>
      </div>

      {/* Hero — Compliance ring + key metrics */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <ComplianceRing score={score} cleared={cleared} total={total} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Active Workers',    value: total,                    icon: HardHat,    href: '/workers',   color: 'bg-slate-100 text-slate-600' },
            { label: 'Active Jobs',       value: (activeJobs ?? []).length, icon: Briefcase,  href: '/jobs',      color: 'bg-blue-50 text-blue-600' },
            { label: 'Equipment on Site', value: 0,                        icon: Wrench,     href: '/equipment', color: 'bg-purple-50 text-purple-600' },
            { label: 'Talks This Month',  value: toolboxMonthCount ?? 0,   icon: ShieldCheck, href: '/toolbox',  color: 'bg-green-50 text-green-600' },
          ].map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold leading-none tabular-nums text-slate-900">{m.value}</p>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">{m.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Alert banner */}
      {criticalCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Action required</p>
            <p className="mt-0.5 text-sm text-red-700">
              {[
                (expiredCount ?? 0) > 0   && `${expiredCount} expired cert${expiredCount !== 1 ? 's' : ''}`,
                notClearedCount > 0        && `${notClearedCount} worker${notClearedCount !== 1 ? 's' : ''} not cleared`,
                (oosCount ?? 0) > 0        && `${oosCount} equipment out of service`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_288px]">

        {/* Left column */}
        <div className="space-y-5">

          {/* Certifications */}
          <section>
            <SectionLabel>Certifications</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Expired"          value={expiredCount ?? 0}  href="/reports/expired"        icon={XCircle}   severity="critical" />
              <StatCard label="Expiring (30d)"   value={expiringCount ?? 0} href="/reports/expiring"       icon={Clock}     severity="warning"  />
              <StatCard label="Missing / Rejected" value={missingCount}      href="/reports/missing"        icon={ShieldOff} severity="warning"  />
              <StatCard label="Pending Approval" value={pendingCount ?? 0}  href="/certifications/pending" icon={FileCheck} severity="info"     />
            </div>
          </section>

          {/* Expiry chart */}
          <CertExpiryChart data={certExpiryByMonth} />

          {/* Equipment + JHA */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <section>
              <SectionLabel>Equipment</SectionLabel>
              <div className="grid grid-cols-1 gap-3">
                <StatCard label="Out of Service"      value={oosCount ?? 0}        href="/equipment/out-of-service" icon={AlertTriangle} severity="critical" />
                <StatCard label="Failed Inspections"  value={failedInspCount ?? 0} href="/equipment/failed"         icon={AlertCircle}   severity="warning"  />
                <StatCard label="Inspections Due"     value={dueSoonCount ?? 0}    href="/equipment"                icon={CalendarClock} severity="warning"  note="overdue or never inspected" />
              </div>
            </section>
            <section>
              <SectionLabel>Job Hazard Analysis</SectionLabel>
              <div className="grid grid-cols-1 gap-3">
                <StatCard label="Open JHAs"       value={openJhaCount}      href="/jha"         icon={ClipboardList} severity="neutral" />
                <StatCard label="Need Signatures" value={needingSigsCount}  href="/jha"         icon={PenLine}       severity="warning" />
                <StatCard label="Completed"       value={completedJhaCount} href="/reports/jha" icon={FileText}      severity="neutral" />
              </div>
            </section>
          </div>

        </div>

        {/* Right column — Activity feed */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No recent activity</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="truncate text-xs text-slate-400">{item.sub}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{relativeTime(item.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* Active Jobs */}
      {(activeJobs ?? []).length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Active Jobs</SectionLabel>
            <Link href="/jobs" className="text-xs font-medium text-orange-600 hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(activeJobs ?? []).map((job) => {
              const workerCount = jobWorkerMap.get(job.id) ?? 0
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <Briefcase className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{job.name}</p>
                    <p className="text-xs text-slate-500">
                      <HardHat className="mr-1 inline h-3 w-3" />
                      {workerCount} worker{workerCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="mt-5">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Add Worker',    href: '/workers/new',  icon: Users },
            { label: 'Add Equipment', href: '/equipment/new', icon: Wrench },
            { label: 'New Orientation', href: '/orientations/new', icon: BookOpen },
            { label: 'Reports',       href: '/reports',      icon: FileText },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <a.icon className="h-4 w-4 shrink-0 text-orange-500" />
              {a.label}
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
