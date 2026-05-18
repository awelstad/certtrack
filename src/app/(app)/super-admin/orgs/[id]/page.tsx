import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Users, HardHat, Briefcase, Wrench, ShieldCheck } from 'lucide-react'
import { EditOrgNameForm } from './EditOrgNameForm'
import { InviteUserForm } from './InviteUserForm'
import { DeleteOrgButton } from './DeleteOrgButton'
import { UserManagementTable } from './UserManagementTable'
import { SetHomeOrgButton } from './SetHomeOrgButton'

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: myProfile } = await admin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!myProfile?.is_platform_admin) redirect('/dashboard')

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, created_at, logo_url')
    .eq('id', id)
    .single()

  if (!org) notFound()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: true })

  const listResult = await admin.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = listResult.data?.users ?? []
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? '']))

  const [
    { count: workerCount },
    { count: jobCount },
    { count: equipmentCount },
    { count: toolboxCount },
  ] = await Promise.all([
    admin.from('workers').select('id', { count: 'exact', head: true }).eq('organization_id', id).eq('status', 'active'),
    admin.from('jobs').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('equipment').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('toolbox_talks').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ])

  const stats = [
    { label: 'Active Workers',  value: workerCount   ?? 0, icon: HardHat },
    { label: 'Jobs',            value: jobCount       ?? 0, icon: Briefcase },
    { label: 'Equipment',       value: equipmentCount ?? 0, icon: Wrench },
    { label: 'Toolbox Talks',   value: toolboxCount   ?? 0, icon: ShieldCheck },
  ]

  const userRows = (profiles ?? []).map((p) => ({
    id:        p.id,
    full_name: p.full_name,
    email:     emailMap.get(p.id) ?? '—',
    role:      p.role,
    joined:    new Date(p.created_at).toLocaleDateString(),
  }))

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl space-y-8">
      {/* Back link */}
      <Link
        href="/super-admin"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Organizations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{org.slug}</p>
          <p className="mt-1 text-sm text-slate-500">
            Created {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <SetHomeOrgButton orgId={org.id} orgName={org.name} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
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

      {/* Edit name */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Edit Organization Name</h2>
        <EditOrgNameForm orgId={org.id} currentName={org.name} />
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Users className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Users ({profiles?.length ?? 0})</h2>
          <p className="ml-auto text-xs text-slate-400">
            <span title="Pencil = edit name/role">✏️</span> edit &nbsp;
            <span title="Key = send password reset">🔑</span> reset password &nbsp;
            <span title="Trash = remove user">🗑️</span> remove
          </p>
        </div>
        <UserManagementTable users={userRows} orgId={org.id} />
      </div>

      {/* Invite user */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Add User to This Organization</h2>
        <InviteUserForm orgId={org.id} />
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-red-700">Danger Zone</h2>
        <p className="mb-4 text-xs text-slate-500">
          Deletes the organization, all users, workers, jobs, certifications, and all related data.
        </p>
        <DeleteOrgButton orgId={org.id} orgName={org.name} />
      </div>
    </div>
  )
}
