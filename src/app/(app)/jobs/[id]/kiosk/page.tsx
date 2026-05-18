import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { KioskAccountManager } from './KioskAccountManager'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export default async function JobKioskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!job) notFound()

  // Load existing kiosk accounts for this job
  const admin = createAdminClient()
  const { data: kioskProfiles } = await admin
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('organization_id', profile.organization_id)
    .eq('role', 'kiosk')
    .eq('kiosk_job_id', id)

  const accounts = await Promise.all(
    (kioskProfiles ?? []).map(async (p) => {
      const { data: authUser } = await admin.auth.admin.getUserById(p.id)
      return {
        id: p.id,
        email: authUser.user?.email ?? p.full_name,
        created_at: p.created_at,
      }
    })
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {job.name}
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
          <ScanLine className="h-5 w-5 text-orange-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Site Kiosk</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kiosk account management */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <KioskAccountManager jobId={id} initialAccounts={accounts} />
        </div>

        {/* How to use */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">Setup Instructions</h2>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">1</span>
              Create a kiosk account with an email and password for this job site.
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">2</span>
              On the tablet, open the browser and go to <span className="font-mono font-semibold text-slate-800">clearwork.io/kiosk/login</span>.
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">3</span>
              Log in with the kiosk email and password. The scanner will open automatically.
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">4</span>
              Place the tablet at the site entrance. Workers scan their helmet QR badge to check in and out.
            </li>
          </ol>

          <div className="mt-4">
            <Link
              href={`/kiosk/${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <ScanLine className="h-4 w-4 text-orange-400" />
              Open Kiosk Scanner
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
