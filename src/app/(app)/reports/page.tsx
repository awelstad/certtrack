import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  AlertTriangle, Clock, FileText, ShieldCheck,
  ClipboardList, Wrench, XCircle, ChevronRight, Users,
} from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id
  const today = new Date().toISOString().split('T')[0]
  const in30d = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]

  const [
    { count: expiredCount },
    { count: expiringCount },
    { count: pendingCount },
    { count: jhaCount },
    { count: oosCount },
    { count: failCount },
  ] = await Promise.all([
    supabase.from('worker_certifications').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'approved').lt('expiry_date', today),
    supabase.from('worker_certifications').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'approved').gte('expiry_date', today).lte('expiry_date', in30d),
    supabase.from('worker_certifications').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).in('status', ['pending', 'rejected']),
    supabase.from('jhas').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'completed'),
    supabase.from('equipment').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'out_of_service'),
    supabase.from('equipment_inspections').select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId).in('status', ['fail', 'out_of_service']),
  ])

  const reports = [
    {
      href: '/reports/expired',
      icon: AlertTriangle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      title: 'Expired Certifications',
      description: 'All workers with expired approved certs.',
      count: expiredCount ?? 0,
      countColor: 'text-red-600',
      alert: (expiredCount ?? 0) > 0,
    },
    {
      href: '/reports/expiring',
      icon: Clock,
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      title: 'Expiring Soon',
      description: 'Certifications expiring within 30 days.',
      count: expiringCount ?? 0,
      countColor: (expiringCount ?? 0) > 0 ? 'text-yellow-600' : 'text-slate-400',
    },
    {
      href: '/reports/missing',
      icon: XCircle,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      title: 'Missing / Pending Certs',
      description: 'Workers with pending or rejected certifications.',
      count: pendingCount ?? 0,
      countColor: (pendingCount ?? 0) > 0 ? 'text-orange-600' : 'text-slate-400',
    },
    {
      href: '/reports/job-compliance',
      icon: ShieldCheck,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      title: 'Job Compliance',
      description: 'Clearance rates per job site.',
      count: null,
    },
    {
      href: '/reports/jha',
      icon: ClipboardList,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      title: 'JHA Reports',
      description: 'Signed JHAs and attendance records.',
      count: jhaCount ?? 0,
      countColor: 'text-purple-600',
      label: 'completed',
    },
    {
      href: '/reports/equipment',
      icon: Wrench,
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-600',
      title: 'Equipment Reports',
      description: 'Inspections, failures, and out-of-service units.',
      count: oosCount ?? 0,
      countColor: (oosCount ?? 0) > 0 ? 'text-red-600' : 'text-slate-400',
      label: 'OOS',
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Reports" description="Audit-ready exports for compliance, JHAs, and equipment." />

      {/* Alert bar */}
      {(expiredCount ?? 0) > 0 && (
        <Link
          href="/reports/expired"
          className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="flex-1 text-sm font-semibold text-red-800">
            {expiredCount} expired certification{expiredCount !== 1 ? 's' : ''} require immediate attention
          </p>
          <ChevronRight className="h-4 w-4 text-red-500" />
        </Link>
      )}

      {/* Report grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${r.iconBg}`}>
              <r.icon className={`h-5 w-5 ${r.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{r.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>
              {r.count !== null && (
                <p className={`mt-2 text-xl font-bold ${r.countColor ?? 'text-slate-700'}`}>
                  {r.count}
                  {r.label && <span className="ml-1 text-sm font-medium text-slate-400">{r.label}</span>}
                </p>
              )}
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
