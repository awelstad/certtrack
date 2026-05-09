import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { getExpiringCerts } from '@/lib/certifications'
import { daysUntilExpiry } from '@/lib/types'
import { AlertTriangle, ArrowLeft, ShieldX, Users } from 'lucide-react'

export default async function ExpiringCertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()
  const orgId = profile!.organization_id
  const today = new Date().toISOString().split('T')[0]

  // Fetch in parallel: expired, 7d, 30d, 60d, pending, not-cleared workers
  const [expiredRes, in7Res, in30Res, in60Res, pendingRes] = await Promise.all([
    // Expired
    supabase
      .from('worker_certifications')
      .select('id, expiry_date, status, workers(id, first_name, last_name), certification_types(name)')
      .eq('organization_id', orgId)
      .eq('status', 'approved')
      .lt('expiry_date', today)
      .order('expiry_date', { ascending: true })
      .limit(50),

    // Expiring ≤ 7d
    getExpiringCerts(supabase, orgId, 7),
    // Expiring ≤ 30d
    getExpiringCerts(supabase, orgId, 30),
    // Expiring ≤ 60d
    getExpiringCerts(supabase, orgId, 60),

    // Pending approvals
    supabase
      .from('worker_certifications')
      .select('id, created_at, workers(id, first_name, last_name), certification_types(name)')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  const expired = expiredRes.data ?? []
  const in7 = in7Res
  const in30 = in30Res.filter(c => !in7.find(e => e.id === c.id))
  const in60 = in60Res.filter(c => !in30Res.find(e => e.id === c.id))
  const pending = pendingRes.data ?? []

  const sections = [
    { label: 'Expired', certs: expired, variant: 'red' as const, icon: ShieldX, urgency: 'bg-red-50 border-red-200' },
    { label: 'Expiring in 7 days', certs: in7, variant: 'red' as const, icon: AlertTriangle, urgency: 'bg-red-50 border-red-200' },
    { label: 'Expiring in 8–30 days', certs: in30, variant: 'yellow' as const, icon: AlertTriangle, urgency: 'bg-yellow-50 border-yellow-200' },
    { label: 'Expiring in 31–60 days', certs: in60, variant: 'yellow' as const, icon: AlertTriangle, urgency: 'bg-yellow-50 border-yellow-200' },
    { label: 'Pending Approval', certs: pending, variant: 'slate' as const, icon: Users, urgency: 'bg-slate-50 border-slate-200' },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/certifications" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Certifications
        </Link>
      </div>

      <PageHeader
        title="Expiration Dashboard"
        description="Track expired, expiring, and pending certifications across your workforce."
      />

      {/* Summary stat row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {sections.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-4 ${s.urgency}`}
          >
            <p className={`text-2xl font-bold ${s.variant === 'red' ? 'text-red-700' : s.variant === 'yellow' ? 'text-yellow-700' : 'text-slate-700'}`}>
              {s.certs.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Detail sections */}
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.label}>
            <div className="mb-3 flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.variant === 'red' ? 'text-red-600' : s.variant === 'yellow' ? 'text-yellow-600' : 'text-slate-500'}`} />
              <h2 className="text-sm font-semibold text-slate-700">{s.label}</h2>
              <Badge label={String(s.certs.length)} variant={s.variant} />
            </div>

            {!s.certs.length ? (
              <p className="text-sm text-slate-400">None — you&apos;re clear here.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {s.certs.map((c: any) => {
                    const w = c.workers as { id: string; first_name: string; last_name: string } | null
                    const ct = c.certification_types as { name: string } | null
                    const daysLeft = c.expiry_date ? daysUntilExpiry(c.expiry_date) : null
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/workers/${w?.id}/certifications/${c.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900">
                              {w ? `${w.first_name} ${w.last_name}` : '—'}
                            </p>
                            <p className="text-sm text-slate-500">{ct?.name ?? '—'}</p>
                          </div>
                          {c.expiry_date && (
                            <span className={`shrink-0 text-xs font-semibold ${daysLeft !== null && daysLeft < 0 ? 'text-red-600' : daysLeft !== null && daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                              {daysLeft !== null && daysLeft < 0
                                ? `${Math.abs(daysLeft)}d overdue`
                                : `${daysLeft}d left`}
                            </span>
                          )}
                          {c.created_at && !c.expiry_date && (
                            <span className="shrink-0 text-xs text-slate-400">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
