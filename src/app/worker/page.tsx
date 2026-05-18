import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateWorkerOverallStatus } from '@/lib/certifications'
import { ShieldCheck, ShieldAlert, ShieldX, Clock, Award, ClipboardList, LogOut } from 'lucide-react'
import type { CertStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Compliance = 'green' | 'yellow' | 'red' | 'gray'

const complianceDisplay: Record<Compliance, { label: string; icon: React.ReactNode; cls: string }> = {
  green:  { label: 'All Certs Clear',     icon: <ShieldCheck className="h-5 w-5 text-green-600" />,  cls: 'bg-green-50 border-green-200 text-green-700' },
  yellow: { label: 'Some Expiring Soon',  icon: <ShieldAlert className="h-5 w-5 text-yellow-600" />, cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  red:    { label: 'Action Required',     icon: <ShieldX className="h-5 w-5 text-red-600" />,        cls: 'bg-red-50 border-red-200 text-red-700' },
  gray:   { label: 'No Certs on File',    icon: <Clock className="h-5 w-5 text-slate-400" />,        cls: 'bg-slate-50 border-slate-200 text-slate-600' },
}

export default async function WorkerPortalHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/worker/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, worker_number, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'worker' && profile.role !== 'platform_admin')) {
    redirect('/jobs')
  }

  const admin = createAdminClient()

  // Look up the workers record linked to this auth account
  const { data: worker } = await admin
    .from('workers')
    .select('id, first_name, last_name, trade, employer, avatar_url, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Fetch certs and orientation history in parallel
  const [{ data: certs }, { data: orientationHistory }] = await Promise.all([
    worker
      ? admin
          .from('worker_certifications')
          .select('id, status, expiry_date, certification_types(name)')
          .eq('worker_id', worker.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    admin
      .from('orientation_completions')
      .select('pass_id, score, completed_at, job_id, jobs(name)')
      .eq('worker_profile_id', user.id)
      .eq('passed', true)
      .order('completed_at', { ascending: false })
      .limit(10),
  ])

  const compliance = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )
  const { label: compLabel, icon: compIcon, cls: compCls } = complianceDisplay[compliance]

  const approvedCount = (certs ?? []).filter((c) => c.status === 'approved').length
  const pendingCount  = (certs ?? []).filter((c) => c.status === 'pending').length

  const displayName = worker
    ? `${worker.first_name} ${worker.last_name}`
    : profile.full_name

  type PassRow = { pass_id: string; score: number; completed_at: string; job_id: string; jobs: { name: string } | null }

  async function handleSignOut() {
    'use server'
    const { createClient: mkClient } = await import('@/lib/supabase/server')
    const sc = await mkClient()
    await sc.auth.signOut()
    redirect('/worker/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 px-5 py-6 pb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Worker Portal</p>
            <h1 className="text-xl font-bold text-white">{displayName}</h1>
            {worker?.trade && <p className="text-slate-400 text-sm mt-0.5">{worker.trade}</p>}
            {worker?.employer && <p className="text-slate-500 text-xs mt-0.5">{worker.employer}</p>}
            {profile.worker_number && (
              <p className="text-orange-400 font-mono text-xs mt-1">{profile.worker_number}</p>
            )}
          </div>
          <form action={handleSignOut}>
            <button type="submit" className="text-slate-500 hover:text-white p-1">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-8 max-w-lg mx-auto">
        {/* Compliance card */}
        <div className={`rounded-xl border p-4 flex items-center gap-3 bg-white shadow-sm ${compCls.includes('border') ? '' : ''}`}>
          {compIcon}
          <div>
            <p className="font-semibold text-sm">{compLabel}</p>
            <p className="text-xs text-slate-500">
              {approvedCount} cert{approvedCount !== 1 ? 's' : ''} approved
              {pendingCount > 0 && ` · ${pendingCount} pending review`}
            </p>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/worker/certs"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">My Certs</p>
              <p className="text-xs text-slate-500">View &amp; upload</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
              <ClipboardList className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Orientations</p>
              <p className="text-xs text-slate-500">{(orientationHistory ?? []).length} passed</p>
            </div>
          </div>
        </div>

        {/* Orientation history */}
        {(orientationHistory ?? []).length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-900 text-sm">Orientation History</h2>
            <ul className="divide-y divide-slate-100">
              {(orientationHistory as unknown as PassRow[]).map((o) => (
                <li key={o.pass_id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{o.jobs?.name ?? 'Job Site'}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(o.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      <span className="font-mono">{o.pass_id}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600">{o.score}%</span>
                    <a
                      href={`/verify/${o.pass_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-500 hover:underline"
                    >
                      View pass
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
