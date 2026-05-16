import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/nav/Sidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { TopBar } from '@/components/nav/TopBar'
import { PlanBanner } from '@/components/PlanBanner'
import type { Role } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminForProfile = createAdminClient()
  const { data: profile } = await adminForProfile
    .from('profiles')
    .select('full_name, role, avatar_url, organization_id, is_platform_admin, home_org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isPlatformAdmin = (profile.is_platform_admin as boolean) ?? false
  const activeOrgId = profile.organization_id as string

  const dataClient = isPlatformAdmin ? createAdminClient() : supabase

  const [{ data: jobs }, { data: org }, cookieStore, allOrgsResult, usageCounts] = await Promise.all([
    dataClient
      .from('jobs')
      .select('id, name')
      .eq('organization_id', activeOrgId)
      .eq('status', 'active')
      .order('name'),
    dataClient
      .from('organizations')
      .select('name, logo_url, plan')
      .eq('id', activeOrgId)
      .single(),
    cookies(),
    isPlatformAdmin
      ? createAdminClient().from('organizations').select('id, name').order('name')
      : Promise.resolve({ data: null }),
    // Fetch usage counts (used only for free plan banner)
    Promise.all([
      dataClient.from('workers').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId).eq('status', 'active'),
      dataClient.from('equipment').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
      dataClient.from('jhas').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
      dataClient.from('toolbox_talks').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId),
    ]),
  ])

  const [workerRes, equipRes, jhaRes, talkRes] = usageCounts

  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  const safeProfile = {
    full_name:         profile.full_name as string,
    role:              profile.role as Role,
    avatar_url:        profile.avatar_url as string | null,
    is_platform_admin: isPlatformAdmin,
  }

  const jobList = (jobs ?? []) as { id: string; name: string }[]
  const orgBranding = { name: org?.name ?? '', logo_url: org?.logo_url ?? null }
  const allOrgs = (allOrgsResult.data ?? []) as { id: string; name: string }[]
  const orgPlan = (org?.plan as string) ?? 'free'

  const usage = {
    workers:      workerRes.count ?? 0,
    equipment:    equipRes.count ?? 0,
    jhas:         jhaRes.count ?? 0,
    toolboxTalks: talkRes.count ?? 0,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        profile={safeProfile}
        jobs={jobList}
        selectedJobId={selectedJobId}
        org={orgBranding}
        allOrgs={isPlatformAdmin ? allOrgs : undefined}
        activeOrgId={isPlatformAdmin ? (profile.home_org_id as string | null) : undefined}
      />
      <TopBar profile={safeProfile} jobs={jobList} selectedJobId={selectedJobId} org={orgBranding} />
      <div className="lg:pl-64">
        <PlanBanner plan={orgPlan} usage={usage} />
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
