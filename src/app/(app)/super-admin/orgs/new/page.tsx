import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { CreateOrgForm } from '@/components/superadmin/CreateOrgForm'

export default async function NewOrgPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/dashboard')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-xl">
      <div className="mb-6">
        <Link href="/super-admin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Organizations
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">New Organization</h1>
      <p className="mb-6 text-sm text-slate-500">
        Creates the company account and their first admin login in one step.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CreateOrgForm />
      </div>
    </div>
  )
}
