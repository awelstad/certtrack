import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/Sidebar'
import { MobileNav } from '@/components/nav/MobileNav'
import { TopBar } from '@/components/nav/TopBar'
import type { Role } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const safeProfile = {
    full_name: profile.full_name as string,
    role: profile.role as Role,
    avatar_url: profile.avatar_url as string | null,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar profile={safeProfile} />
      <TopBar profile={safeProfile} />
      <div className="lg:pl-64">
        <main className="min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
