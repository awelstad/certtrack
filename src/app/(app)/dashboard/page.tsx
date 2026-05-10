import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle, Clock, XCircle, ShieldOff, Users,
  ClipboardList, FileCheck, PenLine, Wrench, AlertCircle,
  CalendarClock, Plus, FileText, ClipboardCheck, ChevronRight,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

type Severity = 'critical' | 'warning' | 'info' | 'good'

function cardStyle(severity: Severity, active: boolean) {
  if (!active) return {
    card:  'border-slate-200 bg-white hover:bg-slate-50',
    icon:  'bg-slate-100',
    iconColor: 'text-slate-400',
    val:   'text-slate-800',
    lbl:   'text-slate-500',
  }
  return {
    critical: {
      card:      'border-red-200 bg-red-50 hover:bg-red-100',
      icon:      'bg-red-100',
      iconColor: 'text-red-600',
      val:       'text-red-800',
      lbl:       'text-red-700',
    },
    warning: {
      card:      'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
      icon:      'bg-yellow-100',
      iconColor: 'text-yellow-600',
      val:       'text-yellow-800',
      lbl:       'text-yellow-700',
    },
    info: {
      card:      'border-blue-200 bg-blue-50 hover:bg-blue-100',
      icon:      'bg-blue-100',
      iconColor: 'text-blue-600',
      val:       'text-blue-800',
      lbl:       'text-blue-700',
    },
    good: {
      card:      'border-green-200 bg-green-50 hover:bg-green-100',
      icon:      'bg-green-100',
      iconColor: 'text-green-600',
      val:       'text-green-800',
      lbl:       'text-green-700',
    },
  }[severity]
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, href, icon: Icon, severity, alertOnAny = true, note,
}: {
  label: string
  value: number
  href: string
  icon: React.ElementType
  severity: Severity
  alertOnAny?: boolean
  note?: string
}) {
  const s = cardStyle(severity, alertOnAny && value > 0)
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${s.card}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.icon}`}>
        <Icon className={`h-5 w-5 ${s.iconColor}`} />
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none tabular-nums ${s.val}`}>{value}</p>
        <p className={`mt-1.5 text-xs font-semibold leading-tight ${s.lbl}`}>{label}</p>
        {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
      </div>
      <ChevronRight className="mt-auto h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors self-end" />
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, linkHref, linkLabel }: { title: string; linkHref?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h2>
      {linkHref && linkLabel && (
        <Link href={linkHref} className="text-xs font-medium text-orange-600 hover:text-orange-800 hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
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
  const in30d = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
  const in7d  = new Date(Date.now() +  7 * 864e5).toISOString().split('T')[0]

  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  // When a job is selected, resolve the worker IDs for that job first
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

  // Helper to scope a cert query to job workers when a filter is active
  function certQuery() {
    const q = supabase.from('worker_certifications').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
    return scopedWorkerIds ? q.in('worker_id', scopedWorkerIds) : q
  }
  function certQueryFull() {
    const q = supabase.from('worker_certifications').select('worker_id').eq('organization_id', orgId)
    return scopedWorkerIds ? q.in('worker_id', scopedWorkerIds) : q
  }

  const [
    { count: expiredCertCount },
    { count: expiringCertCount },
    { count: pendingCertCount },
    { count: rejectedCertCount },
    { data: notClearedCerts },
    { count: activeWorkerCount },
    { data: jhaList },
    { count: oosCount },
    { count: failedInspCount },
    { count: dueSoonCount },
  ] = await Promise.all([
    hasWorkers
      ? certQuery().eq('status', 'approved').lt('expiry_date', today)
      : Promise.resolve({ count: 0 }),
    hasWorkers
      ? certQuery().eq('status', 'approved').gte('expiry_date', today).lte('expiry_date', in30d)
      : Promise.resolve({ count: 0 }),
    hasWorkers
      ? certQuery().eq('status', 'pending')
      : Promise.resolve({ count: 0 }),
    hasWorkers
      ? certQuery().eq('status', 'rejected')
      : Promise.resolve({ count: 0 }),
    hasWorkers
      ? certQueryFull().or(`status.eq.rejected,and(status.eq.approved,expiry_date.lt.${today})`)
      : Promise.resolve({ data: [] }),
    scopedWorkerIds
      ? (scopedWorkerIds.length
          ? supabase.from('workers').select('id', { count: 'exact', head: true })
              .eq('organization_id', orgId).eq('status', 'active').in('id', scopedWorkerIds)
          : Promise.resolve({ count: 0 }))
      : supabase.from('workers').select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId).eq('status', 'active'),
    selectedJobId
      ? supabase.from('jhas').select('status').eq('organization_id', orgId).eq('job_id', selectedJobId)
      : supabase.from('jhas').select('status').eq('organization_id', orgId),
    supabase.from('equipment').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'out_of_service'),
    supabase.from('equipment_inspections').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).in('status', ['fail', 'out_of_service']),
    supabase.from('equipment').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'active')
      .or(`next_inspection_due.lte.${in7d},last_inspection_at.is.null`),
  ])

  const missingCertCount  = (pendingCertCount ?? 0) + (rejectedCertCount ?? 0)
  const notClearedCount   = new Set((notClearedCerts ?? []).map((c) => c.worker_id)).size
  const openJhaCount      = (jhaList ?? []).filter((j) => ['draft', 'active'].includes(j.status)).length
  const needingSigsCount  = (jhaList ?? []).filter((j) => j.status === 'active').length
  const completedJhaCount = (jhaList ?? []).filter((j) => j.status === 'completed').length

  const criticalCount = (expiredCertCount ?? 0) + (oosCount ?? 0) + notClearedCount

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">

      {/* ── Greeting ──────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectedJobName
            ? `Showing data for: ${selectedJobName}`
            : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Critical alert banner ──────────────────────────── */}
      {criticalCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Action required</p>
            <p className="mt-0.5 text-sm text-red-700">
              {[
                (expiredCertCount ?? 0) > 0 && `${expiredCertCount} expired cert${expiredCertCount !== 1 ? 's' : ''}`,
                notClearedCount > 0 && `${notClearedCount} worker${notClearedCount !== 1 ? 's' : ''} not cleared`,
                (oosCount ?? 0) > 0 && `${oosCount} equipment out of service`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Certifications ────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader title="Certifications" linkHref="/reports" linkLabel="All reports" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Expired Certs"      value={expiredCertCount ?? 0}  href="/reports/expired"         icon={XCircle}   severity="critical" />
          <StatCard label="Expiring Soon"       value={expiringCertCount ?? 0} href="/reports/expiring"        icon={Clock}     severity="warning"  note="within 30 days" />
          <StatCard label="Missing / Rejected"  value={missingCertCount}        href="/reports/missing"         icon={ShieldOff} severity="warning" />
          <StatCard label="Pending Approval"    value={pendingCertCount ?? 0}  href="/certifications"          icon={FileCheck} severity="info" />
          <StatCard label="Workers Not Cleared" value={notClearedCount}         href="/reports/job-compliance"  icon={Users}     severity="critical" note={`of ${activeWorkerCount ?? 0} active`} />
        </div>
      </section>

      {/* ── JHA ───────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader title="Job Hazard Analysis" linkHref="/jha" linkLabel="View all" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Open JHAs"        value={openJhaCount}      href="/jha"         icon={ClipboardList} severity="info" alertOnAny={false} />
          <StatCard label="Need Signatures"  value={needingSigsCount}  href="/jha"         icon={PenLine}       severity="warning" />
          <StatCard label="Completed JHAs"   value={completedJhaCount} href="/reports/jha" icon={FileText}      severity="good" alertOnAny={false} />
        </div>
      </section>

      {/* ── Equipment ─────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader title="Equipment" linkHref="/equipment" linkLabel="View all" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Failed Inspections" value={failedInspCount ?? 0} href="/equipment/failed"       icon={AlertCircle}  severity="warning" />
          <StatCard label="Out of Service"      value={oosCount ?? 0}        href="/equipment/out-of-service" icon={AlertTriangle} severity="critical" />
          <StatCard label="Inspections Due"     value={dueSoonCount ?? 0}    href="/equipment"               icon={CalendarClock} severity="warning" note="overdue or never inspected" />
        </div>
      </section>

      {/* ── Quick actions ──────────────────────────────────── */}
      <section>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Add Worker',        href: '/workers/new', icon: Users },
            { label: 'New JHA',           href: '/jha/new',     icon: ClipboardList },
            { label: 'Inspect Equipment', href: '/equipment',   icon: ClipboardCheck },
            { label: 'Reports',           href: '/reports',     icon: FileText },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
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
