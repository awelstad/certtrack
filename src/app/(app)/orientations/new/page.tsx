import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { NewOrientationForm } from './NewOrientationForm'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function NewOrientationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/orientations"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Orientations
        </Link>
      </div>

      <PageHeader
        title="New Orientation"
        description="Create an orientation document for workers to review and sign."
      />

      <div className="max-w-2xl">
        <NewOrientationForm jobs={jobs ?? []} />
      </div>
    </div>
  )
}
