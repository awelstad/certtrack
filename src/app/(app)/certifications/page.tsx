import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Award, Plus, AlertTriangle, Clock } from 'lucide-react'

export default async function CertificationTypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()
  const orgId = profile!.organization_id

  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]

  const [typesRes, pendingRes, expiringRes] = await Promise.all([
    supabase.from('certification_types').select('*').eq('organization_id', orgId).order('name'),
    supabase.from('worker_certifications').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
    supabase.from('worker_certifications').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'approved').gte('expiry_date', today).lte('expiry_date', in30),
  ])

  const types = typesRes.data ?? []
  const pendingCount = pendingRes.count ?? 0
  const expiringCount = expiringRes.count ?? 0

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Certifications"
        description="Define certification types and monitor compliance across your workforce."
        action={
          <button className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            New Type
          </button>
        }
      />

      {/* Quick links */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/certifications/pending"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Pending Approvals</p>
            <p className="text-sm text-slate-500">Review uploaded certifications</p>
          </div>
          {pendingCount > 0 && (
            <Badge label={String(pendingCount)} variant="yellow" />
          )}
        </Link>

        <Link
          href="/certifications/expiring"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Expiration Dashboard</p>
            <p className="text-sm text-slate-500">Expired, expiring, and at-risk certs</p>
          </div>
          {expiringCount > 0 && (
            <Badge label={String(expiringCount)} variant="red" />
          )}
        </Link>
      </div>

      {/* Cert types list */}
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Certification Types</h2>
      {!types.length ? (
        <EmptyState
          icon={Award}
          title="No certification types"
          description="Create certification types like OSHA 10, First Aid, or Forklift — then require them per job."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {types.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <Award className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">
                    {t.validity_days ? `Valid for ${t.validity_days} days` : 'No expiry'}
                    {t.requires_document ? ' · Document required' : ''}
                  </p>
                  {t.description && (
                    <p className="text-xs text-slate-400">{t.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
