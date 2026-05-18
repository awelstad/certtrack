import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrgPlanForm } from '@/components/OrgPlanForm'
import { EnterOrgButton } from './EnterOrgButton'
import { Plus, Building2, Users, HardHat, ExternalLink, CreditCard, Gift } from 'lucide-react'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, slug, plan, created_at')
    .order('created_at', { ascending: false })

  const orgIds = (orgs ?? []).map((o) => o.id)

  const [{ data: profileCounts }, { data: workerCounts }] = await Promise.all([
    orgIds.length > 0
      ? admin.from('profiles').select('organization_id').in('organization_id', orgIds)
      : Promise.resolve({ data: [] as { organization_id: string }[] }),
    orgIds.length > 0
      ? admin.from('workers').select('organization_id').in('organization_id', orgIds).eq('status', 'active')
      : Promise.resolve({ data: [] as { organization_id: string }[] }),
  ])

  const profileMap = new Map<string, number>()
  for (const p of profileCounts ?? []) {
    profileMap.set(p.organization_id, (profileMap.get(p.organization_id) ?? 0) + 1)
  }
  const workerMap = new Map<string, number>()
  for (const w of workerCounts ?? []) {
    workerMap.set(w.organization_id, (workerMap.get(w.organization_id) ?? 0) + 1)
  }

  // Plan breakdown
  const planCounts = (orgs ?? []).reduce((acc, org) => {
    const plan = org.plan ?? 'free'
    acc[plan] = (acc[plan] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const proCount  = (planCounts['pro'] ?? 0) + (planCounts['enterprise'] ?? 0)
  const freeCount = (planCounts['free'] ?? 0) + (planCounts['trial'] ?? 0)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Admin</h1>
          <p className="mt-1 text-sm text-slate-500">{orgs?.length ?? 0} organizations</p>
        </div>
        <Link
          href="/super-admin/orgs/new"
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: 'Total Orgs',    value: orgs?.length ?? 0,                                     icon: Building2 },
          { label: 'Total Users',   value: [...profileMap.values()].reduce((a, b) => a + b, 0),   icon: Users },
          { label: 'Total Workers', value: [...workerMap.values()].reduce((a, b) => a + b, 0),    icon: HardHat },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <s.icon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SaaS health widget */}
      <div className="mb-6 flex items-center gap-6 rounded-xl border border-green-200 bg-green-50 px-6 py-4 shadow-sm">
        <CreditCard className="h-6 w-6 shrink-0 text-green-600" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Paying Customers</p>
          <p className="text-3xl font-bold text-green-800">{proCount}</p>
        </div>
        <div className="h-10 w-px bg-green-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Free / Trial</p>
          <p className="text-3xl font-bold text-slate-600">{freeCount}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-400">Total organizations</p>
          <p className="text-2xl font-bold text-slate-700">{orgs?.length ?? 0}</p>
        </div>
      </div>

      {/* Org table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Organization', 'Slug', 'Plan', 'Users', 'Workers', 'Created', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(orgs ?? []).map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{org.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{org.slug}</td>
                <td className="px-4 py-3">
                  <OrgPlanForm orgId={org.id} currentPlan={org.plan ?? 'free'} />
                </td>
                <td className="px-4 py-3 text-slate-700">{profileMap.get(org.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-700">{workerMap.get(org.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EnterOrgButton orgId={org.id} />
                    <Link
                      href={`/super-admin/orgs/${org.id}`}
                      className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {(orgs ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No organizations yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
