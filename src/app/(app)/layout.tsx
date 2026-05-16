import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/nav/Sidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { TopBar } from '@/components/nav/TopBar'
import { TrialBanner } from '@/components/TrialBanner'
import type { Role } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use admin client for profile fetch — bypasses RLS so this always works
  // regardless of which org the platform admin is currently viewing
  const adminForProfile = createAdminClient()
  const { data: profile } = await adminForProfile
    .from('profiles')
    .select('full_name, role, avatar_url, organization_id, is_platform_admin, home_org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isPlatformAdmin = (profile.is_platform_admin as boolean) ?? false
  // organization_id IS the active org — switchToOrg swaps it directly
  const activeOrgId = profile.organization_id as string

  // Platform admins use the admin client so they can see any org's data
  const dataClient = isPlatformAdmin ? createAdminClient() : supabase

  const [{ data: jobs }, { data: org }, cookieStore, allOrgsResult] = await Promise.all([
    dataClient
      .from('jobs')
      .select('id, name')
      .eq('organization_id', activeOrgId)
      .eq('status', 'active')
      .order('name'),
    dataClient
      .from('organizations')
      .select('name, logo_url, trial_ends_at, trial_status')
      .eq('id', activeOrgId)
      .single(),
    cookies(),
    isPlatformAdmin
      ? createAdminClient().from('organizations').select('id, name').order('name')
      : Promise.resolve({ data: null }),
  ])

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
        {org?.trial_status === 'trialing' && org?.trial_ends_at && (
          <TrialBanner trialEndsAt={org.trial_ends_at as string} trialStatus={org.trial_status as string} />
        )}
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
